/**
 * Slash Command Service
 * Registry and parser for slash commands in the chat interface
 */

import type { SlashCommand, CommandContext, CommandMatch } from '../types/slash-commands';

class SlashCommandService {
  private commands: Map<string, SlashCommand> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  /**
   * Register a new slash command
   */
  register(command: SlashCommand): void {
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands.set(alias, command);
      });
    }
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): SlashCommand[] {
    // Deduplicate commands (exclude aliases)
    const unique = new Map<string, SlashCommand>();
    this.commands.forEach((cmd, key) => {
      if (cmd.name === key) {
        unique.set(key, cmd);
      }
    });
    return Array.from(unique.values());
  }

  /**
   * Search commands by query string
   */
  searchCommands(query: string): CommandMatch[] {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // Return all commands if no query
      return this.getAllCommands().map(cmd => ({
        command: cmd,
        query: '',
        score: 1
      }));
    }

    const matches: CommandMatch[] = [];

    this.commands.forEach((command, key) => {
      // Only match on primary name (not aliases) to avoid duplicates
      if (command.name !== key) return;

      const score = this.calculateMatchScore(command, normalizedQuery);
      if (score > 0) {
        matches.push({
          command,
          query: normalizedQuery,
          score
        });
      }
    });

    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate match score for a command
   * Higher score = better match
   */
  private calculateMatchScore(command: SlashCommand, query: string): number {
    const name = command.name.toLowerCase();
    const description = command.description.toLowerCase();

    // Exact match
    if (name === query) return 100;

    // Starts with query
    if (name.startsWith(query)) return 80;

    // Contains query
    if (name.includes(query)) return 60;

    // Description contains query
    if (description.includes(query)) return 40;

    // Check aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        const aliasLower = alias.toLowerCase();
        if (aliasLower === query) return 90;
        if (aliasLower.startsWith(query)) return 70;
        if (aliasLower.includes(query)) return 50;
      }
    }

    return 0;
  }

  /**
   * Parse a command string and return the command and args
   */
  parseCommand(input: string): { command: SlashCommand | null; args: string[] } | null {
    const trimmed = input.trim();

    // Must start with /
    if (!trimmed.startsWith('/')) {
      return null;
    }

    // Remove leading slash
    const withoutSlash = trimmed.slice(1);

    // Split into parts
    const parts = withoutSlash.split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const command = this.commands.get(commandName);

    if (!command) {
      return null;
    }

    return { command, args };
  }

  /**
   * Sanitize an argument value to prevent injection attacks
   * Allows only alphanumeric characters, hyphens, and underscores
   */
  private sanitizeArg(arg: string): string {
    return arg.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Validate and sanitize command arguments
   */
  private validateAndSanitizeArgs(args: string[]): { valid: boolean; sanitized: string[]; error?: string } {
    const sanitized = args.map(arg => this.sanitizeArg(arg));

    // Check if any args became empty after sanitization
    const hasInvalidArgs = sanitized.some((arg, index) => {
      return args[index].length > 0 && arg.length === 0;
    });

    if (hasInvalidArgs) {
      return {
        valid: false,
        sanitized: [],
        error: 'Invalid characters in arguments. Only alphanumeric, hyphens, and underscores are allowed.'
      };
    }

    return { valid: true, sanitized };
  }

  /**
   * Execute a command string and return the message to send (if any)
   * Returns null if command not found or execution failed
   */
  async executeCommand(input: string, context: CommandContext): Promise<{ success: boolean; message?: string; error?: string }> {
    const parsed = this.parseCommand(input);

    if (!parsed) {
      return {
        success: false,
        error: 'Unknown command. Type /help to see available commands.'
      };
    }

    const { command, args } = parsed;

    if (!command) {
      return {
        success: false,
        error: 'Unknown command. Type /help to see available commands.'
      };
    }

    // Validate and sanitize arguments
    const validation = this.validateAndSanitizeArgs(args);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    try {
      // Create a message collector context instead of direct sendMessage
      let collectedMessage: string | undefined;
      const messageCollectorContext: CommandContext = {
        ...context,
        sendMessage: async (message: string) => {
          collectedMessage = message;
        }
      };

      await command.handler(validation.sanitized, messageCollectorContext);

      return {
        success: true,
        message: collectedMessage
      };
    } catch (error) {
      console.error('Command execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed'
      };
    }
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.register({
      name: 'help',
      description: 'Show all available commands',
      category: 'utility',
      handler: async (_args, context) => {
        const commands = this.getAllCommands();
        const helpText = commands
          .map(cmd => `/${cmd.name} - ${cmd.description}`)
          .join('\n');

        await context.sendMessage(`Available commands:\n\n${helpText}`);
      }
    });

    // Clear command
    this.register({
      name: 'clear',
      description: 'Clear chat history',
      category: 'utility',
      handler: async (_args, context) => {
        if (context.clearChat) {
          context.clearChat();
        }
      }
    });

    // Resume generation command
    this.register({
      name: 'generate-resume',
      description: 'Start resume generation workflow',
      category: 'agent',
      agentType: 'resume-generator',
      aliases: ['resume'],
      handler: async (args, context) => {
        const bioName = args[0] || 'default';
        await context.sendMessage(`Generate a resume using bio: ${bioName}`);
      }
    });

    // Job analysis command
    this.register({
      name: 'analyze-job',
      description: 'Analyze a job posting',
      category: 'agent',
      agentType: 'job-analysis',
      args: [
        {
          name: 'job-id',
          required: true,
          type: 'job-id',
          description: 'ID of the job to analyze'
        }
      ],
      handler: async (args, context) => {
        const jobId = args[0];
        if (!jobId) {
          await context.sendMessage('Error: job-id is required. Usage: /analyze-job <job-id>');
          return;
        }
        await context.sendMessage(`Analyze job: ${jobId}`);
      }
    });

    // Tailoring command
    this.register({
      name: 'tailor',
      description: 'Customize resume for a specific job',
      category: 'agent',
      agentType: 'tailoring',
      args: [
        {
          name: 'job-id',
          required: true,
          type: 'job-id',
          description: 'ID of the target job'
        },
        {
          name: 'resume-id',
          required: false,
          type: 'resume-id',
          description: 'ID of the resume to customize'
        }
      ],
      handler: async (args, context) => {
        const jobId = args[0];
        const resumeId = args[1];

        if (!jobId) {
          await context.sendMessage('Error: job-id is required. Usage: /tailor <job-id> [resume-id]');
          return;
        }

        const message = resumeId
          ? `Tailor resume ${resumeId} for job ${jobId}`
          : `Tailor my resume for job ${jobId}`;

        await context.sendMessage(message);
      }
    });

    // Skills gap command
    this.register({
      name: 'skills-gap',
      description: 'Analyze skills gap for a job',
      category: 'agent',
      agentType: 'skills-gap-analyzer',
      aliases: ['learn'],
      args: [
        {
          name: 'job-id',
          required: true,
          type: 'job-id',
          description: 'ID of the target job'
        }
      ],
      handler: async (args, context) => {
        const jobId = args[0];
        if (!jobId) {
          await context.sendMessage('Error: job-id is required. Usage: /skills-gap <job-id>');
          return;
        }
        await context.sendMessage(`Analyze skills gap for job: ${jobId}`);
      }
    });

    // Interview prep command
    this.register({
      name: 'interview-prep',
      description: 'Generate interview preparation materials',
      category: 'agent',
      agentType: 'interview-coach',
      args: [
        {
          name: 'job-id',
          required: true,
          type: 'job-id',
          description: 'ID of the target job'
        }
      ],
      handler: async (args, context) => {
        const jobId = args[0];
        if (!jobId) {
          await context.sendMessage('Error: job-id is required. Usage: /interview-prep <job-id>');
          return;
        }
        await context.sendMessage(`Generate interview prep for job: ${jobId}`);
      }
    });
  }
}

// Singleton instance
export const slashCommandService = new SlashCommandService();
