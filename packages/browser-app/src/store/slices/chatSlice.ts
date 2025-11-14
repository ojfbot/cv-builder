import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BadgeAction, createBadgeAction, createNavigateAction } from '../../models/badge-action'
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

I'm your AI-powered career development assistant. I'll help you create professional resumes, analyze job opportunities, and prepare for interviews.

**Ready to get started? Click any option below or type your question!**`,
  suggestions: [
    createBadgeAction(
      'Add Your Bio',
      [createNavigateAction(TabKey.BIO)],
      {
        icon: '👤',
        variant: 'purple',
        tooltip: 'Start by adding your professional information',
        suggestedMessage: {
          role: 'assistant',
          content: `Let's build your professional profile! I'll need:\n\n**Contact & Basics:**\n• Full name and contact info (email, phone, location)\n• LinkedIn profile (optional)\n\n**Professional Experience:**\n• Current role and company\n• Previous positions (companies, titles, dates)\n• Key achievements and responsibilities\n\n**Education & Skills:**\n• Degrees, schools, graduation dates\n• Technical skills and certifications\n• Languages and tools you use\n\n**Share what you have, and we'll build from there!**`,
          compactContent: 'Tell me about your professional background: name, current role, work history, education, and key skills'
        }
      }
    ),
    createBadgeAction(
      'Analyze Job',
      [createNavigateAction(TabKey.JOBS)],
      {
        icon: '🔍',
        variant: 'cyan',
        tooltip: 'Analyze a job and see how well you match',
        suggestedMessage: {
          role: 'assistant',
          content: `I can analyze any job listing to:\n\n✅ Calculate your match score\n✅ Identify key requirements and qualifications\n✅ Highlight skills gaps to address\n✅ Suggest resume customizations\n✅ Prepare interview talking points\n\n**To get started, share:**\n• Job posting URL, or\n• Copy/paste the full job description\n\nI'll provide a comprehensive analysis and actionable insights!`,
          compactContent: 'Share a job description or URL to analyze'
        }
      }
    ),
    createBadgeAction(
      'Generate Resume',
      [createNavigateAction(TabKey.OUTPUTS)],
      {
        icon: '📄',
        variant: 'green',
        tooltip: 'Create a professional resume',
        suggestedMessage: {
          role: 'user',
          content: 'Create a professional resume in markdown format based on my bio',
          compactContent: 'Generate resume'
        }
      }
    ),
    createBadgeAction(
      'Tailor for Job',
      [createNavigateAction(TabKey.JOBS)],
      {
        icon: '✨',
        variant: 'green',
        tooltip: 'Customize your resume for a specific job',
        suggestedMessage: {
          role: 'assistant',
          content: `I'll customize your resume to perfectly match a specific job! This includes:\n\n**Keyword Optimization:**\n• Match ATS (Applicant Tracking System) requirements\n• Highlight relevant skills from the job description\n\n**Experience Reframing:**\n• Emphasize accomplishments that align with the role\n• Reorder sections for maximum impact\n\n**Formatting:**\n• Professional markdown format\n• Easy to copy and use\n\n**Share the job posting and I'll create a tailored version!**`,
          compactContent: 'Share a job description to create a tailored resume'
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
          content: `I'll create a personalized learning path to help you:\n\n**Skills Gap Analysis:**\n• Identify missing skills for your target role\n• Prioritize learning areas by impact\n\n**Learning Plan:**\n• Recommended courses and resources\n• Practical projects to build skills\n• Timeline and milestones\n\n**Tell me:**\n• What role or job are you targeting?\n• What skills do you want to develop?\n\nI'll create a structured learning path to get you there!`,
          compactContent: 'What skills or role do you want to develop towards?'
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
          content: `I'll help you prepare for your interview! I can provide:\n\n**Interview Materials:**\n• Likely interview questions based on the job\n• STAR method response frameworks\n• Company research and talking points\n\n**Cover Letter:**\n• Compelling narrative connecting your experience to the role\n• Professional tone and format\n\n**Practice:**\n• Behavioral question examples\n• Technical question areas to review\n\n**Share the job details and I'll create comprehensive prep materials!**`,
          compactContent: 'Share job details to prepare interview materials'
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
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload)
      // If adding an assistant message and chat is collapsed, increment unread count
      if (action.payload.role === 'assistant' && !state.isExpanded) {
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
      // When expanding, mark all messages as read
      if (action.payload) {
        state.unreadCount = 0
        state.lastReadMessageIndex = state.messages.length - 1
      }
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
