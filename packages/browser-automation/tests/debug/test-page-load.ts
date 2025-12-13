/**
 * Debug Script: Test Basic Page Load
 *
 * This script helps diagnose why .app-container is not being found.
 */

import { chromium } from 'playwright';

const APP_URL = process.env.BROWSER_APP_URL || 'http://browser-app:3000';
const HEADLESS = process.env.HEADLESS === 'true';

async function main() {
  console.log('==========================================');
  console.log('Debug: Testing Page Load');
  console.log('==========================================');
  console.log(`APP_URL: ${APP_URL}`);
  console.log(`HEADLESS: ${HEADLESS}`);
  console.log('');

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  // Capture console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });

  // Capture network failures
  page.on('requestfailed', (request) => {
    console.error(`[NETWORK FAIL] ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log(`\n1. Navigating to ${APP_URL}...`);
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log(`   ✅ Navigation response: ${response?.status()}`);

    console.log('\n2. Getting page HTML...  ');
    const html = await page.content();
    console.log(`   ✅ HTML length: ${html.length} characters`);
    console.log(`   First 500 chars: ${html.substring(0, 500)}`);

    console.log('\n3. Checking for #root element...');
    const rootExists = await page.locator('#root').count();
    console.log(`   ${rootExists > 0 ? '✅' : '❌'} #root exists: ${rootExists > 0}`);

    if (rootExists > 0) {
      const rootHTML = await page.locator('#root').innerHTML();
      console.log(`   #root innerHTML length: ${rootHTML.length}`);
      console.log(`   First 300 chars: ${rootHTML.substring(0, 300)}`);
    }

    console.log('\n4. Checking for .app-container element...');
    const appContainerExists = await page.locator('.app-container').count();
    console.log(`   ${appContainerExists > 0 ? '✅' : '❌'} .app-container exists: ${appContainerExists > 0}`);

    if (appContainerExists === 0) {
      console.log('\n5. Waiting 10 seconds to see if React renders...');
      await page.waitForTimeout(10000);

      const appContainerExistsAfterWait = await page.locator('.app-container').count();
      console.log(`   ${appContainerExistsAfterWait > 0 ? '✅' : '❌'} .app-container exists after wait: ${appContainerExistsAfterWait > 0}`);
    }

    console.log('\n6. Taking screenshot for debugging...');
    await page.screenshot({ path: '/app/temp/screenshots/debug-page-load.png', fullPage: true });
    console.log('   ✅ Screenshot saved to /app/temp/screenshots/debug-page-load.png');

    console.log('\n7. Getting all body child elements...');
    const bodyChildren = await page.evaluate(() => {
      const body = document.body;
      return Array.from(body.children).map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
      }));
    });
    console.log('   Body children:', JSON.stringify(bodyChildren, null, 2));

  } catch (error) {
    console.error('\n❌ Error during page load test:', error);
  } finally {
    await browser.close();
    console.log('\n==========================================');
    console.log('Debug test complete');
    console.log('==========================================');
  }
}

main().catch(console.error);
