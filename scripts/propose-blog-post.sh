#!/bin/bash

# Blog Post Proposer - Manual Invocation Script
# Usage: ./scripts/propose-blog-post.sh <PR_NUMBER> [--force]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PR number provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: PR number required${NC}"
    echo "Usage: $0 <PR_NUMBER> [--force]"
    echo ""
    echo "Examples:"
    echo "  $0 57                # Analyze PR #57"
    echo "  $0 57 --force        # Force analysis even if score is low"
    exit 1
fi

PR_NUMBER=$1
FORCE=${2:-""}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is required${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not logged in to GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${BLUE}=== Blog Post Proposer ===${NC}"
echo -e "Analyzing PR #${PR_NUMBER}..."
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Get PR information
echo -e "${YELLOW}→${NC} Fetching PR details..."
gh pr view $PR_NUMBER --json title,body,author,commits,additions,deletions,changedFiles,state,merged > $TEMP_DIR/pr_info.json

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to fetch PR #${PR_NUMBER}${NC}"
    exit 1
fi

# Extract PR metadata
PR_TITLE=$(jq -r '.title' $TEMP_DIR/pr_info.json)
PR_STATE=$(jq -r '.state' $TEMP_DIR/pr_info.json)
PR_MERGED=$(jq -r '.merged' $TEMP_DIR/pr_info.json)
ADDITIONS=$(jq -r '.additions' $TEMP_DIR/pr_info.json)
DELETIONS=$(jq -r '.deletions' $TEMP_DIR/pr_info.json)
CHANGED_FILES=$(jq -r '.changedFiles' $TEMP_DIR/pr_info.json)
COMMITS=$(jq -r '.commits | length' $TEMP_DIR/pr_info.json)

echo -e "${GREEN}✓${NC} PR #${PR_NUMBER}: ${PR_TITLE}"
echo -e "  State: ${PR_STATE} | Merged: ${PR_MERGED}"
echo -e "  Changes: +${ADDITIONS} -${DELETIONS} in ${CHANGED_FILES} files (${COMMITS} commits)"
echo ""

# Get PR diff
echo -e "${YELLOW}→${NC} Fetching PR diff..."
gh pr diff $PR_NUMBER > $TEMP_DIR/pr_diff.txt 2>/dev/null || true

DIFF_SIZE=$(wc -l < $TEMP_DIR/pr_diff.txt)
echo -e "${GREEN}✓${NC} Diff: ${DIFF_SIZE} lines"
echo ""

# Get related issues
echo -e "${YELLOW}→${NC} Finding related issues..."
gh pr view $PR_NUMBER --json body --jq '.body' | grep -oP '#\d+' | sort -u > $TEMP_DIR/related_issues.txt || true

RELATED_COUNT=$(wc -l < $TEMP_DIR/related_issues.txt)
if [ $RELATED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found ${RELATED_COUNT} related issue(s):"
    cat $TEMP_DIR/related_issues.txt | sed 's/^/  - /'
    echo ""
fi

# Prepare agent prompt
echo -e "${YELLOW}→${NC} Preparing agent prompt..."

EVENT_TYPE="manual"
if [ "$PR_MERGED" = "true" ]; then
    EVENT_TYPE="merge"
elif [ "$PR_STATE" = "OPEN" ]; then
    EVENT_TYPE="open"
fi

cat > $TEMP_DIR/agent_prompt.md << EOF
# Blog Post Proposer Analysis

You are the Blog Post Proposer Agent analyzing PR #${PR_NUMBER}.

## PR Information

**Title**: ${PR_TITLE}
**State**: ${PR_STATE}
**Merged**: ${PR_MERGED}
**Event**: ${EVENT_TYPE}

**Changes**:
- Additions: +${ADDITIONS}
- Deletions: -${DELETIONS}
- Files changed: ${CHANGED_FILES}
- Commits: ${COMMITS}

**Related Issues**: $(cat $TEMP_DIR/related_issues.txt | tr '\n' ' ')

## Your Task

1. **Read the PR diff** (available in pr_diff.txt)
2. **Calculate blog-worthiness score** (1-10) using the criteria:
   - Impact (1-3): Performance, cost, security, features
   - Complexity (1-3): Code changes, architecture
   - Educational value (1-3): Lessons, patterns, best practices
   - Novelty (0-1): Unique or creative solution

3. **If score >= 5** (or --force flag used):
   - Create proposal in \`docs/blog/proposals/$(date +%Y-%m-%d)-pr-${PR_NUMBER}-<slug>.md\`
   - Use template from \`docs/blog/_proposal-template.md\`
   - Fill in ALL sections with specific details
   - Include code examples with file paths and line numbers
   - Propose metrics, diagrams, and structure

4. **If score < 5**:
   - Create brief analysis explaining why
   - Save to \`docs/blog/proposals/$(date +%Y-%m-%d)-pr-${PR_NUMBER}-analysis.txt\`

5. **Generate summary**:
   - Save to \`summary.txt\` for console output

## Available Files

- \`pr_info.json\`: PR metadata
- \`pr_diff.txt\`: Full PR diff (${DIFF_SIZE} lines)
- \`related_issues.txt\`: Related issue numbers

## Existing Blog Posts

Check \`docs/blog/\` for existing posts to avoid duplication or propose updates.

Existing articles:
$(ls -1 docs/blog/*.md 2>/dev/null | grep -v "README\|_template\|_proposal" | sed 's/^/- /' || echo "- None yet")

## Output Files

Create:
1. \`docs/blog/proposals/$(date +%Y-%m-%d)-pr-${PR_NUMBER}-<slug>.md\` (proposal)
2. \`summary.txt\` (for console)
3. \`score.txt\` (just the number 1-10)

---

**Force Mode**: ${FORCE:+ENABLED}

$(if [ -n "$FORCE" ]; then echo "Note: Force mode is enabled. Create a proposal regardless of score."; fi)

Now analyze PR #${PR_NUMBER} and create your proposal!
EOF

echo -e "${GREEN}✓${NC} Agent prompt ready"
echo ""

# Show agent invocation hint
echo -e "${BLUE}=== Next Step: Invoke Agent ===${NC}"
echo ""
echo "To invoke the blog post proposer agent, run:"
echo ""
echo -e "  ${GREEN}claude ${NC}--file $TEMP_DIR/agent_prompt.md \\"
echo "         --file $TEMP_DIR/pr_info.json \\"
echo "         --file $TEMP_DIR/pr_diff.txt \\"
echo "         --agent blog-post-proposer"
echo ""
echo "Or use Claude Code:"
echo ""
echo -e "  ${GREEN}agent:blog-post-proposer${NC}"
echo "  Then paste: Analyze PR #${PR_NUMBER}"
echo ""

# If in CI or automation, auto-invoke
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
    echo -e "${YELLOW}→${NC} Auto-invoking agent (CI mode)..."

    # TODO: Add actual Claude Code invocation here
    # For now, create placeholder

    DATE=$(date +%Y-%m-%d)
    SLUG=$(echo "$PR_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | cut -c1-50)
    PROPOSAL_FILE="docs/blog/proposals/${DATE}-pr-${PR_NUMBER}-${SLUG}.md"

    echo "8" > score.txt
    mkdir -p docs/blog/proposals

    cat > "$PROPOSAL_FILE" << 'PROPOSAL_EOF'
# Blog Post Proposal: [Title Generated by Agent]

**Proposed by**: Blog Post Proposer Agent
**Date**: $(date +%Y-%m-%d)
**PR**: #${PR_NUMBER}
**Status**: 📝 Proposal

[Agent would fill this in with actual analysis...]

PROPOSAL_EOF

    echo -e "${GREEN}✓${NC} Proposal created: ${PROPOSAL_FILE}"
else
    # Interactive mode
    echo -e "${YELLOW}Temporary files available at:${NC}"
    echo -e "  ${TEMP_DIR}"
    echo ""
    echo "Press Enter to continue (files will be deleted on exit)..."
    read
fi

echo -e "${GREEN}Done!${NC}"
