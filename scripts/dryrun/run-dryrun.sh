#!/usr/bin/env bash
# Deployment dry run on a throwaway compose project ("portfolio-dryrun").
# Never touches the live containers (baraa-portfolio-*), their volumes or real data.
# Uses random test passwords written to a temp env file that is deleted at the end.
# Everything it creates (containers, volumes, image) is removed on exit.
#
#   bash scripts/dryrun/run-dryrun.sh
set -u
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")"

P=portfolio-dryrun
ENVF=$(mktemp)
WORK=$(mktemp -d)
# Windows (Git Bash): native docker/node need Windows-style paths
if command -v cygpath >/dev/null 2>&1; then ENVF=$(cygpath -m "$ENVF"); WORK=$(cygpath -m "$WORK"); fi
rnd() { node -e 'console.log(require("crypto").randomBytes(18).toString("hex"))'; }
ADMIN=$(rnd)
{
  echo "DRYRUN_PG_PASSWORD=$(rnd)"
  echo "DRYRUN_REDIS_PASSWORD=$(rnd)"
  echo "DRYRUN_ADMIN_PASSWORD=$ADMIN"
  echo "DRYRUN_SESSION_SECRET=$(rnd)"
} > "$ENVF"
DC="docker compose -p $P --env-file $ENVF -f docker-compose.dryrun.yml"

PASS=0; FAIL=0
check() { if [ "$2" = "1" ]; then echo "  PASS $1"; PASS=$((PASS+1)); else echo "  FAIL $1 ${3:-}"; FAIL=$((FAIL+1)); fi; }
yes_no() { if eval "$1"; then echo 1; else echo 0; fi; }
cleanup() {
  $DC down -v --remove-orphans >/dev/null 2>&1
  docker image rm portfolio-dryrun-app:latest >/dev/null 2>&1
  rm -rf "$ENVF" "$WORK"
  echo "[cleanup] dry-run containers, volumes and image removed"
}
trap cleanup EXIT

wait_ready() { for _ in $(seq 1 90); do [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$1/ready")" = "200" ] && return 0; sleep 1; done; return 1; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log($1)}catch(e){console.log('')}})"; }
login() { curl -s -H 'Content-Type: application/json' -d "{\"password\":\"$ADMIN\",\"client\":\"bearer\"}" "http://127.0.0.1:$1/api/auth/login" | json 'o.token||""'; }
psql_q() { $DC exec -T postgres psql -U postgres -d "${2:-portfolio_db}" -tAc "$1" | tr -d '[:space:]'; }

echo "[1] Build image and start the isolated stack"
if ! $DC build app-a > "$WORK/build.log" 2>&1; then tail -20 "$WORK/build.log"; echo "build failed"; exit 1; fi
$DC up -d > "$WORK/up.log" 2>&1
wait_ready 43001; check "app-a ready (PostgreSQL + Redis reachable)" "$([ $? = 0 ] && echo 1 || echo 0)"
wait_ready 43002; check "app-b ready" "$([ $? = 0 ] && echo 1 || echo 0)"
H=$(curl -s http://127.0.0.1:43001/ready)
check "readiness reports postgres + redis healthy" "$(echo "$H" | json '(o.dependencies.postgres.status==="healthy"&&o.dependencies.redis.status==="healthy")?1:0')"
check "app runs as non-root (uid 1000)" "$(yes_no '[ "$($DC exec -T app-a id -u | tr -d "[:space:]")" = "1000" ]')"
check "no .env file inside the image" "$(yes_no '[ "$($DC exec -T app-a sh -c "ls -a /app | grep -c ^.env || true" | tr -d "[:space:]")" = "0" ]')"
check "PostgreSQL/Redis ports not published to the host" "$(yes_no '[ -z "$(docker ps --filter name=${P}-postgres --filter name=${P}-redis --format "{{.Ports}}" | grep -- "->" || true)" ]')"

echo "[2] Redis authentication and shared sessions"
check "Redis rejects unauthenticated commands" "$(yes_no '$DC exec -T redis redis-cli ping 2>&1 | grep -q NOAUTH')"
TA=$(login 43001)
check "login on app-a" "$([ -n "$TA" ] && echo 1 || echo 0)"
check "app-a session is valid on app-b (shared Redis store)" "$(yes_no '[ "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TA" http://127.0.0.1:43002/api/auth/check)" = "200" ]')"

echo "[3] JSON persistence across restart + PostgreSQL mirror"
curl -s -o /dev/null -H 'Content-Type: application/json' -d '{"name":"Dry Run","email":"dry@example.com","message":"dryrun persist"}' http://127.0.0.1:43001/api/messages
$DC restart app-a >/dev/null 2>&1; wait_ready 43001
check "message survives an app-a restart (volume)" "$(curl -s -H "Authorization: Bearer $TA" http://127.0.0.1:43001/api/messages | json 'o.some(m=>m.message==="dryrun persist")?1:0')"
MC=$(psql_q "select count(*) from portfolio_messages where data::text like '%dryrun persist%'")
check "message mirrored to PostgreSQL (${MC:-0} row)" "$([ "${MC:-0}" -ge 1 ] && echo 1 || echo 0)"
check "graceful shutdown logged on restart" "$(yes_no '$DC logs app-a 2>&1 | grep -q "\[Shutdown\]"')"

echo "[4] PG_SYNC_MODE=load: PostgreSQL content replaces JSON on startup, after a snapshot"
curl -s -o /dev/null -X PUT -H 'Content-Type: application/json' -H "Authorization: Bearer $TA" -d '{"headline":"headline-from-app-a"}' http://127.0.0.1:43001/api/profile
B_BEFORE=$(curl -s http://127.0.0.1:43002/api/profile | json 'o.headline')
$DC restart app-b >/dev/null 2>&1; wait_ready 43002
B_AFTER=$(curl -s http://127.0.0.1:43002/api/profile | json 'o.headline')
check "app-b picked up app-a's profile from PostgreSQL (was '$B_BEFORE')" "$([ "$B_AFTER" = "headline-from-app-a" ] && echo 1 || echo 0)"
SNAPS=$($DC exec -T app-b sh -c 'ls /app/.data | grep -c "^db.pre-pg-load-" || true' | tr -d '[:space:]')
check "snapshot db.pre-pg-load-*.json written before the overwrite" "$([ "${SNAPS:-0}" -ge 1 ] && echo 1 || echo 0)"

echo "[5] PG_SYNC_MODE=mirror: db.json stays authoritative"
curl -s -o /dev/null -X PUT -H 'Content-Type: application/json' -H "Authorization: Bearer $TA" -d '{"headline":"headline-v2-from-app-a"}' http://127.0.0.1:43001/api/profile
PG_SYNC_MODE_B=mirror $DC up -d app-b >/dev/null 2>&1; wait_ready 43002
B_MIRROR=$(curl -s http://127.0.0.1:43002/api/profile | json 'o.headline')
SNAPS2=$($DC exec -T app-b sh -c 'ls /app/.data | grep -c "^db.pre-pg-load-" || true' | tr -d '[:space:]')
check "mirror mode keeps app-b's own JSON (headline '$B_MIRROR')" "$([ "$B_MIRROR" = "headline-from-app-a" ] && echo 1 || echo 0)"
check "mirror mode writes no new snapshot" "$([ "$SNAPS2" = "$SNAPS" ] && echo 1 || echo 0)"

echo "[6] Backup and restore test"
$DC exec -T postgres pg_dump -U postgres -d portfolio_db -Fc -f /tmp/dry.dump
TOC=$($DC exec -T postgres sh -c 'pg_restore --list /tmp/dry.dump | grep -c "TABLE DATA"' | tr -d '[:space:]')
check "pg_dump archive readable ($TOC TABLE DATA entries)" "$([ "${TOC:-0}" -ge 10 ] && echo 1 || echo 0)"
$DC exec -T postgres createdb -U postgres restore_test
$DC exec -T postgres pg_restore -U postgres -d restore_test --no-owner /tmp/dry.dump >/dev/null 2>&1
SRC=$(psql_q "select count(*) from portfolio_messages")
DST=$(psql_q "select count(*) from portfolio_messages" restore_test)
check "restore into a scratch database reproduces the rows ($SRC = $DST)" "$([ -n "$SRC" ] && [ "$SRC" = "$DST" ] && echo 1 || echo 0)"
CID_A=$($DC ps -q app-a)
docker cp "$CID_A:/app/.data/db.json" "$WORK/app-a.backup.json"
check "container JSON backup copied out and parses" "$(yes_no 'node -e "JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\"))" "$WORK/app-a.backup.json"')"

echo "[7] Rollback: restore db.json from the backup"
curl -s -o /dev/null -H 'Content-Type: application/json' -d '{"name":"Dry Run","email":"dry@example.com","message":"after backup"}' http://127.0.0.1:43001/api/messages
$DC stop app-a >/dev/null 2>&1
docker cp "$WORK/app-a.backup.json" "$CID_A:/app/.data/db.json"
$DC start app-a >/dev/null 2>&1; wait_ready 43001
MSGS=$(curl -s -H "Authorization: Bearer $TA" http://127.0.0.1:43001/api/messages)
check "rolled-back JSON no longer contains the post-backup message" "$(echo "$MSGS" | json '(!o.some(m=>m.message==="after backup")&&o.some(m=>m.message==="dryrun persist"))?1:0')"

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
# Browser-style login: sets SC (Set-Cookie line), CK (cookie pair), CS (CSRF token), HD (headers file)
cookie_login() {
  local port=$1; shift
  curl -s -D "$WORK/h" -o "$WORK/b" -H 'Content-Type: application/json' "$@" -d "{\"password\":\"${LOGIN_PW:-$ADMIN}\"}" "http://127.0.0.1:$port/api/auth/login"
  SC=$(grep -i '^set-cookie:' "$WORK/h" | head -1 | tr -d '\r')
  CK=$(echo "$SC" | sed -E 's/^[Ss]et-[Cc]ookie: *([^;]+).*/\1/')
  CS=$(json 'o.csrfToken||""' < "$WORK/b")
}
redis_sessions() { $DC exec -T redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "sess:admin:*" | wc -l' | tr -d '[:space:]'; }

echo "[8] Cookie session + CSRF in production mode (shared Redis)"
cookie_login 43001 -H 'X-Forwarded-Proto: https'
check "login sets an HttpOnly, SameSite=Strict, Path=/api session cookie" "$(echo "$SC" | grep -qi 'HttpOnly' && echo "$SC" | grep -qi 'SameSite=Strict' && echo "$SC" | grep -qi 'Path=/api' && echo 1 || echo 0)"
check "browser login returns a CSRF token and no session token" "$(json '(o.csrfToken && !("token" in o)) ? 1 : 0' < "$WORK/b")"
check "plain HTTP without TRUST_PROXY: no Secure flag (forged X-Forwarded-Proto ignored)" "$(echo "$SC" | grep -qi '; *Secure' && echo 0 || echo 1)"
check "startup warns while SESSION_COOKIE_SECURE is not set" "$(yes_no '$DC logs app-a 2>&1 | grep -q "SESSION_COOKIE_SECURE is not"')"
R=$(code -X PUT -H 'Content-Type: application/json' -H "Cookie: $CK" -d '{"tagline":"dryrun-csrf"}' http://127.0.0.1:43002/api/settings)
check "cookie write without CSRF token is rejected on app-b (HTTP $R)" "$([ "$R" = 403 ] && echo 1 || echo 0)"
R=$(code -X PUT -H 'Content-Type: application/json' -H "Cookie: $CK" -H "X-CSRF-Token: $CS" -d '{"tagline":"dryrun-csrf"}' http://127.0.0.1:43002/api/settings)
check "app-a cookie session + its CSRF token accepted on app-b (shared Redis, HTTP $R)" "$([ "$R" = 200 ] && echo 1 || echo 0)"
R=$(code -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: x-csrf-token' http://127.0.0.1:43001/api/settings)
check "preflight from a foreign origin is refused (HTTP $R)" "$([ "$R" = 403 ] && echo 1 || echo 0)"
R=$(code -X POST -H "Cookie: $CK" -H "X-CSRF-Token: $CS" http://127.0.0.1:43001/api/auth/logout)
R2=$(code -H "Cookie: $CK" http://127.0.0.1:43002/api/leads)
check "logout on app-a ends the session on app-b as well ($R / $R2)" "$([ "$R" = 200 ] && [ "$R2" = 401 ] && echo 1 || echo 0)"

echo "[9] HTTPS behind a reverse proxy"
DRYRUN_TRUST_PROXY_B=1 $DC up -d --no-deps app-b >/dev/null 2>&1; wait_ready 43002
cookie_login 43002 -H 'X-Forwarded-Proto: https'
HSTS=$(grep -ci '^strict-transport-security:' "$WORK/h")
check "TRUST_PROXY=1 + X-Forwarded-Proto https: Secure cookie and HSTS" "$(echo "$SC" | grep -qi '; *Secure' && [ "$HSTS" -ge 1 ] && echo 1 || echo 0)"
cookie_login 43002
check "TRUST_PROXY=1 + plain HTTP request: cookie not marked Secure" "$(echo "$SC" | grep -qi '; *Secure' && echo 0 || echo 1)"
DRYRUN_COOKIE_SECURE_B=true $DC up -d --no-deps app-b >/dev/null 2>&1; wait_ready 43002
cookie_login 43002
check "SESSION_COOKIE_SECURE=true: cookie always Secure" "$(echo "$SC" | grep -qi '; *Secure' && echo 1 || echo 0)"
check "no SESSION_COOKIE_SECURE warning once it is set" "$(yes_no '! $DC logs app-b 2>&1 | grep -q "SESSION_COOKIE_SECURE is not"')"

echo "[10] Credential rotation while sessions persist in Redis"
TOLD=$(login 43001)
cookie_login 43001; CK_OLD=$CK
S_BEFORE=$(redis_sessions)
NEWADMIN=$(rnd)
sed "s/^DRYRUN_ADMIN_PASSWORD=.*/DRYRUN_ADMIN_PASSWORD=$NEWADMIN/" "$ENVF" > "$WORK/rotated.env"
DC2="docker compose -p $P --env-file $WORK/rotated.env -f docker-compose.dryrun.yml"
$DC2 up -d --no-deps app-a app-b >/dev/null 2>&1; wait_ready 43001; wait_ready 43002
R1=$(code -H "Authorization: Bearer $TOLD" http://127.0.0.1:43001/api/auth/check)
R2=$(code -H "Cookie: $CK_OLD" http://127.0.0.1:43002/api/leads)
check "after rotating ADMIN_PASSWORD + restart, old Bearer/cookie sessions kept in Redis ($S_BEFORE keys) are rejected ($R1 / $R2)" "$([ "${S_BEFORE:-0}" -ge 2 ] && [ "$R1" = 401 ] && [ "$R2" = 401 ] && echo 1 || echo 0)"
R1=$(code -H 'Content-Type: application/json' -d "{\"password\":\"$ADMIN\"}" http://127.0.0.1:43001/api/auth/login)
LOGIN_PW=$NEWADMIN cookie_login 43002
check "old password refused ($R1), new password accepted on both instances" "$([ "$R1" = 401 ] && [ -n "$CS" ] && [ "$(code -H "Cookie: $CK" http://127.0.0.1:43001/api/leads)" = 200 ] && echo 1 || echo 0)"
CK_NEW=$CK
sed "s/^DRYRUN_SESSION_SECRET=.*/DRYRUN_SESSION_SECRET=$(rnd)/" "$WORK/rotated.env" > "$WORK/rotated2.env"
docker compose -p $P --env-file "$WORK/rotated2.env" -f docker-compose.dryrun.yml up -d --no-deps app-a app-b >/dev/null 2>&1; wait_ready 43001; wait_ready 43002
R1=$(code -H "Cookie: $CK_NEW" http://127.0.0.1:43001/api/leads)
check "rotating ADMIN_SESSION_SECRET alone also rejects existing sessions (HTTP $R1)" "$([ "$R1" = 401 ] && echo 1 || echo 0)"

echo "[11] Production configuration is validated at startup"
OUT=$(docker run --rm -e NODE_ENV=production -e ADMIN_PASSWORD=short -e CORS_ORIGIN=http://127.0.0.1 portfolio-dryrun-app:latest 2>&1); RC=$?
check "too-short ADMIN_PASSWORD refuses to start" "$([ $RC -ne 0 ] && echo "$OUT" | grep -q 'unsafe production configuration' && echo 1 || echo 0)"
OUT=$(docker run --rm -e NODE_ENV=production -e ADMIN_PASSWORD="$ADMIN" -e 'CORS_ORIGIN=*' portfolio-dryrun-app:latest 2>&1); RC=$?
check "wildcard CORS_ORIGIN refuses to start" "$([ $RC -ne 0 ] && echo "$OUT" | grep -q 'CORS_ORIGIN' && echo 1 || echo 0)"

echo "[12] Corrupt db.json protection inside the container"
$DC stop app-b >/dev/null 2>&1
CID_B=$($DC ps -aq app-b)
printf '{"broken": [' > "$WORK/corrupt.json"
docker cp "$WORK/corrupt.json" "$CID_B:/app/.data/db.json"
$DC start app-b >/dev/null 2>&1; sleep 8
check "server refuses to start on a corrupt db.json" "$(yes_no '$DC logs app-b 2>&1 | grep -q "startup aborted to protect"')"
check "corrupt file preserved (quarantine copy written)" "$(yes_no 'docker cp "$CID_B:/app/.data" "$WORK/b-data" >/dev/null 2>&1 && ls "$WORK/b-data" | grep -q "^db.corrupt-"')"

echo
echo "Dry run summary: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
