/**
 * Example 1: Capture Dashboard Screenshot
 *
 * Demonstrates basic screenshot capture workflow:
 * 1. Navigate to dashboard
 * 2. Wait for content to load
 * 3. Capture screenshot
 */

import axios from 'axios';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

async function captureDashboard() {
  console.log('=== Capture Dashboard Screenshot ===\n');

  try {
    // 1. Navigate to dashboard
    console.log('1. Navigating to dashboard...');
    const navResponse = await axios.post(`${API_URL}/navigate`, {
      url: APP_URL,
      waitFor: 'load',
    });
    console.log(`   ✓ Navigated to: ${navResponse.data.currentUrl}`);
    console.log(`   ✓ Page title: ${navResponse.data.title}\n`);

    // 2. Wait for dashboard content to load
    console.log('2. Waiting for dashboard content...');
    await axios.post(`${API_URL}/wait`, {
      condition: 'selector',
      value: '.cds--content',
      timeout: 10000,
    });
    console.log('   ✓ Dashboard loaded\n');

    // 3. Capture screenshot
    console.log('3. Capturing screenshot...');
    const screenshotResponse = await axios.post(`${API_URL}/screenshot`, {
      name: 'dashboard-capture',
      viewport: 'desktop',
      sessionDir: 'temp/screenshots/examples',
    });
    console.log(`   ✓ Screenshot saved: ${screenshotResponse.data.path}`);
    console.log(`   ✓ File size: ${(screenshotResponse.data.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   ✓ Viewport: ${screenshotResponse.data.viewport.width}x${screenshotResponse.data.viewport.height}`);

    console.log('\n✅ Dashboard screenshot captured successfully!');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

// Run the example
captureDashboard();
