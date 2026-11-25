import http from 'http';

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

function request(method: string, path: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqBody = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (reqBody) {
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody).toString();
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let parsed = rawData;
        try { parsed = JSON.parse(rawData); } catch {}
        resolve({ status: res.statusCode || 500, body: parsed });
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function runAdversarialSecuritySuite() {
  console.log('====================================================');
  console.log('Phase 9: Security Adversarial & Attack Vector Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. JavaScript URL Protocol Injection
  try {
    const resJSUrl = await request('POST', '/api/leads', {}, {
      name: 'Attacker',
      email: 'attacker@example.com',
      description: 'Need AI system',
      reference_links: ['javascript:alert(document.cookie)']
    });
    assert(resJSUrl.status === 400, 'XSS: javascript: URL protocol in reference_links rejected (400)');
  } catch (e: any) {
    assert(false, 'javascript: protocol test', e.message);
  }

  // 2. Data URL Protocol Injection
  try {
    const resDataUrl = await request('POST', '/api/leads', {}, {
      name: 'Attacker',
      email: 'attacker@example.com',
      description: 'Need AI system',
      reference_links: ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==']
    });
    assert(resDataUrl.status === 400, 'XSS: data: text/html URL protocol in reference_links rejected (400)');
  } catch (e: any) {
    assert(false, 'data: protocol test', e.message);
  }

  // 3. SQL Injection Probe on Search API
  try {
    const resSQL = await request('POST', '/api/ai/semantic-search', {}, {
      query: "' OR '1'='1' -- DROP TABLE portfolio_projects;"
    });
    assert(resSQL.status === 200, 'SQLi: SQL injection string in semantic search handled safely (200)');
  } catch (e: any) {
    assert(false, 'SQLi search test', e.message);
  }

  // 4. Malformed Token Tampering
  try {
    const resTamperedToken = await request('GET', '/api/messages', {
      Authorization: 'Bearer adm_tampered_fake_session_hash_123456789012345678901234567890'
    });
    assert(resTamperedToken.status === 401, 'Auth: Tampered bearer token rejected with 401');
  } catch (e: any) {
    assert(false, 'Tampered token test', e.message);
  }

  // 5. Oversized Payload (>10,000 chars)
  try {
    const hugeString = 'X'.repeat(15000);
    const resHuge = await request('POST', '/api/messages', {}, {
      name: 'Attacker',
      email: 'attacker@example.com',
      message: hugeString
    });
    assert(resHuge.status === 400, 'DoS: Oversized message body (15k chars) rejected with 400');
  } catch (e: any) {
    assert(false, 'Oversized payload test', e.message);
  }

  // 6. Unicode / Null Byte Injection
  try {
    const resNullByte = await request('POST', '/api/messages', {}, {
      name: 'Attacker\0Admin',
      email: 'attacker@example.com',
      message: 'Testing null byte injection \0'
    });
    assert(resNullByte.status === 201 || resNullByte.status === 400, 'Sanitization: Null byte string handled safely without crashing');
  } catch (e: any) {
    assert(false, 'Null byte test', e.message);
  }

  console.log('\n====================================================');
  console.log(`Adversarial Security Suite: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runAdversarialSecuritySuite().catch(console.error);
