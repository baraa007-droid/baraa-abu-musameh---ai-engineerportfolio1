import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-cms-sync-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3896';
process.env.ADMIN_PASSWORD = `cms-sync-${crypto.randomBytes(16).toString('hex')}`;
const base = `http://127.0.0.1:${process.env.PORT}`;

type ResponseBody = { status: number; body: any };
let token = '';

async function request(method: string, route: string, body?: unknown, auth = true): Promise<ResponseBody> {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let parsed: any = text;
  try { parsed = JSON.parse(text); } catch { /* text response */ }
  return { status: response.status, body: parsed };
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await import('../server');
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/live`)).ok) break; } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const login = await request('POST', '/api/auth/login', { password: process.env.ADMIN_PASSWORD, client: 'bearer' }, false);
  assertOk(login.status === 200 && login.body?.token, `admin login failed: ${login.status}`);
  token = login.body.token;

  const projectTitle = `CMS Sync Project ${Date.now()}`;
  const createdProject = await request('POST', '/api/projects', {
    title: projectTitle,
    slug: `cms-sync-${Date.now()}`,
    category: 'Verification',
    short_description: 'Isolated CMS public synchronization test',
    full_description: 'Temporary test record',
    technologies: ['TypeScript'],
    features: [],
    results: ['Temporary result'],
    published: true,
    featured: false,
    order: 1
  });
  assertOk(createdProject.status === 201, `project create failed: ${createdProject.status}`);
  let publicProjects = await request('GET', '/api/projects', undefined, false);
  assertOk(publicProjects.body.some((project: any) => project.title === projectTitle), 'published project missing from public API');
  await request('PUT', `/api/projects/${createdProject.body.id}`, { published: false });
  publicProjects = await request('GET', '/api/projects', undefined, false);
  assertOk(!publicProjects.body.some((project: any) => project.title === projectTitle), 'hidden project remained public');

  const serviceTitle = `CMS Sync Service ${Date.now()}`;
  const createdService = await request('POST', '/api/services', {
    title: serviceTitle,
    slug: `cms-service-${Date.now()}`,
    category: 'Verification',
    short_description: 'Temporary service',
    full_description: 'Temporary service',
    starting_price: '100',
    currency: 'USD',
    timeline: '1 day',
    features: [],
    active: true,
    order: 1
  });
  assertOk(createdService.status === 201, `service create failed: ${createdService.status}`);
  let publicServices = await request('GET', '/api/services', undefined, false);
  assertOk(publicServices.body.some((service: any) => service.title === serviceTitle && service.starting_price === '100' && service.currency === 'USD'), 'service price/currency missing from public API');
  await request('PUT', `/api/services/${createdService.body.id}`, { starting_price: '250', currency: 'EUR' });
  publicServices = await request('GET', '/api/services', undefined, false);
  assertOk(publicServices.body.some((service: any) => service.title === serviceTitle && service.starting_price === '250' && service.currency === 'EUR'), 'updated service price/currency missing from public API');

  const profileUpdate = await request('PUT', '/api/profile', { headline: 'CMS Sync Headline', bio: 'CMS Sync Bio', target_latency: '42ms' });
  assertOk(profileUpdate.status === 200, `profile update failed: ${profileUpdate.status}`);
  const publicProfile = await request('GET', '/api/profile', undefined, false);
  assertOk(publicProfile.body.headline === 'CMS Sync Headline' && publicProfile.body.bio === 'CMS Sync Bio' && publicProfile.body.target_latency === '42ms', 'profile update missing from public API');

  const existingCertificates = await request('GET', '/api/certificates', undefined, true);
  if (Array.isArray(existingCertificates.body) && existingCertificates.body.length > 0) {
    const certificate = { ...existingCertificates.body[0], name: 'CMS Sync Certificate', published: true };
    const certUpdate = await request('PUT', '/api/certificates', [...existingCertificates.body.slice(1), certificate]);
    assertOk(certUpdate.status === 200, `certificate update failed: ${certUpdate.status}`);
    const publicCertificates = await request('GET', '/api/certificates', undefined, false);
    assertOk(publicCertificates.body.some((item: any) => item.name === 'CMS Sync Certificate'), 'certificate update missing from public API');
  }

  console.log('CMS_PUBLIC_SYNC PASS: project publish/hide, service price/currency, profile metrics, certificate update');
  await request('DELETE', `/api/projects/${createdProject.body.id}`);
  await request('DELETE', `/api/services/${createdService.body.id}`);
}

main().catch((error) => {
  console.error(`CMS_PUBLIC_SYNC FAIL: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
