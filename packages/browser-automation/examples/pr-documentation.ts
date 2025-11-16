/**
 * Example 5: PR Documentation Screenshot Generator
 *
 * Demonstrates automated PR documentation:
 * 1. Navigate to application
 * 2. Capture screenshots of all main views
 * 3. Capture key features
 * 4. Organize for PR attachment
 */

import axios from 'axios';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

async function generatePRScreenshots(prNumber?: string) {
  const pr = prNumber || process.argv[2] || 'demo';
  const sessionDir = `temp/screenshots/pr-${pr}`;

  console.log(`=== PR #${pr} Documentation Generator ===\n`);

  try {
    // 1. Navigate to application
    console.log('1. Navigating to application...');
    await axios.post(`${API_URL}/navigate`, {
      url: APP_URL,
      waitFor: 'load',
    });
    console.log('   ✓ Navigation complete\n');

    // 2. Capture main dashboard
    console.log('2. Capturing main dashboard...');
    await axios.post(`${API_URL}/wait`, {
      condition: 'selector',
      value: '.cds--content',
    });

    await axios.post(`${API_URL}/screenshot`, {
      name: '00-dashboard-overview',
      viewport: 'desktop',
      sessionDir,
    });
    console.log('   ✓ Dashboard overview captured\n');

    // 3. Capture each tab view
    const tabs = [
      { name: 'Bio', selector: '[data-tab="bio"]', index: '01' },
      { name: 'Jobs', selector: '[data-tab="jobs"]', index: '02' },
      { name: 'Outputs', selector: '[data-tab="outputs"]', index: '03' },
      { name: 'Chat', selector: '[data-tab="chat"]', index: '04' },
    ];

    console.log('3. Capturing tab views...\n');

    for (const tab of tabs) {
      console.log(`   → ${tab.name} tab...`);

      await axios.post(`${API_URL}/interact/click`, {
        selector: tab.selector,
      });

      await axios.post(`${API_URL}/wait`, {
        condition: 'timeout',
        value: '500',
      });

      await axios.post(`${API_URL}/screenshot`, {
        name: `${tab.index}-${tab.name.toLowerCase()}-view`,
        viewport: 'desktop',
        sessionDir,
      });

      console.log(`   ✓ ${tab.name} captured`);
    }

    // 4. Capture mobile view (key screen)
    console.log('\n4. Capturing mobile view...');

    await axios.post(`${API_URL}/interact/click`, {
      selector: '[data-tab="bio"]',
    });

    await axios.post(`${API_URL}/wait`, {
      condition: 'timeout',
      value: '500',
    });

    await axios.post(`${API_URL}/screenshot`, {
      name: '05-mobile-view',
      viewport: 'mobile',
      sessionDir,
    });
    console.log('   ✓ Mobile view captured\n');

    // 5. Summary
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ PR #${pr} documentation complete!`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`\nScreenshots saved to: ${sessionDir}`);
    console.log('\nCaptured views:');
    console.log('  00-dashboard-overview.png - Main dashboard (desktop)');
    console.log('  01-bio-view.png - Bio tab');
    console.log('  02-jobs-view.png - Jobs tab');
    console.log('  03-outputs-view.png - Outputs tab');
    console.log('  04-chat-view.png - Chat tab');
    console.log('  05-mobile-view.png - Mobile responsive view');

    console.log('\n📸 To attach these screenshots to the PR, use:');
    console.log(`\n  "Attach screenshots to PR #${pr}"\n`);
    console.log('The screenshot-commenter agent will:');
    console.log('  1. Auto-detect screenshots in temp/screenshots/*');
    console.log('  2. Copy to temp/pr-' + pr + '/');
    console.log('  3. Commit files to current branch');
    console.log('  4. Generate rich markdown comment');
    console.log('  5. Post to GitHub PR');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
      console.error('\nMake sure:');
      console.error('  1. Browser automation service is running (docker-compose up browser-automation)');
      console.error('  2. Browser app is running (docker-compose up browser-app)');
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

// Run the example
generatePRScreenshots();
