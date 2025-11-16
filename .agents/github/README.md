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
