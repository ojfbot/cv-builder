#!/bin/bash

# Generate report.json for screenshot test runs
# Usage: ./generate-report.sh <test-name> <output-dir> [additional-metadata-json]

set -e

TEST_NAME="$1"
OUTPUT_DIR="$2"
ADDITIONAL_METADATA="${3:-{}}"

if [ -z "$TEST_NAME" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Usage: $0 <test-name> <output-dir> [additional-metadata-json]"
  exit 1
fi

REPORT_FILE="$OUTPUT_DIR/report.json"
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_TIME=$(date +"%H:%M:%S")

# Get screenshot files and their sizes
SCREENSHOTS="[]"
if [ -d "$OUTPUT_DIR" ]; then
  SCREENSHOTS=$(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | sort | jq -R -s '
    split("\n") |
    map(select(length > 0)) |
    map({
      filename: (split("/") | last),
      path: .,
      size: 0
    })
  ')
fi

# Generate base report structure
cat > "$REPORT_FILE" << EOF
{
  "testName": "$TEST_NAME",
  "testDate": "$CURRENT_DATE",
  "testTime": "$CURRENT_TIME",
  "generatedBy": "generate-report.sh",
  "outputDir": "$OUTPUT_DIR",
  "screenshots": $SCREENSHOTS,
  "status": "completed",
  "errors": [],
  "metadata": $ADDITIONAL_METADATA,
  "annotations": []
}
EOF

# Get actual file sizes and update the report
if command -v python3 &> /dev/null; then
  python3 << 'PYTHON_SCRIPT' "$REPORT_FILE"
import json
import sys
import os

report_file = sys.argv[1]

with open(report_file, 'r') as f:
    report = json.load(f)

# Update screenshot sizes
for screenshot in report.get('screenshots', []):
    filepath = screenshot.get('path')
    if filepath and os.path.exists(filepath):
        size_bytes = os.path.getsize(filepath)
        # Format size in KB
        size_kb = size_bytes / 1024
        screenshot['size'] = f"{size_kb:.1f}KB"
        screenshot['sizeBytes'] = size_bytes

with open(report_file, 'w') as f:
    json.dump(report, f, indent=2)

print(f"✅ Report generated: {report_file}")
PYTHON_SCRIPT
else
  echo "⚠️  Python3 not found - file sizes will not be calculated"
  echo "✅ Report generated: $REPORT_FILE"
fi

chmod 644 "$REPORT_FILE"
