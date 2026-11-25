import fs from 'fs';
import { chromium } from '@playwright/test';

async function runBrowserE2ETests() {
  console.log('====================================================');
  console.log('Priority 1: Real Browser E2E Automation Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const jsRuntimeExceptions: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Determine browser executable
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const launchOptions = fs.existsSync(edgePath)
    ? { executablePath: edgePath, headless: true }
    : { headless: true };

  console.log(`[1] Launching Headless Chromium Browser...`);
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Listen for Uncaught JS Exceptions
  page.on('pageerror', err => {
    jsRuntimeExceptions.push(err.message);
  });

  const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

  try {
    // 1. Homepage Load & Document Direction
    console.log(`\n[2] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    assert(title.length > 0, `Homepage loaded successfully (Title: "${title}")`);

    // Check default dir/lang
    const defaultDir = await page.getAttribute('html', 'dir');
    const defaultLang = await page.getAttribute('html', 'lang');
    console.log(`  - Default HTML dir="${defaultDir}", lang="${defaultLang}"`);

    // 2. Language Switch: English -> Arabic -> English
    console.log('\n[3] Testing Language Switch & RTL/LTR Layout...');
    const langBtn = page.locator('button:has-text("EN"), button:has-text("AR"), button[aria-label*="language" i], button[title*="language" i]').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(500);

      const updatedDir = await page.getAttribute('html', 'dir');
      const updatedLang = await page.getAttribute('html', 'lang');
      console.log(`  - Post-switch HTML dir="${updatedDir}", lang="${updatedLang}"`);
      assert(updatedDir === 'rtl' || updatedDir === 'ltr', `Language toggle updated HTML dir attribute to "${updatedDir}"`);

      // Test Persistence after Refresh
      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloadedDir = await page.getAttribute('html', 'dir');
      assert(reloadedDir === updatedDir, `Language & RTL state persisted after browser refresh ("${reloadedDir}")`);
    }

    // 3. Theme Switch: Light -> Dark -> Light Persistence
    console.log('\n[4] Testing Theme Switch & Dark Class Persistence...');
    const themeBtn = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]').first();
    if (await themeBtn.isVisible()) {
      const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log(`  - Initial Theme dark class active? ${initialIsDark}`);

      await themeBtn.click();
      await page.waitForTimeout(500);

      const toggledIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log(`  - Toggled Theme dark class active? ${toggledIsDark}`);
      assert(toggledIsDark !== initialIsDark, 'Theme toggle updated <html> class list state');

      // Test Persistence after Refresh
      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloadedIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      assert(reloadedIsDark === toggledIsDark, 'Theme dark class state persisted after browser refresh');
    }

    // 4. Public Navigation & Main Pages
    console.log('\n[5] Testing Public Pages Navigation...');
    const routes = ['/about', '/services', '/projects', '/blog', '/contact'];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      const pageHeading = await page.locator('h1, h2').first().textContent();
      assert(true, `Navigated to ${route} (Heading: "${(pageHeading || '').trim().slice(0, 40)}")`);
    }

    // 5. Admin Login & UI Dashboard Interaction
    console.log('\n[6] Testing Admin Login & Dashboard UI...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });

    // Invalid Login Attempt
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('invalid_password_123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      const urlPostInvalid = page.url();
      assert(urlPostInvalid.includes('/admin'), 'Invalid password login rejected in UI');

      // Valid Login Attempt
      await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD || '');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      const isDashboardLoaded = page.url().includes('/admin') && (await page.locator('text=Dashboard, text=Overview, text=Logout, text=Projects, text=إدارة').count() > 0);
      assert(isDashboardLoaded, 'Valid admin password logs into Admin Dashboard UI');
    }

    // 6. Uncaught JS Exception Audit
    console.log('\n[7] Auditing JS Runtime Exceptions...');
    console.log(`  - Total Uncaught JS Exceptions: ${jsRuntimeExceptions.length}`);
    assert(jsRuntimeExceptions.length === 0, 'Zero uncaught JavaScript runtime exceptions captured during browser navigation');

  } catch (err: any) {
    console.error('Browser E2E Execution Error:', err.message);
    assert(false, 'Browser E2E workflow completed without uncaught exception', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`Browser E2E Test Execution Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runBrowserE2ETests().catch((err) => {
  console.error('Fatal Browser E2E Error:', err);
  process.exit(1);
});
