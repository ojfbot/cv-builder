# AI Agents

This directory contains AI agent definitions that can execute workflows and commands to maintain code quality and manage the development lifecycle.

## Directory Structure

```
.agents/
├── README.md                          # This file
├── registry.json                      # Agent registry with metadata
├── quality/                           # Code quality agents
│   ├── pre-commit-validator.json     # Pre-commit validation agent
│   └── code-quality-enforcer.json    # Continuous quality enforcement
├── github/                            # GitHub workflow agents
│   ├── issue-manager.json            # Issue creation and management
│   ├── pr-manager.json               # Pull request workflow
│   └── release-manager.json          # Release and versioning
└── ci-cd/                            # CI/CD agents
    ├── build-validator.json          # Build validation
    └── deployment-orchestrator.json  # Deployment coordination
```

## What are Agents?

Agents are autonomous AI assistants that:
- Execute complex multi-step workflows
- Compose multiple commands together
- Make intelligent decisions based on context
- Maintain consistency across the codebase
- Learn from patterns in your repository

## Agent Capabilities

### Quality Agents
- **Pre-commit Validator**: Runs comprehensive checks before commits
  - Auto-formats code
  - Runs linters and type checkers
  - Executes tests
  - Analyzes commit strategy
  - Proposes semantic commit messages

- **Code Quality Enforcer**: Maintains ongoing quality standards
  - Monitors code quality metrics
  - Suggests refactoring opportunities
  - Enforces style consistency
  - Tracks technical debt

### GitHub Agents
- **Issue Manager**: Handles GitHub issue lifecycle
  - Creates formatted issues with templates
  - Adds intelligent annotations with codebase analysis
  - Bulk updates issues
  - Closes issues with proper ceremony

- **PR Manager**: Manages pull request workflow
  - Creates PRs with auto-generated summaries
  - Links issues to PRs
  - Cross-references requirements
  - Tracks PR-Issue relationships

- **Release Manager**: Coordinates releases
  - Manages version bumping
  - Generates changelogs
  - Creates release notes
  - Tags releases properly

### CI/CD Agents
- **Build Validator**: Ensures build integrity
  - Validates package configurations
  - Checks TypeScript configs
  - Verifies test coverage
  - Validates Docker setups

- **Deployment Orchestrator**: Manages deployments
  - Coordinates multi-service deployments
  - Runs smoke tests
  - Monitors health checks
  - Rollback on failures

## Using Agents

### From Claude Code (Recommended)

Claude Code can load and execute agents directly. There are several methods:

#### Method 1: Auto-discovery via CLAUDE.md
Add this to your `CLAUDE.md` file:
```markdown
## Available Agents

Claude can load and execute specialized agents from `.agents/` directory:

- `agent:pre-commit` - Run pre-commit validation
- `agent:issue-manager` - Manage GitHub issues
- `agent:pr-manager` - Handle pull requests
- `agent:quality-check` - Run quality validation
- `agent:build-validator` - Validate build configuration

To use an agent, simply say: "Run the pre-commit validator agent"
or "Use the issue manager agent to create a new issue"
```

#### Method 2: Direct invocation via chat
```
User: "Run the pre-commit validator agent"

Claude: I'll execute the pre-commit validator agent for you.
[Claude reads .agents/quality/pre-commit-validator.json]
[Claude executes the workflow defined in the agent]
[Claude reports results]
```

#### Method 3: Slash commands (if configured)
Create `.claude/commands/agent.md`:
```markdown
Load and execute an agent from the .agents/ directory.

Usage: /agent [agent-name] [options]

Examples:
- /agent pre-commit
- /agent issue-manager --dry-run
- /agent pr-manager --create "New feature"
```

Then use:
```
/agent pre-commit
```

#### Method 4: MCP Skills (Advanced)
If using MCP skills, agents can be registered as callable skills:

1. Create `.claude/skills/agents.json`:
```json
{
  "name": "agents",
  "description": "Execute project agents",
  "skills": [
    {
      "name": "pre-commit",
      "file": ".agents/quality/pre-commit-validator.json",
      "type": "agent"
    }
  ]
}
```

2. Claude can then invoke: `skill:agents:pre-commit`

### From Command Line
```bash
# Run an agent directly
pnpm agent:pre-commit

# Run with specific parameters
pnpm agent:issue-manager --create --title "New feature request"

# Dry-run mode
pnpm agent:pre-commit --dry-run
```

### From Other AI Tools (Cline, Copilot, Cursor)

#### Cline
Cline can read agent definitions and execute them:
```
User: "Run pre-commit validation"

Cline:
1. Reads .agents/registry.json
2. Finds pre-commit-validator agent
3. Loads .agents/quality/pre-commit-validator.json
4. Executes each step in the workflow
5. Reports results
```

#### GitHub Copilot
Use Copilot Chat with agent references:
```
@workspace Run the agent defined in .agents/quality/pre-commit-validator.json
```

#### Cursor
Reference agents in chat:
```
Can you execute the pre-commit validation agent from .agents/?
```

### From GitHub Actions
```yaml
- name: Run Pre-commit Validation Agent
  run: pnpm agent:pre-commit
```

## How Claude Loads Agents

### Step 1: Agent Discovery
Claude reads `registry.json` to discover available agents:
```json
{
  "agents": {
    "pre-commit-validator": {
      "file": ".agents/quality/pre-commit-validator.json",
      "category": "quality",
      "priority": "high"
    }
  }
}
```

### Step 2: Agent Definition Loading
Claude loads the agent's JSON file:
```json
{
  "name": "pre-commit-validator",
  "version": "1.0.0",
  "description": "Comprehensive pre-commit validation",
  "workflow": [
    "command:format",
    "command:lint",
    "action:analyze-changes"
  ]
}
```

### Step 3: Workflow Execution
Claude executes each step:
1. Reads command/action definitions from `.commands/` or `.actions/`
2. Resolves dependencies between steps
3. Executes in order, handling errors
4. Collects results and reports back

### Step 4: Result Reporting
Claude provides structured feedback:
```
✅ Pre-commit validation completed

Results:
- Code formatting: PASSED ✓
- Linting: PASSED ✓
- Type checking: PASSED ✓
- Tests: PASSED ✓

Commit strategy proposed:
1. feat: Add new feature X
2. test: Add tests for feature X
```

## Agent Loading Patterns for Claude

### Pattern 1: Explicit Agent Reference
```
User: "Load and run the pre-commit-validator agent"

Claude Action:
1. Read .agents/registry.json
2. Find "pre-commit-validator" entry
3. Load .agents/quality/pre-commit-validator.json
4. Execute workflow
```

### Pattern 2: Intent-based Loading
```
User: "I want to commit my changes"

Claude Action:
1. Recognize commit intent
2. Check registry for "pre-commit" or "commit" related agents
3. Suggest: "I found a pre-commit-validator agent. Should I run it?"
4. Execute if user confirms
```

### Pattern 3: Context-aware Loading
```
User: "Create a GitHub issue for this bug"

Claude Action:
1. Recognize GitHub issue intent
2. Load issue-manager agent automatically
3. Execute workflow with user's parameters
4. Report issue creation
```

### Pattern 4: Chained Agent Execution
```
User: "Validate my code and create a PR"

Claude Action:
1. Load pre-commit-validator agent → execute
2. If validation passes, load pr-manager agent → execute
3. Report combined results
```

## Claude-Specific Features

### Agent Metadata for Claude
Each agent includes Claude-specific hints:
```json
{
  "name": "pre-commit-validator",
  "claude": {
    "triggers": [
      "want to commit",
      "ready to commit",
      "run pre-commit",
      "validate before commit"
    ],
    "requires_user_confirmation": false,
    "reports_progress": true,
    "estimated_duration": "30-60 seconds",
    "user_guidance": "This agent will format, lint, type-check, and test your code before suggesting commit messages."
  }
}
```

### Interactive Mode
Agents can request user input during execution:
```json
{
  "workflow": [
    "command:lint",
    {
      "type": "user-input",
      "prompt": "Linting found 5 issues. Auto-fix?",
      "options": ["yes", "no", "review"],
      "default": "yes"
    },
    "command:lint-fix"
  ]
}
```

Claude will pause and ask the user before proceeding.

### Progress Reporting
Agents can report progress to Claude:
```json
{
  "workflow": [
    {
      "command": "test",
      "progress": "Running tests... (this may take 30s)"
    }
  ]
}
```

Claude displays this to the user in real-time.

## Agent Configuration

Each agent has a JSON definition with:
- **metadata**: Name, description, version
- **capabilities**: What the agent can do
- **workflow**: Sequence of commands/actions to execute
- **permissions**: What the agent can access/modify
- **triggers**: When the agent should run
- **parameters**: Configurable options
- **claude**: Claude-specific settings

Example:
```json
{
  "name": "pre-commit-validator",
  "version": "1.0.0",
  "description": "Comprehensive pre-commit validation with intelligent commit strategy",
  "workflow": [
    "command:format",
    "command:lint",
    "command:type-check",
    "command:test",
    "action:analyze-changes",
    "action:propose-commits"
  ],
  "triggers": ["pre-commit", "manual"],
  "permissions": {
    "read": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    "write": ["formatted files", "commit messages"],
    "execute": ["npm scripts", "git commands"]
  },
  "claude": {
    "triggers": ["commit", "pre-commit", "validate"],
    "auto_execute": false,
    "reports_progress": true
  }
}
```

## Extending Agents

To create a new agent:

1. Create a JSON file in the appropriate category directory
2. Define the agent's workflow using existing commands and actions
3. Add the agent to `registry.json`
4. Test with `--dry-run` flag
5. Document the agent's purpose and usage

Example new agent:
```json
{
  "name": "security-scanner",
  "version": "1.0.0",
  "description": "Scans codebase for security vulnerabilities",
  "category": "quality",
  "workflow": [
    "command:npm-audit",
    "command:snyk-test",
    "action:analyze-dependencies",
    "action:report-vulnerabilities"
  ],
  "claude": {
    "triggers": ["security scan", "check vulnerabilities", "audit dependencies"],
    "requires_user_confirmation": false,
    "estimated_duration": "60-90 seconds"
  }
}
```

## Best Practices

1. **Modularity**: Keep agents focused on single responsibilities
2. **Composability**: Build complex workflows from simple commands
3. **Idempotency**: Agents should be safe to run multiple times
4. **Fail-fast**: Stop on errors unless explicitly configured otherwise
5. **Observability**: Log all actions and decisions
6. **Dry-run**: Always support dry-run mode for testing
7. **User Feedback**: Provide clear progress updates for Claude to relay
8. **Claude Integration**: Add trigger phrases for easy invocation

## Integration with Commands and Actions

- **Commands** (`.commands/`): Individual CLI operations
- **Actions** (`.actions/`): Multi-step workflows composed of commands
- **Agents**: Intelligent orchestration of actions with decision-making

```
Agent → Actions → Commands → Shell/Tools
```

Example flow:
```
pre-commit-validator (agent)
  → analyze-changes (action)
    → git:status (command)
    → git:diff (command)
  → validate-code (action)
    → format:check (command)
    → lint (command)
    → type-check (command)
  → propose-strategy (action)
    → git:log (command)
    → analyze:commits (command)
```

## Portability

These agents are designed to be portable across projects:

1. **Self-contained**: All dependencies declared in metadata
2. **Configurable**: Project-specific settings via config files
3. **Framework-agnostic**: Works with any build system
4. **Repository-aware**: Auto-detects repository structure
5. **Version-controlled**: Can be shared via git

To use in another project:
```bash
# Copy the .agents directory to your project
cp -r .agents /path/to/other/project/

# Update registry.json with project-specific settings
# Update CLAUDE.md to include agent documentation

# Claude will auto-discover agents
```

## Troubleshooting

### Agent Not Found
```
Error: Agent 'pre-commit-validator' not found
→ Check registry.json for agent registration
→ Verify agent file exists in correct directory
```

### Permission Denied
```
Error: Agent cannot write to protected files
→ Review agent's permission configuration
→ Check file permissions in your repository
```

### Command Failed
```
Error: Command 'lint' failed with exit code 1
→ Run command directly to debug: pnpm lint
→ Check command definition in .commands/
→ Review agent workflow for proper error handling
```

### Claude Can't Find Agent
```
User: "Run pre-commit agent"
Claude: "I don't see a pre-commit agent"

Solutions:
→ Ensure registry.json exists in .agents/
→ Check that CLAUDE.md mentions agents
→ Use exact agent name: "Run pre-commit-validator agent"
→ Verify .agents/ directory is not in .gitignore
```

## Examples for Claude

### Example 1: Pre-commit Workflow
```
User: "I'm ready to commit my changes"

Claude: "I'll run the pre-commit validator agent to ensure your code meets quality standards."

[Executes pre-commit-validator agent]

Claude: "Pre-commit validation completed successfully! I found 3 logical commits:
1. feat(frontend): Add new dashboard component
2. test(frontend): Add tests for dashboard
3. docs: Update component documentation

Should I create these commits for you?"
```

### Example 2: Issue Creation
```
User: "Create an issue for the login bug"

Claude: "I'll use the issue-manager agent to create a properly formatted GitHub issue."

[Executes issue-manager agent]

Claude: "I've created issue #42 with the title 'Fix: Login authentication fails on mobile devices'
The issue includes:
- Relevant file analysis (LoginForm.tsx, authService.ts)
- Steps to reproduce
- Labels: bug, high-priority, frontend

View at: https://github.com/user/repo/issues/42"
```

### Example 3: Release Workflow
```
User: "Let's create a release"

Claude: "I'll run the release-manager agent to coordinate the release process."

[Executes release-manager agent]

Claude: "Release v1.2.0 created successfully:
- 15 commits since last release
- Generated changelog with 8 features and 3 bug fixes
- Updated version in package.json
- Created git tag v1.2.0
- Published release notes to GitHub

Next steps:
1. Review release notes: https://github.com/user/repo/releases/v1.2.0
2. Run: git push --tags
3. CI/CD will handle deployment"
```

## Version History

- **1.0.0**: Initial portable agent system
  - Quality agents (pre-commit, code-quality)
  - GitHub agents (issue, pr, release)
  - CI/CD agents (build, deployment)
  - Full Claude Code integration
