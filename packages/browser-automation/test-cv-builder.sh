#!/bin/bash

# Test Browser Automation with CV Builder App
# Tests integration with the actual CV Builder application

set -e

BASE_URL="http://localhost:3002"
APP_URL="http://localhost:3000"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   CV Builder Browser Automation Test                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if browser-app is running
echo "=== Checking if CV Builder app is running ==="
if ! curl -s "$APP_URL" > /dev/null 2>&1; then
  echo "❌ CV Builder app is not running at $APP_URL"
  echo "Please run: npm run dev:all"
  exit 1
fi
echo "✅ CV Builder app is running"

echo ""
echo "=== Starting Browser Automation Service ==="
PORT=3002 HEADLESS=false BROWSER_APP_URL=$APP_URL SCREENSHOTS_DIR=./temp/screenshots \
  node ./dist/server.js > /tmp/cv-builder-automation.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
sleep 5

echo ""
echo "=== 1. Health Check ==="
curl -s "$BASE_URL/health" | jq '.status, .browser, .config.browserAppUrl'

echo ""
echo "=== 2. Navigate to CV Builder Dashboard ==="
curl -s -X POST "$BASE_URL/api/navigate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$APP_URL\", \"waitFor\": \"networkidle\"}" \
  | jq '.success, .currentUrl, .title'

sleep 3

echo ""
echo "=== 3. Query for Main App Container ==="
curl -s "$BASE_URL/api/element/exists?selector=.cds--content" \
  | jq '.success, .exists, .visible'

echo ""
echo "=== 4. Query for Dashboard Header ==="
curl -s "$BASE_URL/api/element/exists?selector=h1" \
  | jq '.success, .exists, .visible, .count'

echo ""
echo "=== 5. Get Dashboard Title ==="
curl -s "$BASE_URL/api/element/text?selector=h1" \
  | jq '.success, .text'

echo ""
echo "=== 6. Check for Bio Component ==="
curl -s "$BASE_URL/api/element/exists?text=Bio" \
  | jq '.success, .exists, .count'

echo ""
echo "=== 7. Check for Jobs Component ==="
curl -s "$BASE_URL/api/element/exists?text=Jobs" \
  | jq '.success, .exists, .count'

echo ""
echo "=== 8. Capture Full Dashboard Screenshot ==="
SCREENSHOT_RESULT=$(curl -s -X POST "$BASE_URL/api/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "cv-builder-dashboard", "fullPage": true}')

echo "$SCREENSHOT_RESULT" | jq '.success, .filename, .path'
SCREENSHOT_PATH=$(echo "$SCREENSHOT_RESULT" | jq -r '.path')

sleep 1

echo ""
echo "=== 9. Capture Header Screenshot ==="
curl -s -X POST "$BASE_URL/api/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "cv-builder-header", "selector": "h1"}' \
  | jq '.success, .filename'

sleep 1

echo ""
echo "=== 10. Browser Status ==="
curl -s "$BASE_URL/health" | jq '.browser'

echo ""
echo "=== Shutting Down ==="
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ✅ CV Builder Integration Test Complete            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Screenshots saved to: ./temp/screenshots/"
echo ""

if [ -f "$SCREENSHOT_PATH" ]; then
  echo "Dashboard screenshot: $SCREENSHOT_PATH"
  ls -lh "$SCREENSHOT_PATH"
  echo ""
  echo "You can open it with:"
  echo "  open $SCREENSHOT_PATH"
else
  echo "⚠️  Screenshot file not found"
fi

echo ""
echo "=== Generating Test Report ==="
SESSION_DIR=$(find ./temp/screenshots -maxdepth 1 -type d -name "session-*" | sort -r | head -1)
if [ -n "$SESSION_DIR" ]; then
  METADATA=$(cat <<EOF
{
  "testScript": "test-cv-builder.sh",
  "targetUrl": "$APP_URL",
  "purpose": "CV Builder app component verification",
  "browser": {
    "name": "Chromium",
    "engine": "Playwright",
    "headless": false
  },
  "phase": "2",
  "features": ["local-app-navigation", "component-verification", "element-screenshot", "wait-for-load"],
  "prerequisites": ["CV Builder app running on port 3000", "Browser automation service running on port 3002"]
}
EOF
)
  ./generate-report.sh "cv-builder-test" "$SESSION_DIR" "$METADATA"
  echo "Report: $SESSION_DIR/report.json"
else
  echo "⚠️  No session directory found"
fi
