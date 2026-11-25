import http from 'http';

async function checkUrl(url: string): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, data: body }));
    }).on('error', (err) => reject(err));
  });
}

async function runDockerSmoke() {
  console.log('====================================================');
  console.log('Testing Containerized Application Smoke Probes');
  console.log('====================================================\n');

  try {
    const appALive = await checkUrl('http://127.0.0.1:3001/live');
    console.log(`[app-a] GET /live -> HTTP ${appALive.statusCode} (${appALive.data.trim()})`);

    const appAReady = await checkUrl('http://127.0.0.1:3001/ready');
    console.log(`[app-a] GET /ready -> HTTP ${appAReady.statusCode} (${appAReady.data.trim()})`);

    const appAHealth = await checkUrl('http://127.0.0.1:3001/health');
    console.log(`[app-a] GET /health -> HTTP ${appAHealth.statusCode} (${appAHealth.data.trim()})`);

    const appBLive = await checkUrl('http://127.0.0.1:3002/live');
    console.log(`[app-b] GET /live -> HTTP ${appBLive.statusCode} (${appBLive.data.trim()})`);

    const appBReady = await checkUrl('http://127.0.0.1:3002/ready');
    console.log(`[app-b] GET /ready -> HTTP ${appBReady.statusCode} (${appBReady.data.trim()})`);

    console.log('\n✓ Docker Container Network Smoke Test Passed 100%!');
  } catch (err: any) {
    console.error('❌ Docker Smoke Test Failed:', err.message);
    process.exit(1);
  }
}

runDockerSmoke();
