import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import path from 'path'
import { FileListQuerySchema } from '@cv-builder/agent-core'
import { bioFileManager } from '../services/bio-file-manager'
import { upload, validateFileContent } from '../middleware/file-upload'
import { authenticate } from '../middleware/auth'

const router = Router()

// Apply authentication to all bio file routes
router.use(authenticate)

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

      // Add file to metadata
      const bioFile = await bioFileManager.addFile(
        fileId,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size
      )

      res.status(201).json({
        file: {
          ...bioFile,
          modified: bioFile.modified.toISOString(),
          created: bioFile.created.toISOString(),
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
// GET /api/bios/files/:fileId/preview
router.get('/files/:fileId/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params

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

    // Extract text preview for text files
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv']
    if (textTypes.includes(file.type)) {
      preview = await bioFileManager.extractTextPreview(fileId, 500)
    }

    res.json({
      fileId,
      name: file.originalName,
      type: file.type,
      preview,
      thumbnail,
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

export default router
