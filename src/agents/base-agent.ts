import Anthropic from '@anthropic-ai/sdk'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

export interface ToolUse {
  toolName: string
  toolInput: any
}

export interface AgentMetadata {
  agent: string
  timestamp: string
  tokens?: number
}

export abstract class BaseAgent {
  protected client: Anthropic
  protected conversationHistory: AgentMessage[] = []

  constructor(
    protected apiKey: string,
    protected agentName: string
  ) {
    // Enable browser usage (only for development/demo)
    // In production, use a backend server to protect your API key
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  protected abstract getSystemPrompt(): string

  protected async chat(
    userMessage: string,
    options?: {
      stream?: boolean
      maxTokens?: number
    }
  ): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      stream: options?.stream || false,
    })

    if ('content' in response) {
      const assistantMessage = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('')

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      })

      return assistantMessage
    }

    throw new Error('Unexpected response format')
  }

  protected async streamChat(
    userMessage: string,
    onChunk: (text: string) => void,
    options?: {
      tools?: Anthropic.Tool[]
      onToolUse?: (toolUse: ToolUse) => void
    }
  ): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    })

    const stream = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      tools: options?.tools,
      stream: true,
    })

    let fullResponse = ''
    const contentBlocks: Anthropic.ContentBlock[] = []
    let currentToolUse: any = null

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text
        fullResponse += text
        onChunk(text)
      } else if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        currentToolUse = {
          type: 'tool_use',
          id: event.content_block.id,
          name: event.content_block.name,
          input: {}
        }
      } else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        if (currentToolUse) {
          // Accumulate tool input
          const partialInput = event.delta.partial_json
          currentToolUse.input = JSON.parse((JSON.stringify(currentToolUse.input) + partialInput).replace(/}{/g, ','))
        }
      } else if (event.type === 'content_block_stop' && currentToolUse) {
        contentBlocks.push(currentToolUse)
        if (options?.onToolUse) {
          options.onToolUse({
            toolName: currentToolUse.name,
            toolInput: currentToolUse.input
          })
        }
        currentToolUse = null
      }
    }

    // Store the full content (text + tool uses)
    if (contentBlocks.length > 0 || fullResponse) {
      const content: Anthropic.ContentBlock[] = []
      if (fullResponse) {
        content.push({ type: 'text', text: fullResponse })
      }
      content.push(...contentBlocks)

      this.conversationHistory.push({
        role: 'assistant',
        content: content.length === 1 && content[0].type === 'text' ? fullResponse : content,
      })
    } else {
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      })
    }

    return fullResponse
  }

  clearHistory(): void {
    this.conversationHistory = []
  }

  getHistory(): AgentMessage[] {
    return [...this.conversationHistory]
  }
}
