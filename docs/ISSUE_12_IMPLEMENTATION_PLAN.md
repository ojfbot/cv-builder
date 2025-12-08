# Issue #12 Implementation Plan: Bio File Interaction Enhancements

**Issue**: [#12 - Extend Bio Dashboard File Interaction Buttons with AI Chat and Preview](https://github.com/ojfbot/cv-builder/issues/12)

**Branch**: `bio-dashboard`

**Target**: Add document preview (eyeball icon) and AI chat (robot icon) to Bio Dashboard file interactions

---

## Overview

This document provides a phased implementation plan for adding two key features to the Bio Dashboard:
1. **Document Preview (👁️)**: View file contents in a modal
2. **AI Document Chat (🤖)**: Interact with AI about specific documents

## Architecture Integration

### Existing Infrastructure We Leverage
- ✅ Resume parsing (PDF, DOCX, TXT, MD) - `packages/api/src/routes/bio-files.ts:98-122`
- ✅ File metadata system - `packages/agent-core/src/models/bio.ts:93-110`
- ✅ Preview endpoint - `packages/api/src/routes/bio-files.ts:233-270`
- ✅ Carbon Design System - Bio Dashboard uses consistent components
- ✅ Browser automation - `packages/browser-automation/` for testing
- ✅ Screenshot system - For documentation and validation
- ✅ Multi-agent architecture - For AI summarization

### New Components to Build
- ❌ `DocumentPreviewModal` component
- ❌ `DocumentChatModal` component
- ❌ `/api/bios/files/:fileId/summarize` endpoint
- ❌ `/api/bios/files/:fileId/chat` endpoint
- ❌ Extended `BioFile` metadata schema
- ❌ Document annotation storage

---

## Phase 1: Document Preview Feature (Eyeball Icon) 👁️

**Goal**: Allow users to quickly preview uploaded files without downloading

### 1.1 Backend: Enhance Preview Endpoint

**File**: `packages/api/src/routes/bio-files.ts`

**Changes Needed**:
- ✅ Preview endpoint exists (line 233)
- Enhance to return full text for text files (not just 500 char preview)
- Add format-specific metadata (page count for PDFs, dimensions for images)

**Code Changes**:
```typescript
// Add query parameter for full content
router.get('/files/:fileId/preview', async (req, res, next) => {
  const { fileId } = req.params
  const { full = false } = req.query // New parameter

  // ... existing validation ...

  // For text files, return full content if requested
  if (textTypes.includes(file.type) && full) {
    preview = await bioFileManager.extractFullText(fileId)
  }

  res.json({
    fileId,
    name: file.originalName,
    type: file.type,
    preview,
    thumbnail,
    metadata: {
      ...file.metadata,
      parsedContent: file.metadata?.parsedContent, // Include parsed resume content
    },
  })
})
```

**Testing**:
- Unit test for full text extraction
- Test with different file formats (PDF, TXT, MD, JSON, images)

### 1.2 Frontend: Add Preview Button

**File**: `packages/browser-app/src/components/BioDashboard.tsx`

**Location**: Line 334-354 (file table action buttons)

**Code Changes**:
```typescript
import { ViewFilled } from '@carbon/icons-react'

// Inside TableCell actions (line 334)
<TableCell>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <Button
      data-element="bio-file-preview-button"
      size="sm"
      kind="ghost"
      renderIcon={ViewFilled}
      iconDescription="Preview"
      hasIconOnly
      onClick={() => handlePreviewFile(file.id)}
    />
    <Button
      data-element="bio-file-download-button"
      size="sm"
      kind="ghost"
      renderIcon={Download}
      iconDescription="Download"
      hasIconOnly
      onClick={() => handleDownloadFile(file.id, file.originalName)}
    />
    <Button
      data-element="bio-file-delete-button"
      size="sm"
      kind="danger--ghost"
      renderIcon={TrashCan}
      iconDescription="Delete"
      hasIconOnly
      onClick={() => handleDeleteFile(file.id)}
    />
  </div>
</TableCell>
```

### 1.3 Frontend: DocumentPreviewModal Component

**New File**: `packages/browser-app/src/components/DocumentPreviewModal.tsx`

**Component Structure**:
```typescript
import { Modal, Loading, InlineNotification } from '@carbon/react'
import { useEffect, useState } from 'react'
import { bioFilesApi } from '../api/bioFilesApi'

interface DocumentPreviewModalProps {
  fileId: string
  fileName: string
  onClose: () => void
}

export function DocumentPreviewModal({ fileId, fileName, onClose }: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  useEffect(() => {
    loadPreview()
  }, [fileId])

  const loadPreview = async () => {
    try {
      const data = await bioFilesApi.getPreview(fileId, { full: true })
      setPreview(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading) return <Loading description="Loading preview..." />
    if (error) return <InlineNotification kind="error" title="Error" subtitle={error} />

    // Render based on file type
    switch (preview.type) {
      case 'image':
        return <img src={preview.url} alt={fileName} style={{ maxWidth: '100%' }} />
      case 'pdf':
        return <PDFViewer url={preview.url} />
      case 'text':
        return <pre style={{ whiteSpace: 'pre-wrap' }}>{preview.content}</pre>
      case 'json':
        return <JsonViewer data={JSON.parse(preview.content)} />
      default:
        return <div>Preview not available for this file type</div>
    }
  }

  return (
    <Modal
      data-element="document-preview-modal"
      open
      modalHeading={`Preview: ${fileName}`}
      primaryButtonText="Close"
      onRequestClose={onClose}
      size="lg"
    >
      {renderContent()}
    </Modal>
  )
}
```

### 1.4 API Client: Add Preview Method

**File**: `packages/browser-app/src/api/bioFilesApi.ts`

**Add Method**:
```typescript
async getPreview(fileId: string, options?: { full?: boolean }): Promise<PreviewData> {
  const params = new URLSearchParams()
  if (options?.full) params.set('full', 'true')

  const response = await fetch(`${this.baseUrl}/files/${fileId}/preview?${params}`)
  if (!response.ok) throw new Error('Failed to load preview')
  return response.json()
}
```

### 1.5 Testing: Browser Automation

**New File**: `packages/browser-automation/tests/cv-builder/bio-files/preview.test.ts`

**Test Cases**:
```typescript
import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js'

const { suite, client } = createTestSuite('Bio Files - Preview Feature', API_URL)

suite.test('Preview button appears on file rows', async ({ assert }) => {
  await client.navigate(`${APP_URL}?tab=bio&view=files`)
  await assert.elementVisible('[data-element="bio-file-preview-button"]')
})

suite.test('Click preview button opens modal', async ({ assert }) => {
  await client.click('[data-element="bio-file-preview-button"]')
  await assert.elementVisible('[data-element="document-preview-modal"]')

  // Capture screenshot
  const screenshot = await client.screenshot({
    name: 'bio-file-preview-modal',
    path: 'temp/screenshots/issue-12'
  })
  assert.screenshotCaptured(screenshot)
})

suite.test('Preview displays text file content', async ({ assert }) => {
  // Assumes a test file was uploaded
  await assert.elementVisible('[data-element="document-preview-modal"] pre')
})

suite.test('Preview modal closes on button click', async ({ assert }) => {
  await client.click('[data-element="document-preview-modal"] button:has-text("Close")')
  await assert.elementNotVisible('[data-element="document-preview-modal"]')
})
```

### 1.6 Deliverables

- [ ] Enhanced `/preview` endpoint with `full` parameter
- [ ] Preview button in file table with `ViewFilled` icon
- [ ] `DocumentPreviewModal` component
- [ ] API client method `getPreview()`
- [ ] Browser automation test suite
- [ ] Screenshots for documentation
- [ ] Type-check passes
- [ ] Security audit passes

---

## Phase 2: Document Processing Backend 🔧

**Goal**: Generate AI summaries of uploaded documents

### 2.1 Data Model: Extend BioFile Schema

**File**: `packages/agent-core/src/models/bio.ts`

**Changes**:
```typescript
export const DocumentAnnotationSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['highlight', 'note', 'exclude']),
  createdAt: z.string(), // ISO date
})

export const BioFileSchema = z.object({
  // ... existing fields ...

  // New fields
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  aiSummary: z.string().optional(),
  annotations: z.array(DocumentAnnotationSchema).optional(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
  processedAt: z.string().optional(), // ISO date
})

export type DocumentAnnotation = z.infer<typeof DocumentAnnotationSchema>
```

### 2.2 Backend: Summarization Agent

**New File**: `packages/agent-core/src/agents/document-summary-agent.ts`

**Implementation**:
```typescript
import { BaseAgent } from './base-agent'

export class DocumentSummaryAgent extends BaseAgent {
  protected getSystemPrompt(): string {
    return `You are a document analysis expert specializing in resume and professional document summarization.

Your role:
- Analyze uploaded documents (resumes, cover letters, portfolios)
- Generate concise, informative summaries
- Extract key information (skills, experience, education)
- Identify strengths and areas of focus
- Provide contextual insights for the user

When summarizing:
1. Be concise (2-4 sentences for summary)
2. Highlight most relevant professional information
3. Note any standout achievements or unique skills
4. Suggest how this document fits into the user's professional narrative

Output format:
{
  "summary": "Brief 2-4 sentence summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "documentType": "resume" | "cover_letter" | "portfolio" | "other",
  "suggestedUse": "How this document could be used in CV Builder"
}
`
  }

  async summarizeDocument(
    text: string,
    filename: string,
    metadata?: Record<string, any>
  ): Promise<DocumentSummary> {
    const prompt = `Analyze this document and provide a summary.

Filename: ${filename}
${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}

Document Content:
${text}

Provide your analysis in JSON format as specified.`

    const response = await this.chat(prompt)

    try {
      return JSON.parse(response)
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: response.substring(0, 500),
        keyPoints: [],
        documentType: 'other',
        suggestedUse: 'Document uploaded to Bio library',
      }
    }
  }
}
```

### 2.3 Backend: Summarization Endpoint

**File**: `packages/api/src/routes/bio-files.ts`

**New Endpoint**:
```typescript
import { DocumentSummaryAgent } from '@cv-builder/agent-core/agents/document-summary-agent'

// POST /api/bios/files/:fileId/summarize
router.post('/files/:fileId/summarize', async (req, res, next) => {
  try {
    const { fileId } = req.params

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Check if already summarized
    if (file.metadata?.aiSummary && !req.body.force) {
      return res.json({
        summary: file.metadata.aiSummary,
        cached: true,
      })
    }

    // Update status to processing
    await bioFileManager.updateFile(fileId, {
      processingStatus: 'processing',
    })

    // Get parsed content or extract text
    let text = file.metadata?.parsedContent?.text

    if (!text) {
      text = await bioFileManager.extractFullText(fileId)
    }

    if (!text) {
      await bioFileManager.updateFile(fileId, {
        processingStatus: 'failed',
      })
      return res.status(400).json({ error: 'Could not extract text from document' })
    }

    // Generate summary using agent
    const agent = new DocumentSummaryAgent()
    const summary = await agent.summarizeDocument(text, file.originalName, file.metadata)

    // Store summary in metadata
    await bioFileManager.updateFile(fileId, {
      aiSummary: JSON.stringify(summary),
      processingStatus: 'completed',
      processedAt: new Date().toISOString(),
    })

    res.json({
      summary,
      cached: false,
    })
  } catch (error) {
    // Update status to failed
    await bioFileManager.updateFile(req.params.fileId, {
      processingStatus: 'failed',
    })
    next(error)
  }
})
```

### 2.4 Testing: Summarization Endpoint

**New File**: `packages/api/src/routes/__tests__/bio-files-summarize.test.ts`

**Test Cases**:
```typescript
describe('POST /api/bios/files/:fileId/summarize', () => {
  it('generates summary for uploaded resume', async () => {
    // Upload test file
    const file = await uploadTestFile('test-resume.pdf')

    // Request summary
    const response = await request(app)
      .post(`/api/bios/files/${file.id}/summarize`)
      .expect(200)

    expect(response.body.summary).toBeDefined()
    expect(response.body.summary.summary).toHaveLength.greaterThan(10)
    expect(response.body.cached).toBe(false)
  })

  it('returns cached summary on subsequent requests', async () => {
    const file = await uploadTestFile('test-resume.pdf')

    // First request
    await request(app).post(`/api/bios/files/${file.id}/summarize`)

    // Second request
    const response = await request(app)
      .post(`/api/bios/files/${file.id}/summarize`)
      .expect(200)

    expect(response.body.cached).toBe(true)
  })

  it('handles force re-summarization', async () => {
    const file = await uploadTestFile('test-resume.pdf')
    await request(app).post(`/api/bios/files/${file.id}/summarize`)

    const response = await request(app)
      .post(`/api/bios/files/${file.id}/summarize`)
      .send({ force: true })
      .expect(200)

    expect(response.body.cached).toBe(false)
  })

  it('handles files without text content', async () => {
    const file = await uploadTestFile('test-image.png')

    const response = await request(app)
      .post(`/api/bios/files/${file.id}/summarize`)
      .expect(400)

    expect(response.body.error).toContain('extract text')
  })
})
```

### 2.5 Deliverables

- [ ] Extended `BioFileSchema` with AI fields
- [ ] `DocumentSummaryAgent` implementation
- [ ] `/api/bios/files/:fileId/summarize` endpoint
- [ ] Unit tests for summarization
- [ ] Error handling and status updates
- [ ] Type definitions exported from agent-core

---

## Phase 3: AI Document Chat (Robot Icon) 🤖

**Goal**: Interactive AI chat about specific documents

### 3.1 Frontend: Add Chat Button

**File**: `packages/browser-app/src/components/BioDashboard.tsx`

**Code Changes**:
```typescript
import { ChatBot } from '@carbon/icons-react'

// Inside TableCell actions (line 334)
<TableCell>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <Button
      data-element="bio-file-chat-button"
      size="sm"
      kind="ghost"
      renderIcon={ChatBot}
      iconDescription="Chat about document"
      hasIconOnly
      onClick={() => handleChatAboutFile(file.id)}
    />
    <Button
      data-element="bio-file-preview-button"
      size="sm"
      kind="ghost"
      renderIcon={ViewFilled}
      iconDescription="Preview"
      hasIconOnly
      onClick={() => handlePreviewFile(file.id)}
    />
    {/* ... other buttons ... */}
  </div>
</TableCell>
```

### 3.2 Frontend: DocumentChatModal Component

**New File**: `packages/browser-app/src/components/DocumentChatModal.tsx`

**Component Structure**:
```typescript
import { Modal, Button, TextArea, Loading } from '@carbon/react'
import { Send } from '@carbon/icons-react'
import { useState, useEffect, useRef } from 'react'
import { bioFilesApi } from '../api/bioFilesApi'

interface DocumentChatModalProps {
  fileId: string
  fileName: string
  onClose: () => void
}

export function DocumentChatModal({ fileId, fileName, onClose }: DocumentChatModalProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DocumentSummary | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDocumentContext()
  }, [fileId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadDocumentContext = async () => {
    try {
      // Get or generate summary
      const summaryData = await bioFilesApi.getSummary(fileId)
      setSummary(summaryData.summary)

      // Load existing chat history if any
      const file = await bioFilesApi.getFile(fileId)
      if (file.metadata?.chatHistory) {
        setMessages(file.metadata.chatHistory)
      } else {
        // Initialize with AI introduction
        setMessages([{
          role: 'assistant',
          content: generateIntroMessage(summaryData.summary),
          timestamp: new Date().toISOString(),
        }])
      }
    } catch (error) {
      console.error('Failed to load document context:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateIntroMessage = (summary: DocumentSummary): string => {
    return `I've analyzed "${fileName}". Here's what I found:

**Summary**: ${summary.summary}

**Key Points**:
${summary.keyPoints.map(p => `- ${p}`).join('\n')}

**Suggested Use**: ${summary.suggestedUse}

I can help you:
- Answer questions about this document
- Add annotations and highlights
- Extract specific information
- Suggest how to use this in your CV

What would you like to know?`
  }

  const handleSend = async () => {
    if (!input.trim() || streaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setStreaming(true)

    try {
      // Stream response from backend
      const stream = await bioFilesApi.chatStream(fileId, input, messages)

      let assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMessage])

      for await (const chunk of stream) {
        assistantMessage.content += chunk
        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...assistantMessage }
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setStreaming(false)
    }
  }

  return (
    <Modal
      data-element="document-chat-modal"
      open
      modalHeading={`Chat: ${fileName}`}
      onRequestClose={onClose}
      size="lg"
      passiveModal
    >
      <div style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Loading description="Loading document context..." />
        ) : (
          <>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--cds-layer-01)' }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: msg.role === 'user' ? 'var(--cds-layer-02)' : 'transparent',
                    borderLeft: msg.role === 'assistant' ? '3px solid var(--cds-border-interactive)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--cds-border-subtle)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TextArea
                  data-element="document-chat-input"
                  placeholder="Ask about this document..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={streaming}
                  rows={2}
                  style={{ flex: 1 }}
                />
                <Button
                  data-element="document-chat-send"
                  renderIcon={Send}
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                >
                  {streaming ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
```

### 3.3 Backend: Document Chat Agent

**New File**: `packages/agent-core/src/agents/document-chat-agent.ts`

**Implementation**:
```typescript
import { BaseAgent } from './base-agent'

export class DocumentChatAgent extends BaseAgent {
  protected getSystemPrompt(): string {
    return `You are a helpful AI assistant specialized in analyzing professional documents (resumes, CVs, cover letters, portfolios).

Your capabilities:
- Answer questions about document content
- Help users understand and organize their professional information
- Suggest annotations, highlights, and exclusions
- Provide contextual career advice
- Extract specific information on request

Guidelines:
- Be conversational and helpful
- Reference specific parts of the document when relevant
- Suggest actionable improvements
- Help users see how this document fits their career narrative
- When asked to annotate, respond with structured annotation data

Context will be provided:
- Document text content
- Document metadata (type, filename, etc.)
- Previous conversation history
- Any existing annotations
`
  }

  async chat(
    message: string,
    documentText: string,
    documentMetadata: Record<string, any>,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const context = `
Document: ${documentMetadata.filename}
Type: ${documentMetadata.type || 'unknown'}

Content:
${documentText.substring(0, 5000)}${documentText.length > 5000 ? '\n... (truncated)' : ''}

---
User: ${message}
`

    // Add conversation history to context
    const historyPrompt = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = historyPrompt ? `${historyPrompt}\n\n${context}` : context

    return this.chat(fullPrompt)
  }

  async *streamChat(
    message: string,
    documentText: string,
    documentMetadata: Record<string, any>,
    conversationHistory: ChatMessage[]
  ): AsyncGenerator<string> {
    // Similar to chat() but uses streamChat()
    const context = `
Document: ${documentMetadata.filename}

Content:
${documentText.substring(0, 5000)}${documentText.length > 5000 ? '\n... (truncated)' : ''}

User: ${message}
`

    const historyPrompt = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = historyPrompt ? `${historyPrompt}\n\n${context}` : context

    for await (const chunk of this.streamChat(fullPrompt)) {
      yield chunk
    }
  }
}
```

### 3.4 Backend: Chat Endpoint

**File**: `packages/api/src/routes/bio-files.ts`

**New Endpoint**:
```typescript
import { DocumentChatAgent } from '@cv-builder/agent-core/agents/document-chat-agent'

// POST /api/bios/files/:fileId/chat
router.post('/files/:fileId/chat', async (req, res, next) => {
  try {
    const { fileId } = req.params
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Get document text
    let text = file.metadata?.parsedContent?.text
    if (!text) {
      text = await bioFileManager.extractFullText(fileId)
    }

    if (!text) {
      return res.status(400).json({ error: 'Could not extract text from document' })
    }

    // Check if streaming is requested
    const stream = req.query.stream === 'true'

    const agent = new DocumentChatAgent()

    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      try {
        for await (const chunk of agent.streamChat(
          message,
          text,
          { filename: file.originalName, type: file.type },
          history
        )) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        }

        res.write('data: [DONE]\n\n')
        res.end()
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        res.end()
      }
    } else {
      // Non-streaming response
      const response = await agent.chat(
        message,
        text,
        { filename: file.originalName, type: file.type },
        history
      )

      res.json({ response })
    }

    // Update chat history in metadata (async, don't block response)
    bioFileManager.updateFile(fileId, {
      chatHistory: [
        ...(file.metadata?.chatHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response || '', timestamp: new Date().toISOString() },
      ],
    }).catch(err => console.error('Failed to update chat history:', err))

  } catch (error) {
    next(error)
  }
})
```

### 3.5 API Client: Chat Methods

**File**: `packages/browser-app/src/api/bioFilesApi.ts`

**Add Methods**:
```typescript
async getSummary(fileId: string, force = false): Promise<{ summary: DocumentSummary, cached: boolean }> {
  const response = await fetch(`${this.baseUrl}/files/${fileId}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  })
  if (!response.ok) throw new Error('Failed to get summary')
  return response.json()
}

async *chatStream(
  fileId: string,
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  const response = await fetch(`${this.baseUrl}/files/${fileId}/chat?stream=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })

  if (!response.ok) throw new Error('Failed to start chat')

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const json = JSON.parse(data)
          if (json.chunk) yield json.chunk
          if (json.error) throw new Error(json.error)
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }
}
```

### 3.6 Testing: Browser Automation

**New File**: `packages/browser-automation/tests/cv-builder/bio-files/chat.test.ts`

**Test Cases**:
```typescript
suite.test('Chat button appears on file rows', async ({ assert }) => {
  await client.navigate(`${APP_URL}?tab=bio&view=files`)
  await assert.elementVisible('[data-element="bio-file-chat-button"]')
})

suite.test('Click chat button opens modal with summary', async ({ assert }) => {
  await client.click('[data-element="bio-file-chat-button"]')
  await assert.elementVisible('[data-element="document-chat-modal"]')

  // Wait for summary to load
  await client.waitForSelector('[data-element="document-chat-modal"]', { timeout: 10000 })

  // Capture screenshot
  const screenshot = await client.screenshot({
    name: 'bio-file-chat-modal-summary',
    path: 'temp/screenshots/issue-12'
  })
  assert.screenshotCaptured(screenshot)
})

suite.test('Send message and receive response', async ({ assert }) => {
  const input = '[data-element="document-chat-input"]'
  const send = '[data-element="document-chat-send"]'

  await client.fill(input, 'What are the key skills mentioned?')
  await client.click(send)

  // Wait for response (streaming)
  await client.waitForSelector('.message-role:has-text("AI Assistant")', { timeout: 15000 })

  await assert.elementVisible('.message-role:has-text("AI Assistant")')

  // Capture screenshot
  const screenshot = await client.screenshot({
    name: 'bio-file-chat-with-response',
    path: 'temp/screenshots/issue-12'
  })
  assert.screenshotCaptured(screenshot)
})

suite.test('Chat modal closes on X button', async ({ assert }) => {
  await client.click('[data-element="document-chat-modal"] .cds--modal-close')
  await assert.elementNotVisible('[data-element="document-chat-modal"]')
})
```

### 3.7 Deliverables

- [ ] Chat button in file table with `ChatBot` icon
- [ ] `DocumentChatModal` component with streaming
- [ ] `DocumentChatAgent` implementation
- [ ] `/api/bios/files/:fileId/chat` endpoint with SSE streaming
- [ ] API client methods for summary and chat
- [ ] Chat history persistence in metadata
- [ ] Browser automation test suite
- [ ] Screenshots for all chat states
- [ ] Type definitions for chat messages

---

## Phase 4: Integration & Polish 🧪

### 4.1 Testing Checklist

**Unit Tests**:
- [ ] Bio file schema validation
- [ ] Document summary agent
- [ ] Document chat agent
- [ ] API endpoints (preview, summarize, chat)
- [ ] API client methods

**Integration Tests**:
- [ ] End-to-end file upload → summarize → chat flow
- [ ] SSE streaming functionality
- [ ] Error handling and recovery
- [ ] Chat history persistence

**Browser Automation Tests**:
- [ ] Preview modal interaction
- [ ] Chat modal interaction
- [ ] Streaming response display
- [ ] Error state handling
- [ ] Responsive design validation

### 4.2 Screenshot Coverage

**Required Screenshots** (in `temp/screenshots/issue-12/`):
- [ ] `bio-files-table-with-actions.png` - File table showing all action buttons
- [ ] `document-preview-modal-text.png` - Preview modal with text file
- [ ] `document-preview-modal-pdf.png` - Preview modal with PDF
- [ ] `document-preview-modal-image.png` - Preview modal with image
- [ ] `document-chat-modal-summary.png` - Chat modal showing initial summary
- [ ] `document-chat-modal-conversation.png` - Chat with Q&A exchange
- [ ] `document-chat-modal-streaming.png` - Chat while streaming response
- [ ] `document-preview-loading.png` - Loading state
- [ ] `document-chat-error.png` - Error state

**Viewport Variants**:
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 390x844

### 4.3 Documentation Updates

**Files to Update**:
- [ ] `docs/UPLOAD_FEATURE.md` - Add preview and chat features
- [ ] `docs/AGENTS_GUIDE.md` - Document new agents
- [ ] `CLAUDE.md` - Update feature list
- [ ] `README.md` - Add screenshots

**New Documentation**:
- [ ] `docs/DOCUMENT_CHAT.md` - Comprehensive guide to document chat feature
- [ ] `docs/screenshots/bio-files/README.md` - Screenshot documentation

### 4.4 Security Audit

**Checklist**:
- [ ] API keys never exposed to browser
- [ ] File access restricted by authentication
- [ ] User input sanitized in chat
- [ ] Rate limiting on AI endpoints
- [ ] File size limits enforced
- [ ] MIME type validation
- [ ] XSS prevention in chat display
- [ ] CSRF protection on POST endpoints

### 4.5 Performance Optimization

**Checklist**:
- [ ] Lazy load modals (don't render until opened)
- [ ] Cache AI summaries in metadata
- [ ] Stream chat responses for better UX
- [ ] Debounce/throttle preview requests
- [ ] Use thumbnails for image previews
- [ ] Limit chat history length
- [ ] Add loading skeletons for better perceived performance

### 4.6 Accessibility

**Checklist**:
- [ ] Modals have proper ARIA labels
- [ ] Keyboard navigation works for all buttons
- [ ] Screen reader announcements for streaming
- [ ] Focus management (modal open/close)
- [ ] Color contrast meets WCAG AA
- [ ] All interactive elements are keyboard accessible

### 4.7 Final Deliverables

- [ ] All Phase 1-3 deliverables completed
- [ ] Comprehensive test coverage (unit + integration + browser)
- [ ] Complete screenshot documentation
- [ ] Updated user-facing documentation
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Type-check passes across all packages
- [ ] Build succeeds without warnings
- [ ] Ready for PR and code review

---

## Timeline & Dependencies

### Phase 1: Document Preview (Est: 3-4 days)
- Day 1: Backend enhancements, preview button
- Day 2: DocumentPreviewModal component
- Day 3: Browser automation tests, screenshots
- Day 4: Polish, documentation

### Phase 2: Document Processing (Est: 2-3 days)
- Day 1: Data model extension, DocumentSummaryAgent
- Day 2: Summarization endpoint, tests
- Day 3: Integration testing, error handling

### Phase 3: AI Document Chat (Est: 4-5 days)
- Day 1: Chat button, DocumentChatModal structure
- Day 2: DocumentChatAgent, chat endpoint
- Day 3: SSE streaming implementation
- Day 4: Browser automation tests
- Day 5: Polish, chat history persistence

### Phase 4: Integration & Polish (Est: 2-3 days)
- Day 1: Full integration testing, bug fixes
- Day 2: Screenshot coverage, documentation
- Day 3: Security audit, performance optimization, accessibility

**Total Estimated Time**: 11-15 days

### Critical Dependencies
1. Phase 2 must complete before Phase 3 (chat needs summaries)
2. Phase 1 can proceed independently
3. Phase 4 requires all previous phases complete

---

## Success Criteria

### Must Have
- ✅ Preview and chat buttons appear on all file rows
- ✅ Preview modal displays content for supported formats
- ✅ Chat modal auto-generates summaries on first open
- ✅ Chat supports streaming responses
- ✅ All browser automation tests pass
- ✅ Security audit passes (no exposed API keys)
- ✅ Type-check passes

### Should Have
- ✅ Chat history persists across sessions
- ✅ Annotations can be added via chat
- ✅ Responsive design works on all viewports
- ✅ Loading states are polished
- ✅ Error states are user-friendly
- ✅ Screenshot documentation is comprehensive

### Nice to Have
- 🎯 PDF preview with page navigation
- 🎯 Syntax highlighting for code files
- 🎯 Export chat transcript
- 🎯 Share document summary
- 🎯 Batch summarize all files

---

## Risk Mitigation

### Technical Risks
- **Risk**: AI summarization is slow
  - **Mitigation**: Use streaming, show progress, cache results
- **Risk**: Large documents exceed token limits
  - **Mitigation**: Truncate with intelligent chunking, show warning
- **Risk**: SSE streaming compatibility issues
  - **Mitigation**: Fallback to polling, test across browsers

### UX Risks
- **Risk**: Too many modals disrupt workflow
  - **Mitigation**: Consider slide-out panels as alternative
- **Risk**: Chat takes too long to respond
  - **Mitigation**: Show typing indicator, stream responses
- **Risk**: Users don't understand chat capabilities
  - **Mitigation**: Provide suggested questions in intro message

### Security Risks
- **Risk**: Chat could expose sensitive file content
  - **Mitigation**: Ensure authentication on all endpoints
- **Risk**: Malicious file upload could break parser
  - **Mitigation**: Robust error handling, file type validation

---

## Post-Launch Iterations

### Iteration 1: Enhanced Annotations
- Visual annotation interface (highlight text)
- Annotation categories (skills, experience, education)
- Export annotated document

### Iteration 2: Multi-Document Chat
- Chat across multiple uploaded files
- Compare documents (different resume versions)
- Merge insights from multiple sources

### Iteration 3: Advanced Previews
- DOCX rendering with formatting
- Excel preview for CSV/XLSX
- Code preview with syntax highlighting

---

## References

- Issue: https://github.com/ojfbot/cv-builder/issues/12
- Branch: `bio-dashboard`
- Carbon Design System: https://carbondesignsystem.com/
- Browser Automation: `packages/browser-automation/README.md`
- Agent Guide: `docs/AGENTS_GUIDE.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-07
**Status**: Ready for Implementation
