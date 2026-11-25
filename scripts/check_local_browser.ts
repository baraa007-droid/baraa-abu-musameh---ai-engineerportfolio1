import fs from 'fs';
import { chromium } from '@playwright/test';

async function checkLocalBrowser() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  let foundPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  console.log(`Local browser binary found? ${foundPath ? foundPath : 'NONE'}`);

  if (foundPath) {
    try {
      const browser = await chromium.launch({ executablePath: foundPath, headless: true });
      console.log(`Successfully launched local browser (${foundPath})!`);
      await browser.close();
      process.exit(0);
    } catch (e: any) {
      console.error('Launch failed:', e.message);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}

checkLocalBrowser().catch(console.error);
