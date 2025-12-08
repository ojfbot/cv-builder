import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { FileListQuerySchema, ParsedResumeContent, DocumentSummary } from '@cv-builder/agent-core'
import { parseResume } from '@cv-builder/agent-core/utils/resume-parser'
import { getConfig } from '@cv-builder/agent-core/utils/config'
import { DocumentSummaryAgent } from '../../../agent-core/src/agents/document-summary-agent.js'
import { DocumentChatAgent } from '../../../agent-core/src/agents/document-chat-agent.js'
import { bioFileManager } from '../services/bio-file-manager'
import { upload, validateFileContent } from '../middleware/file-upload'
import { authenticate } from '../middleware/auth'

const router = Router()

// Apply authentication to all bio file routes
router.use(authenticate)

/**
 * Helper: Parse document on-demand if not already parsed
 * Extracts text from PDF/DOCX files and caches the result in file metadata
 */
async function getOrParseDocumentText(
  file: Awaited<ReturnType<typeof bioFileManager.getFile>>
): Promise<{ text: string | null; parsedContent: any }> {
  if (!file) {
    return { text: null, parsedContent: undefined }
  }

  // Return cached parsed content if available
  if (file.metadata?.parsedContent?.text) {
    return {
      text: file.metadata.parsedContent.text,
      parsedContent: file.metadata.parsedContent,
    }
  }

  // Parse PDF/DOCX files on-demand
  const resumeFormats = ['.pdf', '.docx']
  const fileExt = path.extname(file.originalName).toLowerCase()

  if (resumeFormats.includes(fileExt)) {
    try {
      const filePath = await bioFileManager.getFilePath(file.id)
      if (filePath) {
        const buffer = await fs.readFile(filePath)
        const parsed = await parseResume(buffer, file.originalName, file.type)

        const parsedContent = {
          text: parsed.text,
          wordCount: parsed.metadata.wordCount,
          pageCount: parsed.metadata.pageCount,
          extractedAt: new Date().toISOString(),
        }

        // Cache parsed content for future use
        await bioFileManager.updateFile(file.id, {
          metadata: {
            ...file.metadata,
            parsedContent,
          },
        })

        return { text: parsed.text, parsedContent }
      }
    } catch (parseError) {
      console.error('Failed to parse document:', parseError)
      // Fall through to extractFullText
    }
  }

  // Fallback to extractFullText for text-based files
  const text = await bioFileManager.extractFullText(file.id)
  return { text, parsedContent: undefined }
}

// 1. List files
// GET /api/bios/files
router.get('/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate query parameters
    const query = FileListQuerySchema.parse({
      type: req.query.type,
      sortBy: req.query.sortBy,
      order: req.query.order,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    })

    const files = await bioFileManager.listFiles(query)

    // Convert dates to ISO strings for JSON serialization
    const serializedFiles = files.map(file => ({
      ...file,
      modified: file.modified.toISOString(),
      created: file.created.toISOString(),
    }))

    res.json({ files: serializedFiles })
  } catch (error) {
    next(error)
  }
})

// 2. Read/Download file
// GET /api/bios/files/:fileId
router.get('/files/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    const filePath = await bioFileManager.getFilePath(fileId)
    if (!filePath) {
      return res.status(404).json({ error: 'File not found on disk' })
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.type)
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`)

    // Stream the file
    res.sendFile(filePath)
  } catch (error) {
    next(error)
  }
})

// 3. Upload file
// POST /api/bios/files
router.post(
  '/files',
  upload.single('file'),
  validateFileContent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const overwrite = req.body.overwrite === 'true' || req.body.overwrite === true

      // Check if file with same name exists
      const existsByName = await bioFileManager.fileExistsByName(req.file.originalname)

      if (existsByName && !overwrite) {
        return res.status(409).json({
          error: 'File with this name already exists',
          message: 'Set overwrite=true to replace the existing file',
        })
      }

      // Extract file ID from stored filename (UUID)
      const fileId = path.basename(req.file.filename, path.extname(req.file.filename))

      // Parse resume content for supported formats (PDF, DOCX, TXT, MD)
      let parsedContent: ParsedResumeContent | undefined
      const resumeFormats = ['.pdf', '.docx', '.txt', '.md']
      const fileExt = path.extname(req.file.originalname).toLowerCase()

      if (resumeFormats.includes(fileExt)) {
        try {
          // Read the uploaded file buffer
          const buffer = await fs.readFile(req.file.path)

          // Parse the resume
          const parsed = await parseResume(buffer, req.file.originalname, req.file.mimetype)

          // Convert to our schema format
          parsedContent = {
            text: parsed.text,
            wordCount: parsed.metadata.wordCount,
            pageCount: parsed.metadata.pageCount,
            extractedAt: parsed.metadata.uploadDate,
          }
        } catch (parseError) {
          // Log parsing error but don't fail the upload
          console.warn(`Failed to parse resume ${req.file.originalname}:`, parseError)
        }
      }

      // Add file to metadata with parsed content
      const bioFile = await bioFileManager.addFile(
        fileId,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        parsedContent ? { parsedContent } : undefined
      )

      res.status(201).json({
        file: {
          ...bioFile,
          modified: bioFile.modified.toISOString(),
          created: bioFile.created.toISOString(),
          parsedContent, // Include parsed content in response
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

// 4. Update file (rename or replace content)
// PUT /api/bios/files/:fileId
router.put(
  '/files/:fileId',
  upload.single('file'),
  validateFileContent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params

      const existingFile = await bioFileManager.getFile(fileId)
      if (!existingFile) {
        return res.status(404).json({ error: 'File not found' })
      }

      // If a new file is uploaded, replace the content
      if (req.file) {
        // Update metadata with new file info
        const updated = await bioFileManager.updateFile(fileId, {
          name: req.file.filename,
          type: req.file.mimetype,
          size: req.file.size,
          sizeFormatted: req.file.size.toString(),
          extension: path.extname(req.file.originalname),
        })

        if (!updated) {
          return res.status(404).json({ error: 'Failed to update file' })
        }

        return res.json({
          file: {
            ...updated,
            modified: updated.modified.toISOString(),
            created: updated.created.toISOString(),
          },
        })
      }

      // If no file uploaded, allow renaming via JSON body
      if (req.body.originalName) {
        const updated = await bioFileManager.updateFile(fileId, {
          originalName: req.body.originalName,
        })

        if (!updated) {
          return res.status(404).json({ error: 'Failed to update file' })
        }

        return res.json({
          file: {
            ...updated,
            modified: updated.modified.toISOString(),
            created: updated.created.toISOString(),
          },
        })
      }

      res.status(400).json({ error: 'No file or updates provided' })
    } catch (error) {
      next(error)
    }
  }
)

// 5. Delete file
// DELETE /api/bios/files/:fileId
router.delete('/files/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params

    const deleted = await bioFileManager.deleteFile(fileId)

    if (!deleted) {
      return res.status(404).json({ error: 'File not found' })
    }

    res.json({ deleted: true, fileId })
  } catch (error) {
    next(error)
  }
})

// 6. Get file preview/metadata
// GET /api/bios/files/:fileId/preview?full=true
router.get('/files/:fileId/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params
    const full = req.query.full === 'true'

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    let preview: string | null = null
    let thumbnail: string | null = null

    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      const thumbnailBuffer = await bioFileManager.generateThumbnail(fileId)
      if (thumbnailBuffer) {
        thumbnail = thumbnailBuffer.toString('base64')
      }
    }

    // Extract text preview/full content for text files
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv']
    if (textTypes.includes(file.type)) {
      if (full) {
        preview = await bioFileManager.extractFullText(fileId)
      } else {
        preview = await bioFileManager.extractTextPreview(fileId, 500)
      }
    }

    // For parsed documents (PDF, DOCX), include parsed content if available
    const parsedContent = file.metadata?.parsedContent

    res.json({
      fileId,
      name: file.originalName,
      type: file.type,
      extension: file.extension,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      preview,
      thumbnail,
      parsedContent,
      metadata: file.metadata || {},
    })
  } catch (error) {
    next(error)
  }
})

// Get file statistics
// GET /api/bios/files/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await bioFileManager.getFileStats()
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

// 7. Summarize file with AI
// POST /api/bios/files/:fileId/summarize
router.post('/files/:fileId/summarize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params
    const { force = false } = req.body

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Check if already summarized (and not forcing re-summarization)
    if (file.aiSummary && !force) {
      return res.json({
        summary: file.aiSummary,
        cached: true,
      })
    }

    // Update status to processing
    await bioFileManager.updateFile(fileId, {
      processingStatus: 'processing',
    })

    // Get document text (using helper function)
    const { text, parsedContent } = await getOrParseDocumentText(file)

    if (!text || text.trim().length === 0) {
      await bioFileManager.updateFile(fileId, {
        processingStatus: 'failed',
      })
      return res.status(400).json({
        error: 'Could not extract text from document',
        message: 'This file type cannot be summarized. Please upload a PDF, DOCX, TXT, or MD file.',
      })
    }

    // Generate summary using DocumentSummaryAgent
    const config = getConfig()
    const agent = new DocumentSummaryAgent(config.anthropicApiKey, 'DocumentSummaryAgent')

    const summary = await agent.summarizeDocument(text, file.originalName, {
      wordCount: parsedContent?.wordCount,
      pageCount: parsedContent?.pageCount,
      mimeType: file.type,
    })

    // Store summary in file metadata
    const updatedFile = await bioFileManager.updateFile(fileId, {
      aiSummary: summary,
      processingStatus: 'completed',
      processedAt: new Date().toISOString(),
    })

    if (!updatedFile) {
      throw new Error('Failed to update file with summary')
    }

    res.json({
      summary,
      cached: false,
    })
  } catch (error) {
    // Update status to failed
    try {
      await bioFileManager.updateFile(req.params.fileId, {
        processingStatus: 'failed',
      })
    } catch (updateError) {
      console.error('Failed to update processing status:', updateError)
    }

    next(error)
  }
})

// 8. Chat about a file with AI (with streaming support)
// POST /api/bios/files/:fileId/chat?stream=true
router.post('/files/:fileId/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params
    const { message, history = [] } = req.body
    const stream = req.query.stream === 'true'

    // Input validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.length > 10000) {
      return res.status(400).json({ error: 'Message too long (max 10000 characters)' })
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'History must be an array' })
    }

    if (history.length > 50) {
      return res.status(400).json({ error: 'History too long (max 50 messages)' })
    }

    const file = await bioFileManager.getFile(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Get document text (using helper function)
    const { text, parsedContent } = await getOrParseDocumentText(file)

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Could not extract text from document',
        message: 'This file type cannot be used for chat. Please upload a PDF, DOCX, TXT, or MD file.',
      })
    }

    const config = getConfig()
    const agent = new DocumentChatAgent(config.anthropicApiKey, 'DocumentChatAgent')

    const metadata = {
      filename: file.originalName,
      type: file.type,
      wordCount: parsedContent?.wordCount,
      pageCount: parsedContent?.pageCount,
    }

    if (stream) {
      // Set up SSE (Server-Sent Events) headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

      // Set timeout for SSE connection (5 minutes)
      const timeout = setTimeout(() => {
        res.write('data: [TIMEOUT]\n\n')
        res.end()
      }, 5 * 60 * 1000)

      // Clean up timeout on connection close
      req.on('close', () => {
        clearTimeout(timeout)
      })

      try {
        for await (const chunk of agent.streamChatAboutDocument(
          message,
          text,
          metadata,
          history
        )) {
          // Send chunk as SSE event
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        }

        // Send completion signal
        clearTimeout(timeout)
        res.write('data: [DONE]\n\n')
        res.end()
      } catch (error) {
        clearTimeout(timeout)
        res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`)
        res.end()
      }
    } else {
      // Non-streaming response
      const response = await agent.chatAboutDocument(
        message,
        text,
        metadata,
        history
      )

      res.json({ response })
    }
  } catch (error) {
    next(error)
  }
})

export default router
