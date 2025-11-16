# GitHub Agents

This directory contains agents that automate GitHub workflow tasks.

## Available Agents

### issue-manager

**Purpose:** Comprehensive GitHub issue lifecycle management with automatic label validation.

**Key Features:**
- **Create issues** with automatic label validation and creation
- **Validate labels** against existing repository labels
- **Suggest colors/descriptions** for missing labels using industry conventions
- **Annotate issues** with intelligent codebase analysis
- **Manage lifecycle** (update, close, bulk operations)
- **User approval** for all label creation operations

**When to Use:**
- Creating new issues (with or without labels)
- Adding implementation context to existing issues
- Managing issue lifecycle
- Need automatic label validation and creation

**How to Invoke:**
Simply ask Claude Code to work with issues:
- "Create an issue for browser automation with labels: enhancement, tooling, docker"
- "Make a new issue about performance with labels: performance, priority:high"
- "Annotate issue #33 with implementation details"
- "Close issue #25 with summary"

**Create Workflow (with Label Validation):**
1. Gather issue title, body, and requested labels
2. Fetch existing labels from GitHub
3. Identify which labels exist and which are missing
4. For each missing label:
   - Suggest appropriate color (based on conventions below)
   - Suggest description
   - Ask user for approval via AskUserQuestion
5. Create approved labels
6. Create issue with validated labels
7. Report results (issue URL + labels created)

**Label Color Conventions:**

The agent uses these standard color schemes:

**Type Labels:**
- `bug` - #d73a4a (red)
- `enhancement` - #a2eeef (light blue)
- `feature` - #0e8a16 (green)
- `documentation` - #0075ca (blue)
- `refactor` - #fbca04 (yellow)

**Priority Labels:**
- `priority:high` / `critical` - #b60205 (dark red)
- `priority:medium` - #fbca04 (yellow)
- `priority:low` - #c5def5 (light blue)

**Category Labels:**
- `tooling` - #1d76db (medium blue)
- `testing` - #bfe5bf (light green)
- `ci-cd` - #5319e7 (purple)
- `docker` - #0db7ed (docker blue)
- `security` - #ee0701 (red)
- `performance` - #f9d0c4 (light orange)
- `ui` - #e99695 (pink)
- `api` - #d4c5f9 (light purple)
- `agent` - #c2e0c6 (mint green)

**Status Labels:**
- `in-progress` - #fbca04 (yellow)
- `blocked` - #d93f0b (orange-red)
- `ready` - #0e8a16 (green)
- `needs-review` - #ededed (light gray)

**Size Labels:**
- `size:small` - #c2e0c6 (light green) - < 1 day
- `size:medium` - #fbca04 (yellow) - 1-2 days
- `size:large` - #f9d0c4 (light orange) - 3-5 days
- `size:xl` - #e99695 (pink) - > 5 days

**Example Usage:**

```
You: Create an issue titled "Add browser automation tool" with labels: enhancement, tooling, docker

issue-manager agent:
🔍 Validating labels...
✅ Label "enhancement" exists
❌ Label "tooling" does not exist
❌ Label "docker" does not exist

[Prompts via AskUserQuestion]
Create label "tooling"?
- Color: #1d76db
- Description: Development tools and infrastructure
[User approves]

Create label "docker"?
- Color: #0db7ed
- Description: Docker and containerization
[User approves]

✅ Created label "tooling"
✅ Created label "docker"

📝 Creating issue...
✅ Issue created successfully!
🔗 https://github.com/ojfbot/cv-builder/issues/17

Summary:
- Created new labels: tooling, docker
- Issue #17 created with 3 labels: enhancement, tooling, docker
```

**Permissions Required:**
- GitHub CLI (`gh`) installed and authenticated
- Repository access with permission to create labels
- Repository access with permission to create issues

**Configuration:**
All configuration is embedded in `issue-manager.json`:
- `require_label_approval: true` - Always ask before creating labels
- `validate_labels_before_creation: true` - Check labels before issue creation
- `suggest_label_colors: true` - Use standard color conventions
- `require_user_approval: true` - Confirm all actions

---

### pr-manager

**Purpose:** Pull request workflow automation with intelligent change analysis and issue linking.

**Key Features:**
- **Create PRs** with automatic change analysis
- **Cross-reference** PRs with issues
- **Analyze changes** and categorize files
- **Generate summaries** with proper formatting
- **Validate PRs** against issue requirements

**When to Use:**
- Creating new pull requests
- Linking PRs to issues
- Validating PR completeness

**How to Invoke:**
Simply ask Claude Code to work with pull requests:
- "Create a PR for issue #33"
- "Make a pull request for this feature"
- "Cross-reference PR #22 with issue #18"

**Image Embedding in PR Descriptions:**

When creating PRs that include screenshots or images, follow these guidelines:

**Option 1: Commit images to repository (Recommended for documentation)**
1. Store images in appropriate directory (e.g., `docs/images/`, `packages/*/docs/images/`)
2. Commit images to the branch
3. Use raw GitHub URLs in PR description:
   ```markdown
   ![Description](https://raw.githubusercontent.com/OWNER/REPO/BRANCH/path/to/image.png)
   ```

**Option 2: Upload via GitHub web UI**
1. Edit PR description on GitHub
2. Drag and drop images into the text area
3. GitHub will generate URLs like: `https://github.com/user-attachments/assets/...`
4. Copy the generated markdown

**Best Practices:**
- Use descriptive alt text for accessibility
- For temporary screenshots (in `temp/`), copy to a permanent location first
- Prefer Option 1 for documentation screenshots that should be version-controlled
- Use relative paths for images that might be viewed locally: `![Alt](./docs/images/screenshot.png)`

**Example:**
```markdown
## Screenshots

### Dashboard View
![CV Builder Dashboard](https://raw.githubusercontent.com/ojfbot/cv-builder/main/packages/browser-automation/docs/images/cv-builder-dashboard.png)

The automation captured the complete dashboard showing all navigation elements.
```

**Permissions Required:**
- GitHub CLI (`gh`) installed and authenticated
- Repository write access
- Branch push permissions

---

### screenshot-commenter

**Purpose:** Attach screenshots from temporary directories to GitHub PR or issue comments.

**Key Features:**
- **Find screenshots** in temp directories (gitignored files)
- **Copy to docs** for permanent storage
- **Commit and push** screenshot files automatically
- **Generate markdown** with raw GitHub URLs
- **Post comment** with embedded images to PR or issue

**When to Use:**
- Documenting visual changes in PRs
- Attaching test screenshots to issues
- Adding browser automation captures
- Including UI screenshots for review

**How to Invoke:**
Simply ask Claude Code to attach screenshots:
- "Attach screenshots from temp to PR #22"
- "Add screenshots to issue #18"
- "Post browser automation screenshots to PR"

**How It Works:**

The agent uses a Node.js script that:
1. Finds all image files (`.png`, `.jpg`, `.jpeg`, `.gif`) in the specified directory
2. Extracts metadata (capture time, file size, session info)
3. Generates intelligent context based on filename patterns
4. Copies files to `packages/*/temp/pr-<number>/` for PR-specific documentation
5. Commits and pushes the files to the current branch
6. Generates a rich markdown comment with:
   - Screenshot image embeds (GitHub blob URLs)
   - **What:** Description of what the screenshot shows
   - **Why:** Reason for including this screenshot
   - **When:** Development phase when it was captured
   - **Captured:** Timestamp from session directory
   - **Size:** File size and session identifier
7. Posts the comment using `gh pr comment` or `gh issue comment`

**Context Generation:**

The agent intelligently generates context based on filename patterns:
- `*dashboard*` → Describes complete interface layout
- `*header*` → Explains navigation and element-specific capture
- `*example*homepage*` → Validates full-page functionality
- `*example*h1*` → Demonstrates element selector capability
- `*error*` / `*fail*` → Documents error states for debugging
- `*test*` → Explains test results or validation
- `*before*` / `*after*` → Visual comparison for change validation
- Generic fallback for other patterns

**Why This Approach:**
- GitHub doesn't have an official API for uploading images to comments
- Committing images to `temp/pr-<number>/` makes them accessible via GitHub URLs
- PR-specific directories organize screenshots by pull request
- Rich context helps reviewers understand each screenshot's purpose
- Metadata provides traceability (when captured, file size, session)
- Temporary test screenshots in `temp/screenshots/` remain gitignored

**Example Usage:**

```bash
# Using the script directly
node .agents/github/scripts/upload-screenshots.cjs 22 packages/browser-automation/temp/screenshots

# Or ask Claude Code
"Attach screenshots from packages/browser-automation/temp/screenshots to PR #22"
```

**Output:**
- Creates comment with embedded images
- Returns comment URL: `https://github.com/OWNER/REPO/pull/22#issuecomment-...`
- Lists all attached screenshots

**Script Location:**
`.agents/github/scripts/upload-screenshots.cjs`

**Permissions Required:**
- GitHub CLI (`gh`) installed and authenticated
- Git push access to repository
- Write access to `docs/images/` directories

---

## Adding New GitHub Agents

When creating new GitHub agents:

1. Create JSON definition in `.agents/github/`
2. Add entry to `.agents/registry.json`
3. Define clear system prompt
4. Specify required permissions
5. Include usage examples
6. Document in this README

## GitHub CLI Requirements

All GitHub agents require:
- GitHub CLI (`gh`) version 2.0.0+
- Authenticated session (`gh auth login`)
- Repository access

Verify with:
```bash
gh --version
gh auth status
```
