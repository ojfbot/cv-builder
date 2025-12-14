/**
 * Slash Command Types
 * Defines the structure for slash commands in the chat interface
 */

export type CommandCategory = 'agent' | 'navigation' | 'utility';

export interface CommandArg {
  name: string;
  required: boolean;
  type: 'string' | 'bio-id' | 'job-id' | 'resume-id';
  description?: string;
  autocomplete?: (input: string) => Promise<string[]>;
}

export interface SlashCommand {
  name: string;
  description: string;
  category: CommandCategory;
  args?: CommandArg[];
  handler: (args: string[], context: CommandContext) => Promise<void>;
  agentType?: string; // Maps to specialized agent
  aliases?: string[];
}

export interface CommandContext {
  sendMessage: (message: string) => Promise<void>;
  navigateTo?: (path: string) => void;
  clearChat?: () => void;
}

export interface CommandMatch {
  command: SlashCommand;
  query: string;
  score: number;
}
