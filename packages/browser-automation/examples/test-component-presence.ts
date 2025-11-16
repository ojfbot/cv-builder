/**
 * Example 2: Test Component Presence
 *
 * Demonstrates element querying and verification:
 * 1. Navigate to application
 * 2. Check for multiple components
 * 3. Verify visibility and state
 */

import axios from 'axios';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

async function testComponentPresence() {
  console.log('=== Test Component Presence ===\n');

  try {
    // 1. Navigate to application
    console.log('1. Navigating to application...');
    await axios.post(`${API_URL}/navigate`, {
      url: APP_URL,
    });
    console.log('   ✓ Navigation complete\n');

    // 2. Test multiple components
    const componentsToTest = [
      { name: 'Main Content', selector: '.cds--content' },
      { name: 'Dashboard Header', text: 'CV Builder Dashboard' },
      { name: 'Bio Tab', selector: '[data-tab="bio"]' },
      { name: 'Jobs Tab', selector: '[data-tab="jobs"]' },
      { name: 'Outputs Tab', selector: '[data-tab="outputs"]' },
      { name: 'Chat Tab', selector: '[data-tab="chat"]' },
    ];

    console.log('2. Testing component presence...\n');

    for (const component of componentsToTest) {
      try {
        const params: any = {};
        if (component.selector) params.selector = component.selector;
        if (component.text) params.text = component.text;

        const response = await axios.get(`${API_URL}/element/exists`, { params });

        if (response.data.exists) {
          console.log(`   ✓ ${component.name}`);
          console.log(`     - Visible: ${response.data.visible}`);
          console.log(`     - Enabled: ${response.data.enabled}`);
          console.log(`     - Count: ${response.data.count}`);
        } else {
          console.log(`   ✗ ${component.name} - NOT FOUND`);
        }
      } catch (error) {
        console.log(`   ✗ ${component.name} - ERROR`);
      }
    }

    console.log('\n✅ Component presence test complete!');
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
testComponentPresence();
