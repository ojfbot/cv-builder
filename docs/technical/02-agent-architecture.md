# Agent Architecture

The CV Builder uses a multi-agent architecture where specialized Claude agents handle different aspects of resume generation and career development.

## Agent Types

### 1. Orchestrator Agent
**Role**: Coordinates other agents and manages workflow

**Responsibilities**:
- Parse user requests
- Delegate tasks to specialized agents
- Aggregate results
- Maintain conversation context

### 2. Resume Generator Agent
**Role**: Creates and formats resumes

**Responsibilities**:
- Transform bio data into resume format
- Apply formatting and styling
- Generate multiple versions (PDF, Markdown, HTML)

### 3. Job Analysis Agent
**Role**: Analyzes job listings

**Responsibilities**:
- Extract key requirements from job descriptions
- Identify required skills, experience, and qualifications
- Categorize requirements (must-have vs nice-to-have)
- Detect industry-specific terminology

### 4. Tailoring Agent
**Role**: Customizes resumes for specific jobs

**Responsibilities**:
- Match bio experiences to job requirements
- Reframe descriptions to highlight relevant skills
- Prioritize and reorder resume sections
- Optimize keyword usage

### 5. Skills Gap Analyzer Agent
**Role**: Identifies learning opportunities

**Responsibilities**:
- Compare current skills vs job requirements
- Find learning resources (documentation, tutorials, courses)
- Generate practice exercises
- Create learning roadmaps

### 6. Interview Coach Agent
**Role**: Prepares cover letters and interview talking points

**Responsibilities**:
- Conduct structured interviews about motivation
- Generate personalized cover letters
- Identify compelling narratives
- Suggest talking points for interviews

### 7. Research Agent
**Role**: Stays current with best practices

**Responsibilities**:
- Monitor resume trends
- Track industry standards
- Research company culture and values
- Gather salary data and market insights

## Communication Flow

```
User Request
    ↓
Orchestrator Agent
    ↓
┌───────┴────────┬──────────┬─────────────┬──────────────┐
│                │          │             │              │
Job Analysis   Research   Resume      Tailoring    Skills Gap
Agent          Agent      Generator    Agent        Analyzer
                           Agent
```

## Implementation Details

Each agent is implemented as a separate module with:
- Dedicated system prompt
- Input/output schema validation
- Error handling and retry logic
- Token usage optimization
- Conversation history management

See [src/agents/](../../src/agents/) for implementations.

## Agent Communication Protocol

Agents communicate using structured JSON messages:

```typescript
interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    agent: string
    timestamp: string
    tokens?: number
  }
}
```

## Optimization Strategies

1. **Parallel Execution**: Independent agents run concurrently
2. **Caching**: Results cached to avoid redundant API calls
3. **Streaming**: Use Claude streaming for real-time feedback
4. **Context Management**: Intelligent truncation of conversation history
