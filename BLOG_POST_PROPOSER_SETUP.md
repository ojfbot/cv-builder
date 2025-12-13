# Blog Post Proposer Agent - Complete Setup Guide

**Created**: 2025-12-11
**Status**: ✅ Complete and ready to use

---

## Overview

The Blog Post Proposer Agent is an automated system that analyzes pull requests and generates detailed blog post proposals. It runs automatically in CI/CD and can also be invoked manually.

**Purpose**: Ensure significant technical work gets documented as developer blog posts without manual effort.

**How it works**:
1. PR is opened → Agent analyzes changes
2. Calculates blog-worthiness score (1-10)
3. If score ≥ 5, generates detailed proposal
4. Posts comment on PR with recommendation
5. On merge, updates proposal with final metrics

---

## Files Created

### 1. Agent Definition
**File**: `.agents/blog-post-proposer.md`

Comprehensive agent definition that explains:
- When to propose blog posts (HIGH/MEDIUM/LOW priority)
- Blog-worthiness scoring system (1-10)
- Analysis process (read PR, assess impact, generate proposal)
- Output format (new posts vs updates to existing)
- Integration with existing blog outlines
- Examples from CV Builder history (PR #57, #62, #56)

**Size**: ~12,500 words
**Sections**: 15 major sections with detailed instructions

---

### 2. Proposal Template
**File**: `docs/blog/_proposal-template.md`

Structured template for blog post proposals containing:
- Quick summary and impact metrics
- Blog-worthiness score breakdown
- Proposed article outline (with word counts)
- Hook options (multiple variations)
- Code examples to include (with file paths)
- Diagrams to create
- Key metrics to highlight
- Related PRs/issues
- Writing style recommendations
- Priority and timeline
- Review checklist
- Agent analysis metadata

**Sections**: 15 key sections, fully structured

---

### 3. GitHub Actions Workflow
**File**: `.github/workflows/blog-post-proposer.yml`

Automated workflow that runs on:
- PR opened/updated/reopened
- PR closed (if merged)
- Manual workflow dispatch

**Features**:
- Fetches PR metadata and diff
- Identifies related issues
- Invokes blog post proposer agent
- Creates proposal file in `docs/blog/proposals/`
- Posts comment on PR with score and recommendation
- Skips draft PRs (unless merged)
- Ignores docs-only changes
- Supports force mode for manual runs

**Steps**: 10 workflow steps with error handling

---

### 4. Helper Script
**File**: `scripts/propose-blog-post.sh`

Bash script for manual invocation:
- Takes PR number as argument
- Fetches PR details via GitHub CLI
- Analyzes changes and metadata
- Prepares agent prompt with context
- Shows invocation instructions
- Supports `--force` flag for low-priority PRs

**Usage**:
```bash
./scripts/propose-blog-post.sh 57          # Analyze PR #57
./scripts/propose-blog-post.sh 57 --force  # Force analysis
```

**Dependencies**: GitHub CLI (`gh`)

---

### 5. Proposals Directory README
**File**: `docs/blog/proposals/README.md`

Documentation for the proposals directory:
- Explains directory structure
- Documents proposal lifecycle
- Shows scoring criteria with examples
- Provides manual invocation methods
- Includes example proposals
- Tips for writers, reviewers, maintainers
- Integration with CI/CD
- How to disable the agent

**Size**: ~2,500 words

---

### 6. Updated CLAUDE.md
**File**: `CLAUDE.md` (updated)

Added blog-post-proposer agent to the "Available Agents" section with usage examples.

---

## Blog-Worthiness Scoring System

### Score Calculation

```
Score = Impact (1-3) + Complexity (1-3) + Educational Value (1-3) + Novelty (0-1)

Maximum Score: 10
Minimum Score: 3
```

### Impact Score (1-3)

- **3 = Major**:
  - >$10,000/year savings
  - >50% performance improvement
  - Critical security enhancement
  - Major feature launch

- **2 = Moderate**:
  - $1,000-$10,000/year savings
  - 10-50% performance improvement
  - Important feature
  - Significant bug fix

- **1 = Minor**:
  - <$1,000/year savings
  - <10% performance improvement
  - Small enhancement

### Complexity Score (1-3)

- **3 = High**:
  - Multi-package changes
  - Architectural shifts
  - >1,000 lines changed
  - Deep refactoring

- **2 = Medium**:
  - Single package changes
  - Moderate refactor
  - 100-1,000 lines
  - New feature implementation

- **1 = Low**:
  - Simple changes
  - <100 lines
  - Straightforward fix

### Educational Value (1-3)

- **3 = High**:
  - Novel solution
  - Reusable patterns
  - Best practices demonstrated
  - Significant lessons learned

- **2 = Medium**:
  - Interesting approach
  - Some lessons learned
  - Could help others

- **1 = Low**:
  - Routine implementation
  - Standard patterns
  - Limited learning value

### Novelty Bonus (0-1)

- **1 = Bonus**: Unique or creative solution
- **0 = Standard**: Standard approach

### Priority Thresholds

- **≥7**: 🔴 HIGH priority (must write blog post)
- **5-6**: 🟡 MEDIUM priority (should consider)
- **3-4**: 🟢 LOW priority (optional)
- **≤2**: ⚪ SKIP (not blog-worthy)

---

## Historical Examples

### Example 1: Issue #12 (PR #57)
**Title**: Building Production-Ready Document Processing with AI

**Score**: 10/10 🔴

**Breakdown**:
- Impact: 3 (4 bugs fixed, 80% perf improvement, $109k/year cost prevention)
- Complexity: 3 (multi-package, architectural changes)
- Educational: 3 (novel patterns, comprehensive lessons)
- Novelty: 1 (unique approach to streaming)

**Result**: Full 3,500-word blog post proposed

---

### Example 2: Visual Regression (PR #62)
**Title**: Visual Regression Testing at Scale

**Score**: 8/10 🟡

**Breakdown**:
- Impact: 2 ($59k/year value, 11.5 hours/week saved)
- Complexity: 2 (new package, moderate scope)
- Educational: 3 (reusable testing patterns)
- Novelty: 1 (git-tracked baselines unique)

**Result**: Full 3,000-word blog post proposed

---

### Example 3: Monorepo Modernization (PR #56)
**Title**: Our npm to pnpm Migration Story

**Score**: 7/10 🔴

**Breakdown**:
- Impact: 2 ($21k/year time savings, 40% faster installs)
- Complexity: 2 (infrastructure change, Docker updates)
- Educational: 3 (migration guide valuable)
- Novelty: 0 (standard migration)

**Result**: Full 2,500-word blog post proposed

---

### Example 4: README Typo Fix (hypothetical)
**Title**: N/A

**Score**: 3/10 ⚪

**Breakdown**:
- Impact: 1 (minor documentation fix)
- Complexity: 1 (simple text changes)
- Educational: 1 (no lessons)
- Novelty: 0

**Result**: SKIP (not blog-worthy)

---

## How to Use

### Automatic (Recommended)

The agent runs automatically when:

1. **PR is opened**:
   - Agent analyzes changes
   - Calculates score
   - Creates proposal if score ≥ 5
   - Posts comment on PR

2. **PR is merged**:
   - Agent updates proposal with final metrics
   - Changes status to "Ready to Draft"
   - Suggests updates to related blog posts

**No action needed** - it just works!

---

### Manual Invocation

#### Method 1: Helper Script

```bash
# From repository root
./scripts/propose-blog-post.sh <PR_NUMBER>

# Examples
./scripts/propose-blog-post.sh 57
./scripts/propose-blog-post.sh 57 --force  # Force even if score < 5
```

#### Method 2: GitHub Actions

1. Go to Actions → Blog Post Proposer
2. Click "Run workflow"
3. Enter PR number
4. (Optional) Check "force" to bypass score threshold
5. Click "Run workflow"

#### Method 3: Claude Code Agent

```bash
# In terminal or IDE
agent:blog-post-proposer

# Then provide prompt
Analyze PR #57 and propose a blog post
```

---

## Proposal Lifecycle

### Stage 1: Initial Proposal (📝)

**Trigger**: PR opened

**Agent creates**:
- Proposal file in `docs/blog/proposals/YYYY-MM-DD-pr-<NUMBER>-<slug>.md`
- PR comment with score and recommendation
- Initial outline with estimated metrics

**Team action**: Review proposal, verify scope

---

### Stage 2: Drafting (✍️)

**Trigger**: Proposal approved

**Writer (human or agent)**:
- Uses proposal outline as structure
- Includes identified code examples
- Creates suggested diagrams
- Follows word count targets

**File**: Begin drafting in `docs/blog/<XX>-<slug>.md`

---

### Stage 3: Review (📊)

**Trigger**: Draft complete

**Reviewers**:
- Check technical accuracy
- Verify metrics
- Test code examples
- Proofread for clarity

**Updates**: Make revisions based on feedback

---

### Stage 4: Ready to Publish (✅)

**Trigger**: PR merged

**Agent updates**:
- Final performance metrics
- Links to merged PR
- Status change to "Ready to Draft"

**Team action**: Publish article, update proposal status

---

## File Locations

```
cv-builder/
├── .agents/
│   └── blog-post-proposer.md           # Agent definition
├── .github/
│   └── workflows/
│       └── blog-post-proposer.yml       # CI/CD workflow
├── docs/
│   └── blog/
│       ├── README.md                    # Blog index
│       ├── _template.md                 # Article template
│       ├── _proposal-template.md        # Proposal template
│       ├── proposals/
│       │   ├── README.md                # Proposals guide
│       │   └── YYYY-MM-DD-pr-*.md       # Generated proposals
│       ├── 01-document-processing-with-ai-OUTLINE.md
│       ├── 02-visual-regression-testing-OUTLINE.md
│       ├── 03-monorepo-modernization-OUTLINE.md
│       ├── 04-secure-ai-architecture-OUTLINE.md
│       └── 05-react-performance-optimization-OUTLINE.md
├── scripts/
│   └── propose-blog-post.sh             # Helper script
└── CLAUDE.md                            # Project guide (updated)
```

---

## Configuration

### Disable for Specific PR

Add to PR description:
```markdown
<!-- skip-blog-proposal -->
```

### Adjust Paths to Ignore

Edit `.github/workflows/blog-post-proposer.yml`:

```yaml
paths-ignore:
  - '**.md'          # Ignore all markdown changes
  - 'docs/**'        # Ignore docs directory
  - '.github/**'     # Ignore workflow changes
  - 'tests/**'       # Add: ignore test-only changes
```

### Change Score Threshold

Edit agent definition (`.agents/blog-post-proposer.md`):

```markdown
Threshold:
  ≥7: HIGH priority
  5-6: MEDIUM priority  # Could change to ≥6 to be more selective
  3-4: LOW priority
  ≤2: SKIP
```

---

## Integration with Existing Blog Outlines

The agent references these existing outlines:

1. `01-document-processing-with-ai-OUTLINE.md` - Feature implementation pattern
2. `02-visual-regression-testing-OUTLINE.md` - Testing infrastructure pattern
3. `03-monorepo-modernization-OUTLINE.md` - Tooling/infrastructure pattern
4. `04-secure-ai-architecture-OUTLINE.md` - Security pattern
5. `05-react-performance-optimization-OUTLINE.md` - Performance pattern

**When proposing**: Agent recommends which outline structure to follow based on PR content type.

---

## Workflow Diagram

```
┌─────────────────┐
│   PR Opened     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Analyzes  │ ← Reads PR diff, metadata, related issues
│ • Calculate     │
│   score         │
│ • Assess impact │
│ • Check exist-  │
│   ing posts     │
└────────┬────────┘
         │
    score ≥ 5?
    ┌────┴────┐
    │YES      │NO
    ▼         ▼
┌─────────┐ ┌─────────────┐
│Create   │ │Post "SKIP"  │
│Proposal │ │comment      │
│         │ └─────────────┘
│• Write  │
│  file   │
│• Post   │
│  comment│
└────┬────┘
     │
     ▼
┌─────────────────┐
│  Team Reviews   │
│  • Approve      │
│  • Adjust       │
│  • Start draft  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PR Merged     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Updates   │
│ • Final metrics │
│ • Status →      │
│   "Ready"       │
│ • Link PR       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Article Draft   │
│ • Use outline   │
│ • Add examples  │
│ • Verify metrics│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Publish      │
└─────────────────┘
```

---

## Maintenance

### Periodic Tasks

**Monthly**:
- Review proposals directory
- Archive or delete published proposals
- Update existing articles based on merge updates
- Check if scoring criteria need adjustment

**Quarterly**:
- Analyze which PRs got blog posts
- Adjust thresholds if too many/few proposals
- Update agent definition based on learnings
- Review and update blog outlines

### Troubleshooting

**Issue**: Agent not running on PR

**Solution**: Check:
- Is PR a draft? (agent skips drafts)
- Does PR only change docs? (paths-ignore)
- Does PR description have `<!-- skip-blog-proposal -->`?

---

**Issue**: Score seems wrong

**Solution**:
- Review scoring criteria in agent definition
- Check if related PRs should be grouped
- Use `--force` flag to generate proposal anyway
- Open issue if scoring logic needs adjustment

---

**Issue**: Proposal missing details

**Solution**:
- Ensure PR description has adequate context
- Link related issues in PR description
- Add metrics to PR description or commits
- Agent can only work with available information

---

## Success Metrics

Track these to measure agent effectiveness:

- **Proposals generated**: How many per month?
- **Proposals published**: What % get written?
- **Average score**: Are we proposing the right work?
- **Time to publish**: How long from proposal to article?
- **Reader engagement**: Are articles valuable?

**Target**:
- 2-4 proposals per month
- 60%+ proposal→publish rate
- Average score 7+ for published articles
- <30 days proposal to publication
- 10+ min average read time

---

## Future Enhancements

Possible improvements:

1. **Auto-drafting**: Agent writes first draft of article
2. **Metrics extraction**: Parse code for actual performance numbers
3. **Image generation**: Create diagrams automatically
4. **SEO optimization**: Suggest titles and meta descriptions
5. **Publishing automation**: Auto-publish to blog platform
6. **Analytics integration**: Track article performance
7. **Multi-PR grouping**: Combine related PRs into single post
8. **Update detection**: Auto-update published posts with new metrics

---

## Questions or Issues?

- **Agent behavior**: See `.agents/blog-post-proposer.md`
- **Proposal format**: See `docs/blog/_proposal-template.md`
- **Workflow issues**: Check `.github/workflows/blog-post-proposer.yml`
- **Helper script**: Review `scripts/propose-blog-post.sh`
- **Examples**: See `docs/blog/proposals/README.md`

Open an issue if something isn't working as expected!

---

**Status**: ✅ Complete and operational
**Version**: 1.0
**Last Updated**: 2025-12-11
