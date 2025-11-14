import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: QuickAction[]
}

export interface ChatState {
  messages: Message[]
  draftInput: string
  isExpanded: boolean
  chatSummary: string
}

const initialWelcomeMessage: Message = {
  role: 'assistant',
  content: `# Welcome to CV Builder! 👋

I'm your AI-powered career development assistant. Here's what I can help you with:

## Next Steps

- **📄 Generate Resume**: Create a professional resume in markdown format
- **🔍 Analyze Job**: Analyze a job listing and see how well you match
- **✨ Tailor Resume**: Customize your resume for a specific job posting
- **📚 Learning Path**: Create a personalized learning path to close your skills gaps
- **✍️ Cover Letter**: Write a compelling cover letter for a job application
- **💼 Interview Prep**: Prepare for an upcoming interview with practice questions

**Ready to get started? Click any badge above or type your question below!**`
}

const initialState: ChatState = {
  messages: [initialWelcomeMessage],
  draftInput: '',
  isExpanded: true,
  chatSummary: '',
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload)
    },
    clearMessages: (state) => {
      state.messages = [{
        role: 'assistant',
        content: `# Welcome back! 👋\n\nHow can I help you today?`
      }]
    },
    setDraftInput: (state, action: PayloadAction<string>) => {
      state.draftInput = action.payload
    },
    setIsExpanded: (state, action: PayloadAction<boolean>) => {
      state.isExpanded = action.payload
    },
    setChatSummary: (state, action: PayloadAction<string>) => {
      state.chatSummary = action.payload
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
  generateChatSummary,
} = chatSlice.actions
export default chatSlice.reducer
