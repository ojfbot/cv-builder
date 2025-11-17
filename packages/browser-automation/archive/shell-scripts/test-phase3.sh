#!/bin/bash

# Test script for Phase 3 features
# Tests advanced screenshots, interactions, and waiting strategies

set -e

BASE_URL="http://localhost:3002"
API_URL="${BASE_URL}/api"
TEST_APP_URL="http://example.com"

echo "=========================================="
echo "  Browser Automation - Phase 3 Tests"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed() {
  echo -e "${GREEN}✓${NC} $1"
}

test_failed() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

test_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Check if service is running
test_info "Checking if service is running..."
if ! curl -s "${BASE_URL}/health" > /dev/null; then
  test_failed "Service is not running at ${BASE_URL}"
fi
test_passed "Service is running"

echo ""
echo "=========================================="
echo "  1. Advanced Screenshot Tests"
echo "=========================================="
echo ""

# Navigate to example.com
test_info "Navigating to ${TEST_APP_URL}..."
curl -s -X POST "${API_URL}/navigate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${TEST_APP_URL}\"}" > /dev/null
test_passed "Navigation successful"

# Test viewport screenshot (desktop)
test_info "Testing desktop viewport screenshot..."
RESPONSE=$(curl -s -X POST "${API_URL}/screenshot" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-viewport-desktop",
    "viewport": "desktop",
    "sessionDir": "temp/screenshots/phase3-test"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Desktop viewport screenshot captured"
else
  test_failed "Desktop viewport screenshot failed: $RESPONSE"
fi

# Test viewport screenshot (mobile)
test_info "Testing mobile viewport screenshot..."
RESPONSE=$(curl -s -X POST "${API_URL}/screenshot" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-viewport-mobile",
    "viewport": "mobile",
    "sessionDir": "temp/screenshots/phase3-test"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Mobile viewport screenshot captured"
else
  test_failed "Mobile viewport screenshot failed: $RESPONSE"
fi

# Test JPEG format with quality
test_info "Testing JPEG screenshot with quality..."
RESPONSE=$(curl -s -X POST "${API_URL}/screenshot" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-jpeg-quality",
    "format": "jpeg",
    "quality": 80,
    "sessionDir": "temp/screenshots/phase3-test"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "JPEG screenshot with quality captured"
else
  test_failed "JPEG screenshot failed: $RESPONSE"
fi

# Test element screenshot
test_info "Testing element screenshot..."
RESPONSE=$(curl -s -X POST "${API_URL}/screenshot" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-element",
    "selector": "h1",
    "fullPage": false,
    "sessionDir": "temp/screenshots/phase3-test"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Element screenshot captured"
else
  test_failed "Element screenshot failed: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "  2. User Interaction Tests"
echo "=========================================="
echo ""

# Test click interaction
test_info "Testing click interaction..."
RESPONSE=$(curl -s -X POST "${API_URL}/interact/click" \
  -H "Content-Type: application/json" \
  -d '{
    "selector": "a",
    "options": {
      "timeout": 5000
    }
  }')

if echo "$RESPONSE" | grep -q '"elementFound":true'; then
  test_passed "Click interaction successful"
else
  test_failed "Click interaction failed: $RESPONSE"
fi

# Navigate back to example.com for hover test
curl -s -X POST "${API_URL}/navigate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${TEST_APP_URL}\"}" > /dev/null

# Test hover interaction
test_info "Testing hover interaction..."
RESPONSE=$(curl -s -X POST "${API_URL}/interact/hover" \
  -H "Content-Type: application/json" \
  -d '{
    "selector": "h1",
    "options": {
      "timeout": 5000
    }
  }')

if echo "$RESPONSE" | grep -q '"elementFound":true'; then
  test_passed "Hover interaction successful"
else
  test_failed "Hover interaction failed: $RESPONSE"
fi

# Test key press
test_info "Testing key press..."
RESPONSE=$(curl -s -X POST "${API_URL}/interact/press" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "Escape"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Key press successful"
else
  test_failed "Key press failed: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "  3. Waiting Strategy Tests"
echo "=========================================="
echo ""

# Test wait for selector
test_info "Testing wait for selector..."
RESPONSE=$(curl -s -X POST "${API_URL}/wait/element" \
  -H "Content-Type: application/json" \
  -d '{
    "selector": "h1",
    "state": "visible",
    "timeout": 5000
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Wait for selector successful"
else
  test_failed "Wait for selector failed: $RESPONSE"
fi

# Test wait for load state
test_info "Testing wait for load state..."
RESPONSE=$(curl -s -X POST "${API_URL}/wait/load" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "load",
    "timeout": 5000
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Wait for load state successful"
else
  test_failed "Wait for load state failed: $RESPONSE"
fi

# Test simple timeout wait
test_info "Testing timeout wait..."
RESPONSE=$(curl -s -X POST "${API_URL}/wait" \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "timeout",
    "value": "1000"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Timeout wait successful"
else
  test_failed "Timeout wait failed: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "  4. Session Management Tests"
echo "=========================================="
echo ""

# Check session status
test_info "Checking session status..."
RESPONSE=$(curl -s "${BASE_URL}/health")

if echo "$RESPONSE" | grep -q '"session"'; then
  test_passed "Session tracking active"
else
  test_failed "Session tracking not found: $RESPONSE"
fi

# List screenshot sessions
test_info "Listing screenshot sessions..."
RESPONSE=$(curl -s "${API_URL}/screenshot/sessions")

if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Session listing successful"
else
  test_failed "Session listing failed: $RESPONSE"
fi

echo ""
echo "=========================================="
echo "  All Phase 3 Tests Passed! ✓"
echo "=========================================="
echo ""
echo "Screenshots saved to: temp/screenshots/phase3-test/"
