/**
 * Bio Files - Document Summarization Test
 *
 * Tests the AI summarization functionality for uploaded documents.
 *
 * Prerequisites:
 * - CV Builder app running on port 3000
 * - Browser automation service running on port 3002
 * - API server running on port 3001 with valid Anthropic API key
 * - At least one text-based file uploaded for testing
 */

import { createTestSuite } from '../../../src/test-runner/index.js'

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:3001'

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Bio Files - AI Summarization', API_URL)

  let testFileId: string | null = null

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
      console.log('✅ CV Builder app is ready')
    } catch (error) {
      console.error(`❌ CV Builder app not running at ${APP_URL}`)
      console.error('Please run: pnpm dev:all')
      process.exit(1)
    }

    // Check API server and get a test file
    try {
      const response = await fetch(`${API_SERVER_URL}/api/bios/files`)
      if (!response.ok) throw new Error('API not responding')

      const data = await response.json()
      if (data.files && data.files.length > 0) {
        testFileId = data.files[0].id
        console.log(`✅ API server ready (found ${data.files.length} test files)`)
      } else {
        console.warn('⚠️  No files found - some tests may be skipped')
      }
    } catch (error) {
      console.error(`❌ API server not running at ${API_SERVER_URL}`)
      console.error('Please run: pnpm dev:api')
      process.exit(1)
    }

    console.log('')
  })

  // ========================================
  // Test 1: API Endpoint - Summarize File
  // ========================================

  suite.test('API endpoint generates summary', async ({ assert }) => {
    if (!testFileId) {
      console.log('  ⏭️  Skipped (no test files available)')
      return
    }

    // Call summarize endpoint
    const response = await fetch(`${API_SERVER_URL}/api/bios/files/${testFileId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    assert.isTrue(response.ok, 'Summarize endpoint should return 200')

    const data = await response.json()

    assert.isDefined(data.summary, 'Response should include summary')
    assert.isDefined(data.cached, 'Response should indicate if cached')

    // Validate summary structure
    assert.isDefined(data.summary.summary, 'Summary should have summary text')
    assert.isDefined(data.summary.keyPoints, 'Summary should have key points')
    assert.isDefined(data.summary.documentType, 'Summary should have document type')
    assert.isDefined(data.summary.suggestedUse, 'Summary should have suggested use')

    assert.isTrue(Array.isArray(data.summary.keyPoints), 'Key points should be an array')
    assert.isTrue(data.summary.keyPoints.length > 0, 'Should have at least one key point')

    console.log('  ✓ Summary generated successfully')
    console.log(`    Type: ${data.summary.documentType}`)
    console.log(`    Key Points: ${data.summary.keyPoints.length}`)
    console.log(`    Cached: ${data.cached}`)
  })

  // ========================================
  // Test 2: Cached Summary on Second Call
  // ========================================

  suite.test('Second call returns cached summary', async ({ assert }) => {
    if (!testFileId) {
      console.log('  ⏭️  Skipped (no test files available)')
      return
    }

    // Call summarize endpoint again
    const response = await fetch(`${API_SERVER_URL}/api/bios/files/${testFileId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    assert.isTrue(response.ok, 'Second call should succeed')

    const data = await response.json()

    assert.isTrue(data.cached, 'Second call should return cached summary')

    console.log('  ✓ Cached summary returned on second call')
  })

  // ========================================
  // Test 3: Force Re-summarization
  // ========================================

  suite.test('Force flag triggers re-summarization', async ({ assert }) => {
    if (!testFileId) {
      console.log('  ⏭️  Skipped (no test files available)')
      return
    }

    // Call with force=true
    const response = await fetch(`${API_SERVER_URL}/api/bios/files/${testFileId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    })

    assert.isTrue(response.ok, 'Force re-summarization should succeed')

    const data = await response.json()

    assert.isFalse(data.cached, 'Force flag should bypass cache')

    console.log('  ✓ Force re-summarization works')
  })

  // ========================================
  // Test 4: Error Handling - Invalid File
  // ========================================

  suite.test('Invalid file ID returns error', async ({ assert }) => {
    const response = await fetch(`${API_SERVER_URL}/api/bios/files/invalid-file-id/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    assert.isFalse(response.ok, 'Invalid file ID should return error')
    assert.equal(response.status, 404, 'Should return 404 for missing file')

    console.log('  ✓ Error handling works for invalid files')
  })

  // ========================================
  // Test 5: Summary Quality Check
  // ========================================

  suite.test('Summary quality validation', async ({ assert }) => {
    if (!testFileId) {
      console.log('  ⏭️  Skipped (no test files available)')
      return
    }

    const response = await fetch(`${API_SERVER_URL}/api/bios/files/${testFileId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()
    const { summary } = data

    // Quality checks
    assert.isTrue(
      summary.summary.length > 50,
      'Summary should be substantial (>50 chars)'
    )

    assert.isTrue(
      summary.summary.length < 1000,
      'Summary should be concise (<1000 chars)'
    )

    assert.isTrue(
      summary.keyPoints.length >= 2 && summary.keyPoints.length <= 10,
      'Should have 2-10 key points'
    )

    assert.isTrue(
      ['resume', 'cover_letter', 'portfolio', 'transcript', 'certificate', 'other'].includes(
        summary.documentType
      ),
      'Document type should be valid enum value'
    )

    assert.isTrue(
      summary.suggestedUse.length > 10,
      'Suggested use should be meaningful'
    )

    console.log('  ✓ Summary quality validation passed')
  })

  // ========================================
  // Test 6: Integration - File List Shows Status
  // ========================================

  suite.test('File list shows processing status', async ({ assert }) => {
    if (!testFileId) {
      console.log('  ⏭️  Skipped (no test files available)')
      return
    }

    // Get file details
    const response = await fetch(`${API_SERVER_URL}/api/bios/files`)
    const data = await response.json()

    const testFile = data.files.find((f: any) => f.id === testFileId)

    assert.isDefined(testFile, 'Test file should exist in list')
    assert.isDefined(testFile.processingStatus, 'File should have processing status')
    assert.equal(testFile.processingStatus, 'completed', 'Processing should be completed')

    console.log('  ✓ Processing status tracked correctly')
  })

  // Run the test suite
  await suite.run()
}

main().catch(console.error)
