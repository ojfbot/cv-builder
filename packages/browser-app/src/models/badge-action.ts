import { z } from 'zod'
import { TabKey, TabKeySchema } from './navigation'

/**
 * Badge Action System
 *
 * Provides a robust, type-safe pattern for inline badge buttons that can dispatch
 * multiple actions (chat messages, navigation, file uploads, etc.)
 */

// Action Types
export const ActionTypeSchema = z.enum([
  'chat',           // Send a chat message
  'navigate',       // Navigate to a tab
  'file_upload',    // Trigger file upload dialog
  'expand_chat',    // Expand the chat interface
  'copy_text',      // Copy text to clipboard
  'download',       // Download a file
  'external_link',  // Open external URL
])

export type ActionType = z.infer<typeof ActionTypeSchema>

// Individual Action Definitions
export const ChatActionSchema = z.object({
  type: z.literal('chat'),
  message: z.string().describe('The message to send to the agent'),
  expandChat: z.boolean().optional().describe('Whether to expand chat before sending'),
})

export const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  tab: TabKeySchema.describe('Tab key to navigate to (e.g., "bio", "jobs", "outputs")'),
  // Legacy support: tabIndex for backward compatibility
  tabIndex: z.number().int().min(0).max(10).optional().describe('DEPRECATED: Use "tab" instead'),
})

export const FileUploadActionSchema = z.object({
  type: z.literal('file_upload'),
  accept: z.string().optional().describe('File type filter (e.g., ".pdf,.docx")'),
  multiple: z.boolean().optional().describe('Allow multiple file selection'),
  targetTab: z.number().optional().describe('Tab to navigate to after upload'),
})

export const ExpandChatActionSchema = z.object({
  type: z.literal('expand_chat'),
})

export const CopyTextActionSchema = z.object({
  type: z.literal('copy_text'),
  text: z.string().describe('Text to copy to clipboard'),
})

export const DownloadActionSchema = z.object({
  type: z.literal('download'),
  url: z.string().describe('URL or data URI to download'),
  filename: z.string().describe('Suggested filename'),
})

export const ExternalLinkActionSchema = z.object({
  type: z.literal('external_link'),
  url: z.string().url().describe('External URL to open'),
  openInNew: z.boolean().optional().default(true).describe('Open in new tab'),
})

// Union of all action types
export const ActionSchema = z.discriminatedUnion('type', [
  ChatActionSchema,
  NavigateActionSchema,
  FileUploadActionSchema,
  ExpandChatActionSchema,
  CopyTextActionSchema,
  DownloadActionSchema,
  ExternalLinkActionSchema,
])

export type Action = z.infer<typeof ActionSchema>

// Suggested Message Definition
// Used to pre-populate the next message after clicking a badge action
export const SuggestedMessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Who sends this message: "user" for user input, "assistant" for agent-generated prompts'),
  content: z.string().describe('The full message content to display/send'),
  compactContent: z.string().optional().describe('Optional shorter version for compact/condensed chat mode'),
})

export type SuggestedMessage = z.infer<typeof SuggestedMessageSchema>

// Badge Button Definition
export const BadgeActionSchema = z.object({
  label: z.string().describe('Display label for the badge button'),
  icon: z.string().optional().describe('Emoji or icon to display (e.g., "📄", "💼")'),
  variant: z.enum(['purple', 'blue', 'cyan', 'teal', 'green', 'gray', 'red', 'magenta'])
    .optional()
    .default('purple')
    .describe('Visual style variant'),
  actions: z.array(ActionSchema).min(1).describe('Array of actions to execute when clicked'),
  suggestedMessage: SuggestedMessageSchema.optional().describe('Suggested follow-up message to send after clicking this badge'),
  tooltip: z.string().optional().describe('Tooltip text (auto-generated if not provided)'),
  disabled: z.boolean().optional().default(false).describe('Whether the button is disabled'),
})

export type BadgeAction = z.infer<typeof BadgeActionSchema>

// Helper type for creating actions programmatically
export type BadgeActionInput = Omit<BadgeAction, 'tooltip'> & {
  tooltip?: string
}

/**
 * Helper functions for creating actions
 */
export const createChatAction = (message: string, expandChat = false): Action => ({
  type: 'chat',
  message,
  expandChat,
})

export const createNavigateAction = (tab: TabKey): Action => ({
  type: 'navigate',
  tab,
})

export const createFileUploadAction = (
  accept?: string,
  multiple = false,
  targetTab?: number
): Action => ({
  type: 'file_upload',
  accept,
  multiple,
  targetTab,
})

export const createExpandChatAction = (): Action => ({
  type: 'expand_chat',
})

export const createCopyTextAction = (text: string): Action => ({
  type: 'copy_text',
  text,
})

export const createDownloadAction = (url: string, filename: string): Action => ({
  type: 'download',
  url,
  filename,
})

export const createExternalLinkAction = (url: string, openInNew = true): Action => ({
  type: 'external_link',
  url,
  openInNew,
})

/**
 * Helper for creating suggested messages
 */
export const createSuggestedMessage = (
  role: 'user' | 'assistant',
  content: string,
  compactContent?: string
): SuggestedMessage => ({
  role,
  content,
  compactContent,
})

/**
 * Helper for creating badge actions
 */
export const createBadgeAction = (
  label: string,
  actions: Action[],
  options?: {
    icon?: string
    variant?: BadgeAction['variant']
    tooltip?: string
    disabled?: boolean
    suggestedMessage?: SuggestedMessage
  }
): BadgeAction => {
  const badge: BadgeAction = {
    label,
    actions,
    icon: options?.icon,
    variant: options?.variant ?? 'purple',
    disabled: options?.disabled ?? false,
    suggestedMessage: options?.suggestedMessage,
    tooltip: options?.tooltip ?? generateTooltip(actions),
  }
  return BadgeActionSchema.parse(badge)
}

/**
 * Auto-generate tooltip from actions
 */
const generateTooltip = (actions: Action[]): string => {
  if (actions.length === 1) {
    const action = actions[0]
    switch (action.type) {
      case 'chat':
        return `Ask: "${action.message.slice(0, 50)}${action.message.length > 50 ? '...' : ''}"`
      case 'navigate':
        return `Navigate to ${action.tab} tab`
      case 'file_upload':
        return `Upload ${action.multiple ? 'files' : 'file'}${action.accept ? ` (${action.accept})` : ''}`
      case 'expand_chat':
        return 'Expand chat'
      case 'copy_text':
        return 'Copy to clipboard'
      case 'download':
        return `Download ${action.filename}`
      case 'external_link':
        return `Open ${action.url}`
    }
  }
  return `${actions.length} actions: ${actions.map(a => a.type).join(', ')}`
}

/**
 * Legacy compatibility: Convert QuickAction to BadgeAction
 */
export interface LegacyQuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

export const convertLegacyAction = (legacy: LegacyQuickAction): BadgeAction => {
  const actions: Action[] = []

  // If there's a navigation target, add navigate action (convert index to key)
  if (legacy.navigateTo !== undefined) {
    // Direct mapping to avoid require() and circular dependency issues
    const tabKeyMap: Record<number, TabKey> = {
      0: TabKey.INTERACTIVE,
      1: TabKey.BIO,
      2: TabKey.JOBS,
      3: TabKey.OUTPUTS,
      4: TabKey.RESEARCH,
      5: TabKey.PIPELINES,
      6: TabKey.TOOLBOX,
    }
    const tabKey = tabKeyMap[legacy.navigateTo] || TabKey.INTERACTIVE
    actions.push(createNavigateAction(tabKey))
  } else {
    // Otherwise, it's a chat action
    actions.push(createChatAction(legacy.query))
  }

  return createBadgeAction(legacy.label, actions, { icon: legacy.icon })
}

/**
 * Metadata format for agent responses
 * Agents can include this in their responses to suggest actions
 */
export const BadgeActionMetadataSchema = z.object({
  suggestions: z.array(BadgeActionSchema).describe('Suggested badge actions'),
})

export type BadgeActionMetadata = z.infer<typeof BadgeActionMetadataSchema>

/**
 * Example badge actions for common scenarios
 */
export const ExampleBadgeActions = {
  // Navigate to Bio tab and prompt to add experience with suggested follow-up
  addExperience: createBadgeAction(
    'Add Experience',
    [
      createNavigateAction(TabKey.BIO),
    ],
    {
      icon: '👤',
      variant: 'purple',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'Let\'s add your latest work experience! Please tell me:\n\n1. Company name and your job title\n2. Start and end dates (or "Present" if current)\n3. Key responsibilities and achievements\n4. Technologies and tools you used',
        'Tell me about your latest job: company, title, dates, and key achievements'
      ),
    }
  ),

  // Upload resume - shows upload instructions with inline button
  uploadResume: createBadgeAction(
    'Upload Resume',
    [
      createExpandChatAction(), // Just expand chat to show the message
    ],
    {
      icon: '📄',
      variant: 'blue',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'I\'ll help you upload your resume! You can:\n\n**Upload Methods:**\n• [Click here](upload:.pdf,.docx) to browse files\n• Drag and drop a file into the chat\n• Type /upload in the chat\n\n**Supported Formats:**\n• PDF documents\n• Word documents (.docx)\n• Plain text files (.txt, .md)\n\nOnce uploaded, I\'ll extract your information and help you enhance it!',
        '[Click here](upload:) to upload your resume'
      ),
    }
  ),

  // Generate resume and navigate to outputs with user confirmation
  generateResume: createBadgeAction(
    'Generate Resume',
    [
      createNavigateAction(TabKey.OUTPUTS),
    ],
    {
      icon: '📄',
      variant: 'green',
      suggestedMessage: createSuggestedMessage(
        'user',
        'Generate a professional resume in markdown format based on my bio',
        'Generate resume'
      ),
    }
  ),

  // Multi-step: Navigate to Jobs tab and suggest job analysis
  analyzeJob: createBadgeAction(
    'Analyze Job Fit',
    [
      createNavigateAction(TabKey.JOBS),
    ],
    {
      icon: '🔍',
      variant: 'cyan',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'I can analyze any job listing to:\n\n- Calculate your match score\n- Identify skills gaps\n- Suggest resume customizations\n- Prepare interview talking points\n\nPlease share the job description or paste a job URL.',
        'Share a job description to analyze'
      ),
    }
  ),
}
