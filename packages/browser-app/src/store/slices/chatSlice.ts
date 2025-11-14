import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BadgeAction, createBadgeAction, createNavigateAction, createExpandChatAction } from '../../models/badge-action'
import { TabKey } from '../../models/navigation'

// Legacy interface - kept for backward compatibility only
export interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: BadgeAction[]
}

export interface AddMessagePayload {
  message: Message
  markAsRead?: boolean // If true, don't increment unread count (used by InteractiveChat)
}

export interface ChatState {
  messages: Message[]
  draftInput: string
  isExpanded: boolean
  chatSummary: string
  isLoading: boolean
  streamingContent: string
  unreadCount: number
  lastReadMessageIndex: number
  scrollPosition: number
}

const initialWelcomeMessage: Message = {
  role: 'assistant',
  content: `# Welcome to CV Builder! 👋

I'm your AI career assistant. I help you create resumes, analyze jobs, and prepare for interviews.

**How to interact:**
• Click any action below
• Type questions or use commands (\`/upload\`, \`/help\`)
• Speak via microphone button
• Drag and drop files
• Paste job URLs

**Choose an action to begin:**`,
  suggestions: [
    createBadgeAction(
      'Upload Resume',
      [createExpandChatAction()],
      {
        icon: '📤',
        variant: 'purple',
        tooltip: 'Upload an existing resume to get started quickly',
        suggestedMessage: {
          role: 'assistant',
          content: `Ready to upload your resume! [Click here](upload:.pdf,.docx,.txt,.md) to browse files, drag and drop a file into the chat, or try \`/upload\`.\n\n**Supported formats:** PDF, Word (.docx), or text files (.txt, .md)`,
          compactContent: 'Upload your resume (PDF, Word, or text file)'
        }
      }
    ),
    createBadgeAction(
      'Add Your Bio',
      [createNavigateAction(TabKey.BIO)],
      {
        icon: '👤',
        variant: 'purple',
        tooltip: 'Manually add your professional information',
        suggestedMessage: {
          role: 'assistant',
          content: `Let's build your professional profile! I'll need:\n\n**Contact & Basics:**\n• Full name and contact info (email, phone, location)\n• LinkedIn profile (optional)\n\n**Professional Experience:**\n• Current role and company\n• Previous positions (companies, titles, dates)\n• Key achievements and responsibilities\n\n**Education & Skills:**\n• Degrees, schools, graduation dates\n• Technical skills and certifications\n• Languages and tools you use\n\n**Share what you have, and we'll build from there!**`,
          compactContent: 'Tell me about your professional background'
        }
      }
    ),
    createBadgeAction(
      'Show Help',
      [createExpandChatAction()],
      {
        icon: '❓',
        variant: 'cyan',
        tooltip: 'Learn about available commands and features',
        suggestedMessage: {
          role: 'assistant',
          content: `**Available Commands:**
Type these directly in chat like a mini-CLI:

\`/upload\` - Upload resume files (PDF, Word, text)
\`/generate\` - Create a resume from your bio
\`/tailor\` - Customize resume for a specific job
\`/learn\` - Build a skills learning path
\`/prep\` - Prepare interview materials
\`/help\` - Show this help message

**Quick Actions:**
• Analyze jobs by pasting URLs or descriptions
• Ask questions in natural language
• Upload files via drag-and-drop
• Click badges for guided workflows

**Need help with something specific?** Just ask!`,
          compactContent: 'Commands: /upload, /generate, /tailor, /learn, /prep, /help'
        }
      }
    ),
    createBadgeAction(
      'Generate Resume',
      [createNavigateAction(TabKey.OUTPUTS)],
      {
        icon: '📄',
        variant: 'green',
        tooltip: 'Create a professional resume from your bio',
        suggestedMessage: {
          role: 'user',
          content: 'Create a professional resume in markdown format based on my bio',
          compactContent: 'Generate resume'
        }
      }
    ),
    createBadgeAction(
      'Tailor Resume',
      [createNavigateAction(TabKey.JOBS)],
      {
        icon: '✨',
        variant: 'green',
        tooltip: 'Customize your resume for a specific job',
        suggestedMessage: {
          role: 'assistant',
          content: `I'll customize your resume to perfectly match a specific job!\n\n**What I'll do:**\n• Match ATS (Applicant Tracking System) requirements\n• Highlight relevant skills from the job description\n• Emphasize accomplishments that align with the role\n• Reorder sections for maximum impact\n\n**To get started:**\nShare the job posting, or type \`/tailor\` followed by the job description.\n\nI'll create a tailored version optimized for that role!`,
          compactContent: 'Share a job description to tailor your resume'
        }
      }
    ),
    createBadgeAction(
      'Learning Path',
      [createNavigateAction(TabKey.RESEARCH)],
      {
        icon: '📚',
        variant: 'blue',
        tooltip: 'Create a personalized learning path',
        suggestedMessage: {
          role: 'assistant',
          content: `I'll create a personalized learning path!\n\n**What I'll provide:**\n• Skills gap analysis for your target role\n• Prioritized learning areas by impact\n• Recommended courses and resources\n• Practical projects to build skills\n• Timeline and milestones\n\n**To get started:**\nTell me your target role or skills you want to develop, or type \`/learn\` followed by the skill area.\n\nI'll create a structured learning path to get you there!`,
          compactContent: 'What skills or role do you want to develop?'
        }
      }
    ),
    createBadgeAction(
      'Interview Prep',
      [createNavigateAction(TabKey.JOBS)],
      {
        icon: '💼',
        variant: 'teal',
        tooltip: 'Prepare for an upcoming interview',
        suggestedMessage: {
          role: 'assistant',
          content: `I'll help you prepare for your interview!\n\n**What I'll provide:**\n• Likely interview questions based on the job\n• STAR method response frameworks\n• Company research and talking points\n• Cover letter with compelling narrative\n• Behavioral and technical question areas\n\n**To get started:**\nShare the job details, or type \`/prep\` followed by company and role info.\n\nI'll create comprehensive prep materials!`,
          compactContent: 'Share job details for interview prep'
        }
      }
    )
  ]
}

const initialState: ChatState = {
  messages: [initialWelcomeMessage],
  draftInput: '',
  isExpanded: false,
  chatSummary: '',
  isLoading: false,
  streamingContent: '',
  unreadCount: 0,
  lastReadMessageIndex: 0,
  scrollPosition: 0,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message | AddMessagePayload>) => {
      // Support both old format (Message) and new format (AddMessagePayload)
      const message = 'message' in action.payload ? action.payload.message : action.payload
      const markAsRead = 'markAsRead' in action.payload ? action.payload.markAsRead : false

      state.messages.push(message)

      // If adding an assistant message and not marked as read, increment unread count
      // (markAsRead is true when message is added from InteractiveChat where user is viewing)
      if (message.role === 'assistant' && !markAsRead && !state.isExpanded) {
        state.unreadCount += 1
      }
    },
    clearMessages: (state) => {
      state.messages = [{
        role: 'assistant',
        content: `# Welcome back! 👋\n\nHow can I help you today?`
      }]
      state.unreadCount = 0
      state.lastReadMessageIndex = 0
    },
    setDraftInput: (state, action: PayloadAction<string>) => {
      state.draftInput = action.payload
    },
    setIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload
      // Note: We don't clear unread count here anymore
      // Unread count is only cleared when user views messages on Interactive tab
    },
    setChatSummary: (state, action: PayloadAction<string>) => {
      state.chatSummary = action.payload
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setStreamingContent: (state, action: PayloadAction<string>) => {
      state.streamingContent = action.payload
    },
    appendStreamingContent: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload
    },
    markMessagesAsRead: (state) => {
      state.unreadCount = 0
      state.lastReadMessageIndex = state.messages.length - 1
    },
    setScrollPosition: (state, action: PayloadAction<number>) => {
      state.scrollPosition = action.payload
    },
    generateChatSummary: (state) => {
      // Generate a 2-3 word summary from the chat history
      const userMessages = state.messages
        .filter(m => m.role === 'user')
        .slice(-3) // Last 3 user messages

      if (userMessages.length === 0) {
        state.chatSummary = ''
        return
      }

      const lastUserMessage = userMessages[userMessages.length - 1].content.toLowerCase()

      // Keywords to identify common topics
      const topicKeywords = [
        { keywords: ['resume', 'cv'], summary: 'Resume help' },
        { keywords: ['job', 'position', 'apply'], summary: 'Job application' },
        { keywords: ['tailor', 'customize', 'adapt'], summary: 'Resume tailoring' },
        { keywords: ['skill', 'learn', 'gap', 'develop'], summary: 'Skills development' },
        { keywords: ['cover letter', 'letter'], summary: 'Cover letter' },
        { keywords: ['interview', 'prepare', 'practice'], summary: 'Interview prep' },
        { keywords: ['bio', 'profile', 'information'], summary: 'Bio update' },
        { keywords: ['analyze', 'match', 'score'], summary: 'Job analysis' },
      ]

      // Find matching topic
      for (const topic of topicKeywords) {
        if (topic.keywords.some(keyword => lastUserMessage.includes(keyword))) {
          state.chatSummary = topic.summary
          return
        }
      }

      // Fallback: extract first 2-3 words from the last message
      const words = userMessages[userMessages.length - 1].content.trim().split(/\s+/)
      state.chatSummary = words.slice(0, 3).join(' ')
    },
  },
})

export const {
  addMessage,
  clearMessages,
  setDraftInput,
  setIsExpanded,
  setChatSummary,
  setIsLoading,
  setStreamingContent,
  appendStreamingContent,
  markMessagesAsRead,
  setScrollPosition,
  generateChatSummary,
} = chatSlice.actions
export default chatSlice.reducer
