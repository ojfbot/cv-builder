/**
 * Example 3: User Flow Screenshots
 *
 * Demonstrates multi-step workflow with screenshots:
 * 1. Navigate to application
 * 2. Capture initial state
 * 3. Click through tabs
 * 4. Capture each tab state
 * 5. Test chat expansion
 */

import axios from 'axios';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

async function captureUserFlow() {
  console.log('=== User Flow Screenshots ===\n');

  const sessionDir = 'temp/screenshots/user-flow-example';

  try {
    // 1. Navigate to application
    console.log('1. Navigating to application...');
    await axios.post(`${API_URL}/navigate`, {
      url: APP_URL,
      waitFor: 'load',
    });
    console.log('   ✓ Navigation complete\n');

    // 2. Capture initial state
    console.log('2. Capturing initial dashboard state...');
    await axios.post(`${API_URL}/screenshot`, {
      name: '01-initial-dashboard',
      sessionDir,
    });
    console.log('   ✓ Initial state captured\n');

    // 3. Navigate through tabs and capture each
    const tabs = [
      { name: 'Bio', selector: '[data-tab="bio"]', filename: '02-bio-tab' },
      { name: 'Jobs', selector: '[data-tab="jobs"]', filename: '03-jobs-tab' },
      { name: 'Outputs', selector: '[data-tab="outputs"]', filename: '04-outputs-tab' },
      { name: 'Chat', selector: '[data-tab="chat"]', filename: '05-chat-tab' },
    ];

    console.log('3. Navigating through tabs...\n');

    for (const tab of tabs) {
      console.log(`   → Clicking ${tab.name} tab...`);

      // Click tab
      await axios.post(`${API_URL}/interact/click`, {
        selector: tab.selector,
      });

      // Wait a moment for transition
      await axios.post(`${API_URL}/wait`, {
        condition: 'timeout',
        value: '500',
      });

      // Capture screenshot
      await axios.post(`${API_URL}/screenshot`, {
        name: tab.filename,
        sessionDir,
      });

      console.log(`   ✓ ${tab.name} tab captured`);
    }

    console.log('\n4. Testing chat expansion...');

    // Navigate back to Bio tab for condensed chat
    await axios.post(`${API_URL}/interact/click`, {
      selector: '[data-tab="bio"]',
    });

    await axios.post(`${API_URL}/wait`, {
      condition: 'timeout',
      value: '500',
    });

    // Capture condensed chat (collapsed)
    await axios.post(`${API_URL}/screenshot`, {
      name: '06-chat-collapsed',
      sessionDir,
    });
    console.log('   ✓ Collapsed chat captured');

    // Click to expand chat (if element exists)
    try {
      await axios.post(`${API_URL}/interact/click`, {
        selector: '#condensed-input',
      });

      // Wait for animation
      await axios.post(`${API_URL}/wait`, {
        condition: 'timeout',
        value: '800',
      });

      // Capture expanded chat
      await axios.post(`${API_URL}/screenshot`, {
        name: '07-chat-expanded',
        sessionDir,
      });
      console.log('   ✓ Expanded chat captured');
    } catch (error) {
      console.log('   ⚠ Chat expansion not available (element may not exist)');
    }

    console.log(`\n✅ User flow complete! Screenshots saved to: ${sessionDir}`);
    console.log('\nTo attach these to a PR, run:');
    console.log('  "Attach screenshots to PR #<number>"');
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
captureUserFlow();
