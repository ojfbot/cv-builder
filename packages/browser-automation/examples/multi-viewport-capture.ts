/**
 * Example 4: Multi-Viewport Screenshot Capture
 *
 * Demonstrates responsive testing:
 * 1. Navigate to application
 * 2. Capture screenshots at different viewport sizes
 * 3. Compare file sizes and dimensions
 */

import axios from 'axios';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

async function captureAllViewports() {
  console.log('=== Multi-Viewport Screenshot Capture ===\n');

  const sessionDir = 'temp/screenshots/responsive-test';

  try {
    // 1. Navigate to application
    console.log('1. Navigating to application...');
    await axios.post(`${API_URL}/navigate`, {
      url: APP_URL,
      waitFor: 'load',
    });
    console.log('   ✓ Navigation complete\n');

    // 2. Wait for content to load
    await axios.post(`${API_URL}/wait`, {
      condition: 'selector',
      value: '.cds--content',
    });

    // 3. Capture at different viewports
    const viewports = ['mobile', 'tablet', 'desktop', 'mobile-landscape'];

    console.log('2. Capturing screenshots at different viewports...\n');

    const results = [];

    for (const viewport of viewports) {
      console.log(`   → Capturing ${viewport} viewport...`);

      const response = await axios.post(`${API_URL}/screenshot`, {
        name: 'dashboard',
        viewport,
        sessionDir,
      });

      results.push({
        viewport,
        filename: response.data.filename,
        width: response.data.viewport.width,
        height: response.data.viewport.height,
        fileSize: response.data.fileSize,
      });

      console.log(`   ✓ ${viewport}: ${response.data.viewport.width}x${response.data.viewport.height} - ${(response.data.fileSize / 1024).toFixed(2)} KB`);
    }

    // 4. Summary
    console.log('\n3. Viewport Comparison:\n');
    console.log('   Viewport          | Dimensions  | File Size');
    console.log('   ------------------|-------------|----------');

    results.forEach((result) => {
      const viewportName = result.viewport.padEnd(17);
      const dimensions = `${result.width}x${result.height}`.padEnd(11);
      const fileSize = `${(result.fileSize / 1024).toFixed(2)} KB`;
      console.log(`   ${viewportName} | ${dimensions} | ${fileSize}`);
    });

    console.log(`\n✅ Responsive testing complete! Screenshots saved to: ${sessionDir}`);
    console.log('\nViewport presets used:');
    console.log('  - mobile: 375x667 (iPhone SE)');
    console.log('  - mobile-landscape: 667x375 (iPhone SE landscape)');
    console.log('  - tablet: 768x1024 (iPad)');
    console.log('  - desktop: 1920x1080 (Full HD)');
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
captureAllViewports();
