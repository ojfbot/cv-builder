import Anthropic from '@anthropic-ai/sdk'

// Tool definitions for Claude's function calling
export const CREATE_RESEARCH_TOOL: Anthropic.Tool = {
  name: 'create_research_entry',
  description: 'Create a new research entry and save it to the research database. Use this when the user asks to research a company, analyze an industry, prepare interview materials, or save any career-related information. After creating the entry, automatically navigate the user to the Research tab to view it.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A clear, concise title for the research entry (e.g., "Domo Inc. Company Intelligence")'
      },
      type: {
        type: 'string',
        enum: [
          'company_intelligence',
          'industry_analysis',
          'role_research',
          'salary_data',
          'interview_prep',
          'market_trends',
          'best_practices',
          'other'
        ],
        description: 'The type/category of research'
      },
      content: {
        type: 'string',
        description: 'The full research content in markdown format. Should be comprehensive and well-structured with headings, bullet points, etc.'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of relevant tags for categorization and search (e.g., ["company", "BI", "sales", "domo"])'
      },
      source: {
        type: 'string',
        description: 'Optional source URL or reference for the information'
      },
      jobId: {
        type: 'string',
        description: 'Optional job ID if this research is related to a specific job listing'
      }
    },
    required: ['title', 'type', 'content', 'tags']
  }
}

export const NAVIGATE_TO_TAB_TOOL: Anthropic.Tool = {
  name: 'navigate_to_tab',
  description: 'Navigate the user to a specific tab in the application. Use this after creating content to show it to the user.',
  input_schema: {
    type: 'object',
    properties: {
      tabIndex: {
        type: 'number',
        enum: [0, 1, 2, 3, 4],
        description: 'Tab index: 0=Interactive, 1=Bio, 2=Jobs, 3=Outputs, 4=Research'
      },
      reason: {
        type: 'string',
        description: 'Brief explanation for why the user is being navigated (shown to user)'
      }
    },
    required: ['tabIndex', 'reason']
  }
}

export const ALL_TOOLS: Anthropic.Tool[] = [
  CREATE_RESEARCH_TOOL,
  NAVIGATE_TO_TAB_TOOL
]
