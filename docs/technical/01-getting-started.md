# Getting Started

## Prerequisites

- Node.js 18+ and npm
- Anthropic API key for Claude access

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cv-builder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

4. Create your personal data directories:
```bash
mkdir -p bio jobs output
```

## Project Structure

```
cv-builder/
├── src/
│   ├── cli/          # Command-line interface
│   ├── browser/      # React web application
│   ├── agents/       # Claude agent implementations
│   ├── models/       # Data models and schemas
│   └── utils/        # Shared utilities
├── docs/
│   ├── technical/    # Technical documentation
│   └── how-to/       # Tutorials and guides
├── public/
│   └── examples/     # Example data (safe to share)
├── bio/             # Your personal bio (gitignored)
├── jobs/            # Job listings (gitignored)
└── output/          # Generated resumes/outputs (gitignored)
```

## Running the Application

### CLI Mode (Interactive)
```bash
npm run cli
```

### CLI Mode (Headless)
```bash
npm run cli:headless -- --job jobs/example.json
```

### Web UI
```bash
npm run dev
```
Then open http://localhost:3000

## Next Steps

- [Agent Architecture](./02-agent-architecture.md) - Learn how the agent system works
- [Data Models](./03-data-models.md) - Understand the data structures
- [Building Features](../how-to/01-building-features.md) - Start developing
