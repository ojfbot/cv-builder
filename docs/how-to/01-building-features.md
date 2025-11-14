# Building Features - A Guide

This guide documents the iterative process of building and refining features in the CV Builder.

## Philosophy

This project is built using Claude Code, documenting the development process as we go. Each feature is:

1. **Planned** - Define requirements and architecture
2. **Implemented** - Build the feature incrementally
3. **Tested** - Validate functionality
4. **Refined** - Improve based on usage
5. **Documented** - Record learnings and decisions

## Example: Adding a New Agent

Let's walk through adding a new agent to the system.

### Step 1: Define the Agent's Purpose

Create a spec document:

```markdown
# Salary Negotiation Agent

## Purpose
Help users understand market rates and prepare salary negotiations.

## Inputs
- Job listing
- User's experience level
- Geographic location

## Outputs
- Market salary range
- Negotiation talking points
- Compensation package analysis
```

### Step 2: Create the Agent Module

```typescript
// src/agents/salary-negotiation-agent.ts

import Anthropic from '@anthropic-ai/sdk'

export class SalaryNegotiationAgent {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async analyze(input: SalaryInput): Promise<SalaryAnalysis> {
    // Implementation
  }
}
```

### Step 3: Integrate with Orchestrator

### Step 4: Add CLI Command

### Step 5: Add to Web UI

### Step 6: Test and Iterate

### Step 7: Document

## Common Patterns

### Agent Design Pattern

All agents follow this structure:
1. Input validation with Zod
2. System prompt definition
3. Claude API call with streaming
4. Output parsing and validation
5. Error handling

### File Organization

- Each agent in separate file
- Shared types in `src/models/`
- Utilities in `src/utils/`
- Tests co-located with source

## Tips

- Start small, iterate quickly
- Use TypeScript for type safety
- Validate all inputs and outputs
- Handle errors gracefully
- Document as you build

## Video Script Ideas

Future videos to create:
1. "Setting Up Your CV Builder Environment"
2. "Creating Your First Agent"
3. "Tailoring a Resume for a Job"
4. "Building Custom Learning Paths"
5. "Extending the Web UI"
