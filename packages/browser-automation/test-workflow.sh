#!/bin/bash

# Test Browser Automation Workflow
# This script tests: navigate → query → screenshot

set -e

BASE_URL="http://localhost:3002"

echo "=== Starting Browser Automation Service ==="
PORT=3002 HEADLESS=false BROWSER_APP_URL=http://localhost:3000 SCREENSHOTS_DIR=./temp/screenshots \
  node ./dist/server.js > /tmp/automation-server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
sleep 5

echo ""
echo "=== 1. Health Check ==="
curl -s "$BASE_URL/health" | jq '.status, .browser'

echo ""
echo "=== 2. Navigate to Example.com ==="
curl -s -X POST "$BASE_URL/api/navigate" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "waitFor": "networkidle"}' \
  | jq '.success, .currentUrl, .title'

sleep 2

echo ""
echo "=== 3. Query for H1 Element ==="
curl -s "$BASE_URL/api/element/exists?selector=h1" \
  | jq '.success, .exists, .visible, .count'

echo ""
echo "=== 4. Get H1 Text ==="
curl -s "$BASE_URL/api/element/text?selector=h1" \
  | jq '.success, .text'

echo ""
echo "=== 5. Capture Full Page Screenshot ==="
curl -s -X POST "$BASE_URL/api/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "example-homepage", "fullPage": true}' \
  | jq '.success, .filename, .path'

sleep 1

echo ""
echo "=== 6. Capture H1 Element Screenshot ==="
curl -s -X POST "$BASE_URL/api/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "example-h1", "selector": "h1"}' \
  | jq '.success, .filename, .path'

sleep 1

echo ""
echo "=== 7. List Screenshot Sessions ==="
curl -s "$BASE_URL/api/screenshot/sessions" \
  | jq '.success, .count, .sessions[0]'

echo ""
echo "=== 8. Browser Status After Operations ==="
curl -s "$BASE_URL/health" | jq '.browser'

echo ""
echo "=== Shutting Down ==="
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
echo "✅ Test workflow complete!"
echo "Screenshots saved to: ./temp/screenshots/"
ls -lh ./temp/screenshots/*/
