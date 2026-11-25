# Production Runbook — security rotation, port restriction, volume migration, redeploy

_Prepared 2026-11-05. **Status: PLAN ONLY — nothing below has been executed.** Every step that changes credentials, firewall, containers or data waits for the owner's explicit approval at the gates marked **⛔ GATE**._

---

## 0. Urgent finding (read first)

**The live Docker stack can be taken over from the local network today.**

- Both pushed commits on GitHub (`baraa007-droid/Baraa-portfolio`, `7bec9c6` and `f6b1098`, file `docker-compose.yml`) contain the **live** `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` **and** `REDIS_PASSWORD` (verified today by comparing the container values with the old history, without printing them). Earlier reports only listed the admin password.
- Ports 3001, 3002, 5432, 6379 listen on all interfaces (`com.docker.backend`, `::`), and the Windows firewall **allows** every inbound connection to Docker (rules `com.docker.backend.exe`, Private + Public, any port, any address). The PC is on the Private network "Salam" (192.168.0.106) and also has an Internet-Connection-Sharing interface (192.168.137.1).
- The running August code accepts **any** session it finds in Redis with a future `expiresAt` (no fingerprint). Anyone on these networks who has the GitHub history can write such a key into Redis (6379) and become admin, or read/modify messages and leads in PostgreSQL (5432).

**Containment with no data or service change** (needs your approval, because it is a firewall change): step **A1** (G0 block rule) — about 2 minutes, reversible, the site keeps working on this PC. **Check right now, no approval needed:** whether the GitHub repository is public, forked, or shared (A2).

---

## 1. Verified current state (read-only, 2026-11-05)

| Item | Fact |
|---|---|
| Live containers | `baraa-portfolio-{app-a,app-b,postgres,redis}`, created 2026-08-25, compose project `baraa-abu-musameh---ai-engineerportfolio`, healthy, restart count 0, `unless-stopped` |
| Their compose file | `C:\Users\Ahed\Downloads\baraa-abu-musameh---ai-engineerportfolio\docker-compose.yml` — **deleted** (only copy: Phase 0.1 backup → `recycle-bin\downloads-copy-deleted-20261014\`) |
| ⚠ Project name clash | Running `docker compose` in `C:\baraa-abu-musameh---ai-engineerportfolio` targets **the same project** → `up` would recreate the live containers. Never run `docker compose up/down` here outside the maintenance window |
| App images | app-a `c8bef74cab85`, app-b `1bd5c3b848ae` (August code, run as **root**, no `.env` inside) |
| App data | `/app/.data/db.json` in the writable layer (no volume). app-a 140,669 B `5a3766f4…`, app-b 103,205 B `bae31132…` — unchanged since the Phase 0.1 backup; last message 2026-08-25, last lead 2026-08-28 |
| app-a vs app-b | Content identical (profile, settings, projects, services, blog, …). They differ only in messages/leads/events, and **app-b's records are all contained in app-a** (app-a: 5 messages, 9 leads, 99 events; app-b: 1, 1, 0) |
| PostgreSQL (volume `…_postgres_data`) | Content tables identical to app-a JSON. Messages 12, leads 10 → **9 records exist only in PG** (7 messages, 2 leads, all 2026-08-25). They are in the volume and in the Phase 0.1 dump |
| Redis (volume `…_redis_data`) | requires a password; **0 keys** (no live sessions) |
| Secrets in container env | `ADMIN_PASSWORD` (24 chars, = `.env`), `POSTGRES_PASSWORD` (24), `REDIS_PASSWORD` (21). `.env` has **no** `POSTGRES_PASSWORD`/`REDIS_PASSWORD`; its `DATABASE_URL`/`REDIS_URL` point to Supabase/Upstash (cloud, used only by the host server, ignored by compose) |
| AI in Docker | `OPENROUTER_API_KEY` is not passed to the containers → **Gemini is the primary provider there**, and the stored `ai_model = gemini-3.7-flash` is tried on every AI call |
| Firewall | No G0 rule present. This shell is not elevated |
| Backups | Phase 0.1: 347/347 checksums OK, STATUS SUCCESS. pre-change tar: OK. `changes.git`: 21 commits |
| Reverse proxy / HTTPS | Nothing listens on 80/443; `APP_URL`/`CORS_ORIGIN` = localhost → today this is a **local/LAN deployment**, not a public one |
| Disk | Images 2.8 GB, volumes 1.1 GB, build cache 3.5 GB (old layers may hold old secrets) |

---

## 2. Decisions needed before execution

| # | Decision | Recommendation |
|---|---|---|
| D1 | Is the Docker stack the real production site? (its data has not changed since 2026-08-28; the host `db.json` is newer) | Treat it as production anyway; downtime is short |
| D2 | Rotate the PostgreSQL password too (it is on GitHub)? | **Yes** — `ALTER ROLE` inside the window (step B5) |
| D3 | Data for the two app volumes | **app-a's `db.json` for both** (superset; nothing is lost); `PG_SYNC_MODE=load` (PG content is identical, both instances converge) |
| D4 | The 9 PG-only records | Leave them in PG (preserved, not shown in the admin); importing them is a separate data change |
| D5 | Exposure model (drives HTTPS settings, section 6) | **A: local only** for now — `BIND_ADDRESS=127.0.0.1`, `TRUST_PROXY` and `SESSION_COOKIE_SECURE` empty |
| D6 | `ai_model` | Clear it in Settings → AI after deploy (or confirm a valid id) |
| D7 | Keep G0 after `BIND_ADDRESS=127.0.0.1` | Keep (defence in depth; costs nothing) |

---

## 3. What needs downtime and what does not

| Step | Service impact |
|---|---|
| A1 firewall block (G0) | **None** on this PC; LAN/hotspot clients lose access (intended) |
| A2 GitHub check / make private | None |
| A3 fresh backup (docker cp, pg_dump, hashes) | None (read-only; pg_dump is a consistent snapshot) |
| A4 ACL hardening of `.env` / backups folder | None (tools of other accounts lose access — intended) |
| A5 generate new secrets (files only) | None |
| A6 export rollback material, tag old images | None |
| A7 build the new image | None (CPU only; running containers keep their image id) |
| A8 create + fill the new volumes | None (not mounted yet) |
| A9 old-session probe (log in once on the old stack) | None |
| **B1–B8 stop apps → rotate PG password → recreate all four containers with new secrets, 127.0.0.1 ports and volumes** | **Downtime: site ≈ 3–5 min; PostgreSQL/Redis ≈ 30 s** |
| C1–C5 verification, cache prune, cleanup | None |
| Section 6 HTTPS (later, only if D5 ≠ A) | App recreate ≈ 30 s |

Port restriction via `BIND_ADDRESS` and any secret change both require **recreating** containers (Docker cannot change published ports or env of a running container), and recreating the app containers without volumes deletes their data. That is why they are bundled into one window after A8.

---

## 4. Phase A — preparation, no downtime

Run in **Git Bash** unless marked PowerShell. Common header for every Git Bash block:
```bash
export MSYS_NO_PATHCONV=1
P=baraa-abu-musameh---ai-engineerportfolio
REPO="C:/baraa-abu-musameh---ai-engineerportfolio"
M="C:/Users/Ahed/Project-Backups/deploy-$(date -u +%Y%m%d)"     # keep the same value for the whole run
IMG_NEW_A=$P-app-a:latest; IMG_NEW_B=$P-app-b:latest
```

### A1 ⛔ GATE — LAN containment (firewall, reversible)
PowerShell **as Administrator**:
```powershell
$G0 = 'C:\Users\Ahed\Downloads\phase01-review\g0-firewall-containment.ps1'
(Get-FileHash $G0 -Algorithm SHA256).Hash   # must be DD73EACA84FEADD24E7CBDD16E8902BFA42710F0C7305DFB13B415302F62A4C7
powershell -NoProfile -ExecutionPolicy Bypass -File $G0 -Mode Check
powershell -NoProfile -ExecutionPolicy Bypass -File $G0 -Mode Apply
powershell -NoProfile -ExecutionPolicy Bypass -File $G0 -Mode Verify
```
- **Verify:** `Verify` shows the rule and `127.0.0.1:3001/3002 GET /live = 200`. From a **phone on "Salam"**: `http://192.168.0.106:3001/live` must time out (repeat 3002; 5432/6379 with any port-check app).
- **Stop + rollback:** if loopback is not 200 → `-Mode Rollback` (removes only the G0 rule).

### A2 — GitHub (owner, browser, no approval needed)
Open `github.com/baraa007-droid/Baraa-portfolio`: public? forks? collaborators? Actions logs? secret-scanning alerts? → set **Private** now. History rewrite is optional once A5–B passwords are rotated (the exposed values become useless).

### A3 ⛔ GATE — fresh backup
```bash
mkdir -p "$M/backup" "$M/secrets" "$M/rollback" "$M/migration"
for c in app-a app-b; do docker cp baraa-portfolio-$c:/app/.data/db.json "$M/backup/$c.db.json"; done
docker exec baraa-portfolio-postgres pg_dump -U postgres -d portfolio_db -Fc -f /tmp/portfolio.dump
docker exec baraa-portfolio-postgres sh -c 'pg_restore --list /tmp/portfolio.dump | grep -c "TABLE DATA"'   # expect 16
docker cp baraa-portfolio-postgres:/tmp/portfolio.dump "$M/backup/portfolio_db.dump"
docker exec baraa-portfolio-postgres rm -f /tmp/portfolio.dump
cp "$REPO/.env" "$M/rollback/dot-env.before"
for f in "$M"/backup/*.db.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" && echo "JSON ok $f"; done
(cd "$M/backup" && sha256sum * > SHA256SUMS.txt && cat SHA256SUMS.txt)
```
- **Expected:** app-a `5a3766f4…`, app-b `bae31132…`; dump 16 TABLE DATA entries.
- **Stop:** any hash differs from the expected value **and** the JSON does not parse, or the dump lists < 16 tables → do not continue.

### A4 ⛔ GATE — protect the files that will hold secrets (PowerShell, elevated)
```powershell
$M = 'C:\Users\Ahed\Project-Backups\deploy-YYYYMMDD'          # same folder as $M above
foreach ($p in @("$M", 'C:\baraa-abu-musameh---ai-engineerportfolio\.env')) {
  icacls $p /save "$M-acl-$(Split-Path $p -Leaf).txt" /t | Out-Null      # rollback data
  icacls $p /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F'
}
```
(For the `.env` file use `"${env:USERNAME}:F"` without `(OI)(CI)`.) **Rollback:** `icacls <parent> /restore <saved file>`.

### A5 — new secrets (written to a file, never printed)
```bash
gen() { node -e "console.log(require('crypto').randomBytes($1).toString('$2'))"; }
{
  echo "ADMIN_PASSWORD=$(gen 18 base64url)"          # 24 chars; save it in your password manager
  echo "ADMIN_SESSION_SECRET=$(gen 32 hex)"
  echo "POSTGRES_PASSWORD=$(gen 24 hex)"            # hex: safe inside URLs and SQL literals
  echo "REDIS_PASSWORD=$(gen 24 hex)"
} > "$M/secrets/new.env"
printf 'BIND_ADDRESS=127.0.0.1\nPG_SYNC_MODE=load\nTRUST_PROXY=\nSESSION_COOKIE_SECURE=\nCORS_ORIGIN=http://localhost:3001,http://localhost:3002\n' > "$M/secrets/deploy.env"
awk -F= '{print $1, "len=" length($2)}' "$M/secrets/new.env"
```

### A6 — rollback material (old env, old images)
```bash
for c in app-a app-b; do docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' baraa-portfolio-$c | grep -v '^$' > "$M/rollback/$c.env"; done
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' baraa-portfolio-postgres | grep '^POSTGRES_PASSWORD=' > "$M/rollback/postgres.env"
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' baraa-portfolio-redis    | grep '^REDIS_PASSWORD='    > "$M/rollback/redis.env"
docker tag c8bef74cab85 portfolio-rollback/app-a-image:20260825
docker tag 1bd5c3b848ae portfolio-rollback/app-b-image:20260825
cp "C:/Users/Ahed/Project-Backups/phase0.1-20261104T125959Z/recycle-bin/downloads-copy-deleted-20261014/docker-compose.yml" "$M/rollback/docker-compose.old.yml"
wc -l "$M"/rollback/*.env
```

### A7 ⛔ GATE — build the new image (no effect on running containers)
```bash
cd "$REPO" && npx tsc --noEmit && npm run test:unit      # quick re-check of the code that goes into the image
docker build -t "$IMG_NEW_A" -t "$IMG_NEW_B" "$REPO"
docker run --rm --entrypoint id "$IMG_NEW_A"                      # expect uid=1000(node)
docker run --rm --entrypoint sh "$IMG_NEW_A" -c 'ls -a /app'      # expect: no .env
docker inspect -f '{{.Id}}' "$IMG_NEW_A" > "$M/new-image.id"
docker inspect -f '{{.Image}}' baraa-portfolio-app-a              # still sha256:c8bef74cab85… (unchanged)
```
Running containers keep their image id even after the tag moves; a reboot restarts them on the old image.

### A8 ⛔ GATE — create and fill the two volumes (not mounted yet)
```bash
cp "$M/backup/app-a.db.json" "$M/migration/source.db.json"          # D3: app-a for both
SRC=$(sha256sum "$M/migration/source.db.json" | cut -d' ' -f1)
for v in app_a_data app_b_data; do
  docker volume create --label com.docker.compose.project=$P --label com.docker.compose.volume=$v ${P}_$v
  docker run --rm --user 0 --entrypoint sh -v ${P}_$v:/data -v "$M/migration:/src:ro" "$IMG_NEW_A" \
    -c 'cp /src/source.db.json /data/db.json && chown -R 1000:1000 /data && sha256sum /data/db.json && ls -ln /data'
done
echo "expected $SRC"
```
- **Verify:** both volumes print `$SRC`, owner `1000 1000`.
- **Stop:** hash mismatch → `docker volume rm ${P}_app_a_data ${P}_app_b_data` and repeat.

### A9 — old-session probe (proves invalidation later)
```bash
OLD=$(grep '^ADMIN_PASSWORD=' "$M/rollback/app-a.env" | cut -d= -f2-)
printf '{"password":"%s"}' "$OLD" | curl -s -H 'Content-Type: application/json' --data-binary @- http://127.0.0.1:3001/api/auth/login \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).token||""))' > "$M/secrets/old-session.token"; unset OLD
curl -s -o /dev/null -w 'old session before: %{http_code}\n' -H "Authorization: Bearer $(cat "$M/secrets/old-session.token")" http://127.0.0.1:3001/api/messages   # expect 200
docker exec baraa-portfolio-redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "sess:admin:*" | wc -l'   # expect 1
```

### Go / No-Go before Phase B
A3 hashes recorded · A5 files present · A6 rollback files + tags present · A7 image built and checked · A8 volumes hold `$SRC` · A9 probe = 200 · a phone ready for the LAN test.

---

## 5. Phase B ⛔ GATE — maintenance window (downtime ≈ 3–5 min)

```bash
# B1  downtime starts: stop the old apps (containers are kept, not removed)
docker stop baraa-portfolio-app-a baraa-portfolio-app-b

# B2  final data check on the stopped containers
for c in app-a app-b; do docker cp baraa-portfolio-$c:/app/.data/db.json "$M/migration/final-$c.db.json"; done
sha256sum "$M"/migration/final-*.db.json      # must equal 5a3766f4… / bae31132… (A3)

# B3  full rollback images (code + data of the old containers)
docker commit baraa-portfolio-app-a portfolio-rollback/app-a:final
docker commit baraa-portfolio-app-b portfolio-rollback/app-b:final

# B4  write the new configuration into .env (keys replaced or appended; nothing printed)
merge() { node -e '
const fs=require("fs");const [envPath,addPath]=process.argv.slice(1);
const add=Object.fromEntries(fs.readFileSync(addPath,"utf8").split(/\r?\n/).filter(Boolean).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const seen=new Set();const out=fs.readFileSync(envPath,"utf8").split(/\r?\n/).map(l=>{const k=l.split("=")[0];if(k in add){seen.add(k);return k+"="+add[k];}return l;});
for(const k of Object.keys(add))if(!seen.has(k))out.push(k+"="+add[k]);
fs.writeFileSync(envPath,out.join("\n"));console.log("set:",Object.keys(add).join(","));' "$1" "$2"; }
merge "$REPO/.env" "$M/secrets/new.env"; merge "$REPO/.env" "$M/secrets/deploy.env"
cd "$REPO" && docker compose -p $P -f docker-compose.yml -f docker-compose.volumes.yml config --format json \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);for(const[n,v] of Object.entries(c.services))console.log(n,"ports:",(v.ports||[]).map(p=>p.host_ip+":"+p.published).join(" "),"volumes:",(v.volumes||[]).map(x=>x.source+"->"+x.target).join(" "))})'
#     expect: every port on 127.0.0.1; app-a/app-b mount ${P}_app_a_data / ${P}_app_b_data on /app/.data

# B5  rotate the PostgreSQL role password (D2); the password goes through stdin, not argv
NEWPG=$(grep '^POSTGRES_PASSWORD=' "$M/secrets/new.env" | cut -d= -f2-)
printf "ALTER ROLE postgres WITH PASSWORD '%s';\n" "$NEWPG" | docker exec -i baraa-portfolio-postgres psql -U postgres -v ON_ERROR_STOP=1
docker exec -e PGPASSWORD="$NEWPG" baraa-portfolio-postgres psql -h 127.0.0.1 -U postgres -d portfolio_db -tAc 'select 1'   # expect 1
unset NEWPG

# B6  recreate all four containers (named volumes postgres_data/redis_data are reused; NEVER add -v)
docker compose -p $P -f docker-compose.yml -f docker-compose.volumes.yml up -d --no-build

# B7  wait for health (max 3 min)
for i in $(seq 1 36); do s=$(docker ps --filter name=baraa-portfolio --format '{{.Status}}' | grep -c healthy); [ "$s" = 4 ] && break; sleep 5; done; docker ps --filter name=baraa-portfolio --format '{{.Names}} | {{.Status}} | {{.Ports}}'
```

### B8 — verification (all must pass; otherwise → rollback R2)
```bash
for p in 3001 3002; do curl -s http://127.0.0.1:$p/ready; echo; done                      # postgres + redis "healthy"
for c in app-a app-b; do docker exec baraa-portfolio-$c sh -c 'id -u; ls /app/.data; sha256sum /app/.data/db.pre-pg-load-*.json | head -1'; done
#   expect uid 1000; the pre-load snapshot hash = $SRC (byte copy taken before PostgreSQL content is applied;
#   loadData does not rewrite an existing file). If it differs, the record counts below are decisive.
for c in app-a app-b; do docker exec baraa-portfolio-$c node -e 'const d=require("/app/.data/db.json");console.log(["messages","leads","projects","services","skills","blog"].map(k=>k+"="+d[k].length).join(" "))'; done
#   expect messages=5 leads=9 projects=5 services=6 skills=20 blog=3 on both
docker exec baraa-portfolio-postgres psql -U postgres -d portfolio_db -tAc "select (select count(*) from portfolio_messages),(select count(*) from portfolio_leads)"   # 12|10
OLD=$(grep '^ADMIN_PASSWORD=' "$M/rollback/app-a.env" | cut -d= -f2-); NEW=$(grep '^ADMIN_PASSWORD=' "$M/secrets/new.env" | cut -d= -f2-)
for p in 3001 3002; do
  o=$(printf '{"password":"%s"}' "$OLD" | curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' --data-binary @- http://127.0.0.1:$p/api/auth/login)
  n=$(printf '{"password":"%s"}' "$NEW" | curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' --data-binary @- http://127.0.0.1:$p/api/auth/login)
  echo "port $p: old password $o (expect 401), new password $n (expect 200)"
done; unset OLD NEW
curl -s -o /dev/null -w 'old session after: %{http_code} (expect 401)\n' -H "Authorization: Bearer $(cat "$M/secrets/old-session.token")" http://127.0.0.1:3001/api/messages
docker logs --since 10m baraa-portfolio-app-a 2>&1 | grep -iE 'error|refus|abort|corrupt' | head    # expect nothing except the SESSION_COOKIE_SECURE warning
```
PowerShell: `Get-NetTCPConnection -State Listen | ? LocalPort -in 3001,3002,5432,6379 | select LocalAddress,LocalPort` → only `127.0.0.1` (and `::1`). Phone on "Salam": `http://192.168.0.106:3001/live` must fail. Browser on this PC: `http://localhost:3001/admin` → sign in with the new password → Messages 5, Leads 9, Settings → AI: clear `ai_model` (D6).

**Downtime ends** when B8 passes.

### Stop conditions inside the window
| Where | Condition | Action |
|---|---|---|
| B2 | hash ≠ A3 value | re-fill both volumes from `final-app-a.db.json` (A8 commands), then continue |
| B4 | config shows a port not on 127.0.0.1 or a missing volume | do not run B5/B6 → **R1** |
| B5 | `ALTER ROLE` or `select 1` fails | do not run B6 → **R1** |
| B7 | not 4×healthy after 3 min | **R2** |
| B8 | any check fails | **R2** |

### Rollback
**R1 — before B6 (old containers still exist, ≈ 30 s):**
```bash
cp "$M/rollback/dot-env.before" "$REPO/.env"
OLDPG=$(cut -d= -f2- "$M/rollback/postgres.env")       # only if B5 already ran
printf "ALTER ROLE postgres WITH PASSWORD '%s';\n" "$OLDPG" | docker exec -i baraa-portfolio-postgres psql -U postgres -v ON_ERROR_STOP=1; unset OLDPG
docker start baraa-portfolio-app-a baraa-portfolio-app-b
```
**R2 — after B6 (≈ 2 min):**
```bash
for c in app-a app-b; do docker cp baraa-portfolio-$c:/app/.data/db.json "$M/rollback/after-window-$c.db.json" 2>/dev/null; done   # keep anything written meanwhile
docker compose -p $P -f docker-compose.yml -f docker-compose.volumes.yml rm -sf app-a app-b
OLDPG=$(cut -d= -f2- "$M/rollback/postgres.env")
printf "ALTER ROLE postgres WITH PASSWORD '%s';\n" "$OLDPG" | docker exec -i baraa-portfolio-postgres psql -U postgres -v ON_ERROR_STOP=1; unset OLDPG
docker run -d --name baraa-portfolio-app-a --restart unless-stopped --network ${P}_default --env-file "$M/rollback/app-a.env" -p 127.0.0.1:3001:3000 portfolio-rollback/app-a:final
docker run -d --name baraa-portfolio-app-b --restart unless-stopped --network ${P}_default --env-file "$M/rollback/app-b.env" -p 127.0.0.1:3002:3000 portfolio-rollback/app-b:final
cp "$M/rollback/dot-env.before" "$REPO/.env"
```
Result: the August code with its exact August data, reachable only from this PC. Redis/PostgreSQL stay on the new containers (127.0.0.1); the old apps' Redis password no longer matches, so they fall back to in-memory sessions (works). The rollback containers have no compose labels — remove them (`docker rm -f`) before the next attempt. Volumes and the A3 backup are untouched by any rollback.

---

## 6. HTTPS, `TRUST_PROXY`, `SESSION_COOKIE_SECURE` — matched to the deployment

The code behaviour was verified in the dry run (steps 8–9): plain HTTP → no `Secure`, forged `X-Forwarded-Proto` ignored; `TRUST_PROXY=1` + HTTPS proxy → `Secure` cookie + HSTS; `SESSION_COOKIE_SECURE=true` → always `Secure`.

| Model (D5) | `BIND_ADDRESS` | `TRUST_PROXY` | `SESSION_COOKIE_SECURE` | `CORS_ORIGIN` / `APP_URL` | Notes |
|---|---|---|---|---|---|
| **A — local only (today, recommended)** | `127.0.0.1` | empty | empty | `http://localhost:3001,http://localhost:3002` | Admin only from this PC. Production logs one expected warning about `SESSION_COOKIE_SECURE`. Setting it to `true` here is possible in Chrome/Edge/Firefox (they treat `localhost` as secure) but breaks Safari and any IP-based URL — not worth it |
| B — another LAN device must reach the site | `0.0.0.0` + firewall allow-list for that device's IP only (G0 variant with `-RemoteAddress`) | empty | empty | add `http://192.168.0.106:3001` | Password travels unencrypted on the LAN — **not recommended** |
| C — public, Cloudflare Tunnel | `127.0.0.1` | `1` | `true` | `https://<domain>` | No inbound port; `cloudflared` → `http://127.0.0.1:3001`. One hop is correct only because the port is bound to 127.0.0.1 (otherwise LAN clients could forge `X-Forwarded-For`) |
| D — public, Caddy/Nginx on this PC | `127.0.0.1` | `1` | `true` | `https://<domain>` | Needs router port-forward 80/443 (outward-facing decision) |

Before C or D:
- The app sends `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` on HTTPS. That pins the domain **and all its subdomains** to HTTPS for a year. Confirm every subdomain supports HTTPS, or ask for a small code change to make the header configurable.
- Send public traffic to **one** instance (app-a). app-a and app-b keep separate `db.json` files.
- Check after switching: `curl -sI https://<domain>/ | grep -i strict-transport`, and confirm that login returns `Set-Cookie: …; Secure; HttpOnly; SameSite=Strict`.

---

## 7. Phase C — after the window (no downtime)

1. **C1 Sessions:** `docker exec baraa-portfolio-redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "sess:admin:*" | wc -l'`. Only sessions created after the window remain; the A9 probe was deleted on its first use. In-memory sessions ended with the old containers. Upstash sessions, used by the host server only, are rejected by the new fingerprint as soon as the host runs the new code with the new `.env`.
2. **C2 Firewall:** keep G0 (D7).
3. **C3 ⛔ GATE — old secrets in Docker layers.** Run this after ≥ 7 stable days:
   - `docker builder prune` (3.5 GB).
   - Remove the rollback images: `docker rmi portfolio-rollback/app-a:final portfolio-rollback/app-b:final portfolio-rollback/app-a-image:20260825 portfolio-rollback/app-b-image:20260825`.
   - Then securely delete `$M/rollback/*.env` and `dot-env.before`, which contain the old secrets.
4. **C4 GitHub:** keep it private. Rewriting history is optional now that every exposed value has been rotated.
5. **C5 Records:** append the outcome to `changes.git` (docs only) and update `OWNER_ACTIONS_REQUIRED.md`. Run a full dry run again before any later change.

---

## 8. Approval checklist

| Gate | What I will do | Needs your "yes" |
|---|---|---|
| A1 | apply G0 firewall rule (you run it elevated, or approve an elevated session) | ☐ |
| A3 | fresh backup into `Project-Backups\deploy-<date>` | ☐ |
| A4 | restrict ACLs on `.env` and the deploy folder | ☐ |
| A5–A9 | generate new secrets (files only), rollback material, build image, create volumes, old-session probe | ☐ |
| B | maintenance window: stop → commit → `.env` → `ALTER ROLE` → recreate → verify (≈ 3–5 min downtime), with R1/R2 rollback | ☐ + time slot |
| C3 | prune build cache / rollback images (≥ 7 days later) | ☐ |
| Decisions | D1–D7 above | ☐ |
