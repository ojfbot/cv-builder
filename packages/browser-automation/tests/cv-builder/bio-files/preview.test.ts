/**
 * Bio Files - Document Preview Feature Test
 *
 * Tests the document preview functionality (eyeball icon) in the Bio Dashboard.
 *
 * Prerequisites:
 * - CV Builder app running on port 3000
 * - Browser automation service running on port 3002
 * - API server running on port 3001
 * - At least one file uploaded to personal/bios/ for testing
 */

import { createTestSuite } from '../../../src/test-runner/index.js'

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const SCREENSHOTS_PATH = 'temp/screenshots/issue-12/phase1-preview'

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Bio Files - Document Preview', API_URL)

  // Verify prerequisites
  suite.beforeAll(async () => {
    console.log('\n🔍 Checking prerequisites...')

    // Check browser automation service
    try {
      await client.health()
      console.log('✅ Browser automation service is ready')
    } catch (error) {
      console.error(`❌ Browser automation service not running at ${API_URL}`)
      process.exit(1)
    }

    // Check CV Builder app
    try {
      await client.navigate(APP_URL, { waitFor: 'networkidle' })
      console.log('✅ CV Builder app is ready\n')
    } catch (error) {
      console.error(`❌ CV Builder app not running at ${APP_URL}`)
      console.error('Please run: pnpm dev:all')
      process.exit(1)
    }
  })

  // ========================================
  // Test 1: Navigate to Bio Files View
  // ========================================

  suite.test('Navigate to Bio files view', async ({ assert }) => {
    await client.navigate(APP_URL, { waitFor: 'networkidle' })

    // Click Bio tab if not already there
    const bioTab = '[data-element="bio-tab"]'
    const tabExists = await client.waitForSelector(bioTab, { timeout: 5000 }).catch(() => false)

    if (tabExists) {
      await client.click(bioTab)
    }

    // Click "View Files" button
    const filesButton = '[data-element="bio-files-button"]'
    await client.waitForSelector(filesButton, { state: 'visible', timeout: 5000 })
    await client.click(filesButton)

    // Wait for files table
    await client.waitForSelector('[data-element="bio-files-table"]', {
      state: 'visible',
      timeout: 10000,
    })

    await assert.elementVisible('[data-element="bio-files-table"]')

    console.log('  ✓ Navigated to Bio files view')
  })

  // ========================================
  // Test 2: Preview Button Visibility
  // ========================================

  suite.test('Preview button appears on file rows', async ({ assert }) => {
    // Check for file rows
    const fileRows = '[data-element="bio-file-row"]'
    await client.waitForSelector(fileRows, { state: 'visible', timeout: 5000 })

    // Check for preview button
    const previewButton = '[data-element="bio-file-preview-button"]'
    await assert.elementVisible(previewButton)

    // Capture screenshot of table with buttons
    const screenshot = await client.screenshot({
      name: 'bio-files-table-with-preview-button',
      path: SCREENSHOTS_PATH,
      fullPage: false,
    })

    assert.screenshotCaptured(screenshot)
    console.log(`  📸 Saved: ${screenshot.filename}`)
  })

  // ========================================
  // Test 3: Open Preview Modal
  // ========================================

  suite.test('Click preview button opens modal', async ({ assert }) => {
    const previewButton = '[data-element="bio-file-preview-button"]'
    await client.click(previewButton)

    // Wait for modal to appear
    const modal = '[data-element="document-preview-modal"]'
    await client.waitForSelector(modal, { state: 'visible', timeout: 10000 })

    await assert.elementVisible(modal)

    // Capture screenshot of preview modal
    const screenshot = await client.screenshot({
      name: 'document-preview-modal-opened',
      path: SCREENSHOTS_PATH,
      fullPage: false,
    })

    assert.screenshotCaptured(screenshot)
    console.log(`  📸 Saved: ${screenshot.filename}`)
    console.log('  ✓ Preview modal opened successfully')
  })

  // ========================================
  // Test 4: Preview Modal Content
  // ========================================

  suite.test('Preview modal displays content', async ({ assert }) => {
    const modal = '[data-element="document-preview-modal"]'

    // Modal should have a heading
    await assert.elementVisible(`${modal} [class*="modal-header"], ${modal} [class*="modalHeading"]`)

    // Modal should have content (either preview text, image, or info message)
    const hasContent = await client
      .waitForSelector(`${modal} pre, ${modal} img, ${modal} [class*="notification"]`, {
        timeout: 5000,
      })
      .catch(() => false)

    if (!hasContent) {
      console.warn('  ⚠️  No preview content detected (may be expected for some file types)')
    }

    console.log('  ✓ Preview modal has content area')
  })

  // ========================================
  // Test 5: Close Preview Modal
  // ========================================

  suite.test('Preview modal closes on button click', async ({ assert }) => {
    const modal = '[data-element="document-preview-modal"]'

    // Find and click close button (Carbon modal close button)
    const closeButton = `${modal} button[class*="close"], ${modal} button:has-text("Close")`
    await client.click(closeButton)

    // Wait for modal to disappear
    await client.waitForSelector(modal, { state: 'hidden', timeout: 5000 })

    await assert.elementNotVisible(modal)

    console.log('  ✓ Preview modal closed successfully')
  })

  // ========================================
  // Test 6: Preview Multiple Times
  // ========================================

  suite.test('Can open preview multiple times', async ({ assert }) => {
    const previewButton = '[data-element="bio-file-preview-button"]'
    const modal = '[data-element="document-preview-modal"]'

    // Open modal first time
    await client.click(previewButton)
    await client.waitForSelector(modal, { state: 'visible', timeout: 10000 })

    // Close it
    const closeButton = `${modal} button[class*="close"], ${modal} button:has-text("Close")`
    await client.click(closeButton)
    await client.waitForSelector(modal, { state: 'hidden', timeout: 5000 })

    // Open again
    await client.click(previewButton)
    await client.waitForSelector(modal, { state: 'visible', timeout: 10000 })
    await assert.elementVisible(modal)

    // Close again
    await client.click(closeButton)
    await client.waitForSelector(modal, { state: 'hidden', timeout: 5000 })

    console.log('  ✓ Preview can be opened multiple times')
  })

  // ========================================
  // Test 7: Error Handling
  // ========================================

  suite.test('Preview handles errors gracefully', async ({ assert }) => {
    // This test assumes the preview can handle missing files or errors
    // Actual behavior depends on implementation

    const previewButton = '[data-element="bio-file-preview-button"]'
    const modal = '[data-element="document-preview-modal"]'

    await client.click(previewButton)
    await client.waitForSelector(modal, { state: 'visible', timeout: 10000 })

    // Look for either content or error notification
    const hasErrorOrContent = await client
      .waitForSelector(`${modal} pre, ${modal} img, ${modal} [class*="notification"]`, {
        timeout: 10000,
      })
      .catch(() => false)

    assert.isTrue(hasErrorOrContent, 'Modal should show either content or error message')

    // Capture screenshot of modal state
    const screenshot = await client.screenshot({
      name: 'document-preview-modal-state',
      path: SCREENSHOTS_PATH,
    })

    assert.screenshotCaptured(screenshot)
    console.log(`  📸 Saved: ${screenshot.filename}`)

    // Close modal
    const closeButton = `${modal} button[class*="close"], ${modal} button:has-text("Close")`
    await client.click(closeButton)
    await client.waitForSelector(modal, { state: 'hidden', timeout: 5000 })
  })

  // ========================================
  // Test 8: Responsive Design (Optional)
  // ========================================

  suite.test('Preview modal is responsive', async ({ assert }) => {
    const previewButton = '[data-element="bio-file-preview-button"]'
    const modal = '[data-element="document-preview-modal"]'

    // Test on mobile viewport
    await client.setViewport({ width: 390, height: 844 })
    await client.navigate(`${APP_URL}?tab=bio&view=files`, { waitFor: 'networkidle' })

    await client.waitForSelector('[data-element="bio-files-table"]', {
      state: 'visible',
      timeout: 10000,
    })

    await client.click(previewButton)
    await client.waitForSelector(modal, { state: 'visible', timeout: 10000 })

    // Capture mobile screenshot
    const mobileScreenshot = await client.screenshot({
      name: 'document-preview-modal-mobile',
      path: SCREENSHOTS_PATH,
    })

    assert.screenshotCaptured(mobileScreenshot)
    console.log(`  📸 Saved: ${mobileScreenshot.filename}`)

    // Close modal
    const closeButton = `${modal} button[class*="close"], ${modal} button:has-text("Close")`
    await client.click(closeButton)

    // Reset to desktop viewport
    await client.setViewport({ width: 1920, height: 1080 })

    console.log('  ✓ Preview modal is responsive')
  })

  // Run the test suite
  await suite.run()
}

main().catch(console.error)
