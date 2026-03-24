/**
 * Badge Action System — cv-builder extension of @ojfbot/frame-ui-components.
 *
 * Re-exports shared types + adds cv-builder-specific patterns:
 * - TabKey-based navigation helpers
 * - Zod schemas for agent response validation
 * - Legacy QuickAction conversion
 * - Example badge actions for common cv-builder scenarios
 */

import { z } from 'zod'
import { TabKey, TabKeySchema } from './navigation'

// ── Re-export everything from shared library ────────────────────────────
export type {
  BadgeVariant,
  ActionType,
  ChatAction,
  NavigateAction,
  FileUploadAction,
  ExpandChatAction,
  CopyTextAction,
  DownloadAction,
  ExternalLinkAction,
  Action,
  SuggestedMessage,
  BadgeAction,
} from '@ojfbot/frame-ui-components'

export {
  createChatAction,
  createFileUploadAction,
  createExpandChatAction,
  createCopyTextAction,
  createDownloadAction,
  createExternalLinkAction,
  createSuggestedMessage,
  createBadgeAction,
  createSimpleBadge,
  getChatMessage,
  cleanStreamingContent,
  extractSuggestionsFromResponse,
  stripMetadata,
} from '@ojfbot/frame-ui-components'

// ── cv-builder-specific: TabKey navigation helper ───────────────────────

import { createNavigateAction as _createNavigateAction } from '@ojfbot/frame-ui-components'

/** Navigate action using TabKey enum (cv-builder specific). */
export const createNavigateAction = (tab: TabKey): import('@ojfbot/frame-ui-components').NavigateAction =>
  _createNavigateAction(tab)

// ── Zod schemas for agent response validation ───────────────────────────

export const ActionTypeSchema = z.enum([
  'chat', 'navigate', 'file_upload', 'expand_chat', 'copy_text', 'download', 'external_link',
])

export const ChatActionSchema = z.object({
  type: z.literal('chat'),
  message: z.string(),
  expandChat: z.boolean().optional(),
})

export const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  target: z.string().describe('Tab key to navigate to (e.g., "bio", "jobs", "outputs")'),
  // Legacy support
  tab: TabKeySchema.optional(),
  tabIndex: z.number().int().min(0).max(10).optional(),
})

export const FileUploadActionSchema = z.object({
  type: z.literal('file_upload'),
  accept: z.string().optional(),
  multiple: z.boolean().optional(),
  targetTab: z.number().optional(),
})

export const ExpandChatActionSchema = z.object({ type: z.literal('expand_chat') })

export const CopyTextActionSchema = z.object({
  type: z.literal('copy_text'),
  text: z.string(),
})

export const DownloadActionSchema = z.object({
  type: z.literal('download'),
  url: z.string(),
  filename: z.string(),
})

export const ExternalLinkActionSchema = z.object({
  type: z.literal('external_link'),
  url: z.string().url(),
  openInNew: z.boolean().optional().default(true),
})

export const ActionSchema = z.discriminatedUnion('type', [
  ChatActionSchema,
  NavigateActionSchema,
  FileUploadActionSchema,
  ExpandChatActionSchema,
  CopyTextActionSchema,
  DownloadActionSchema,
  ExternalLinkActionSchema,
])

export const SuggestedMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  compactContent: z.string().optional(),
})

export const BadgeActionSchema = z.object({
  label: z.string(),
  icon: z.string().optional(),
  variant: z.enum(['purple', 'blue', 'cyan', 'teal', 'green', 'gray', 'red', 'magenta']).optional().default('purple'),
  actions: z.array(ActionSchema).min(1),
  suggestedMessage: SuggestedMessageSchema.optional(),
  tooltip: z.string().optional(),
  disabled: z.boolean().optional().default(false),
})

export const BadgeActionMetadataSchema = z.object({
  suggestions: z.array(BadgeActionSchema),
})

export type BadgeActionMetadata = z.infer<typeof BadgeActionMetadataSchema>

// ── Legacy compatibility ────────────────────────────────────────────────

export interface LegacyQuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

import { createBadgeAction } from '@ojfbot/frame-ui-components'

export const convertLegacyAction = (legacy: LegacyQuickAction): import('@ojfbot/frame-ui-components').BadgeAction => {
  const actions: import('@ojfbot/frame-ui-components').Action[] = []

  if (legacy.navigateTo !== undefined) {
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
    actions.push({ type: 'chat', message: legacy.query })
  }

  return createBadgeAction(legacy.label, actions, { icon: legacy.icon })
}

// ── Example badge actions ───────────────────────────────────────────────

import { createSuggestedMessage } from '@ojfbot/frame-ui-components'

export const ExampleBadgeActions = {
  addExperience: createBadgeAction(
    'Add Experience',
    [createNavigateAction(TabKey.BIO)],
    {
      icon: '👤',
      variant: 'purple',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'Let\'s add your latest work experience! Please tell me:\n\n1. Company name and your job title\n2. Start and end dates (or "Present" if current)\n3. Key responsibilities and achievements\n4. Technologies and tools you used',
        'Tell me about your latest job: company, title, dates, and key achievements',
      ),
    },
  ),

  uploadResume: createBadgeAction(
    'Upload Resume',
    [{ type: 'expand_chat' }],
    {
      icon: '📄',
      variant: 'blue',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'I\'ll help you upload your resume! You can:\n\n**Upload Methods:**\n• [Click here](upload:.pdf,.docx) to browse files\n• Drag and drop a file into the chat\n• Type /upload in the chat\n\n**Supported Formats:**\n• PDF documents\n• Word documents (.docx)\n• Plain text files (.txt, .md)\n\nOnce uploaded, I\'ll extract your information and help you enhance it!',
        '[Click here](upload:) to upload your resume',
      ),
    },
  ),

  generateResume: createBadgeAction(
    'Generate Resume',
    [createNavigateAction(TabKey.OUTPUTS)],
    {
      icon: '📄',
      variant: 'green',
      suggestedMessage: createSuggestedMessage(
        'user',
        'Generate a professional resume in markdown format based on my bio',
        'Generate resume',
      ),
    },
  ),

  analyzeJob: createBadgeAction(
    'Analyze Job Fit',
    [createNavigateAction(TabKey.JOBS)],
    {
      icon: '🔍',
      variant: 'cyan',
      suggestedMessage: createSuggestedMessage(
        'assistant',
        'I can analyze any job listing to:\n\n- Calculate your match score\n- Identify skills gaps\n- Suggest resume customizations\n- Prepare interview talking points\n\nPlease share the job description or paste a job URL.',
        'Share a job description to analyze',
      ),
    },
  ),
}
