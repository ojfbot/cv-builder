/**
 * File Upload Routes
 * Handles resume and document uploads with parsing and storage
 */

import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { parseResume, validateFileSize, sanitizeFilename } from '@cv-builder/agent-core/utils/resume-parser'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Configure multer for memory storage (we'll parse in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Whitelist allowed file types
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ]

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.'))
    }
  }
})

/**
 * POST /api/upload/resume
 * Upload and parse a resume file
 *
 * Body: multipart/form-data with 'resume' field containing the file
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     text: string,           // Extracted text content
 *     metadata: {
 *       fileType: string,
 *       originalFilename: string,
 *       uploadDate: string,
 *       pageCount?: number,
 *       wordCount: number
 *     },
 *     storedPath: string      // Path where file was stored
 *   }
 * }
 */
router.post('/resume', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please provide a resume file.'
      })
    }

    const { buffer, originalname, mimetype, size } = req.file

    // Validate file size
    try {
      validateFileSize(size)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'File size validation failed'
      })
    }

    // Parse the resume
    let parsedResume
    try {
      parsedResume = await parseResume(buffer, originalname, mimetype)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Sanitize filename and store the file
    const sanitizedFilename = sanitizeFilename(originalname)
    const timestamp = Date.now()
    const storedFilename = `${timestamp}_${sanitizedFilename}`

    // Determine storage directory (personal/bios/)
    // When running via npm workspace, cwd is packages/api, so go up 2 levels to project root
    const projectRoot = path.resolve(process.cwd(), '..', '..')
    const storageDir = path.join(projectRoot, 'personal', 'bios')
    const storedPath = path.join(storageDir, storedFilename)

    console.log(`[Upload] Current working directory: ${process.cwd()}`)
    console.log(`[Upload] Storage directory: ${storageDir}`)
    console.log(`[Upload] Storing file as: ${storedFilename}`)
    console.log(`[Upload] Full path: ${storedPath}`)

    // Ensure storage directory exists
    try {
      await fs.mkdir(storageDir, { recursive: true })
      console.log(`[Upload] Storage directory created/verified: ${storageDir}`)
    } catch (mkdirError) {
      console.error(`[Upload] Failed to create directory: ${mkdirError}`)
      throw mkdirError
    }

    // Write the file
    try {
      console.log(`[Upload] Writing ${buffer.length} bytes to: ${storedPath}`)
      await fs.writeFile(storedPath, buffer)
      console.log(`[Upload] File written successfully`)

      // Verify file was written
      const stats = await fs.stat(storedPath)
      console.log(`[Upload] File verified: ${stats.size} bytes`)
    } catch (writeError) {
      console.error(`[Upload] Failed to write file: ${writeError}`)
      throw writeError
    }

    // Also save metadata as JSON
    const metadataPath = path.join(storageDir, `${timestamp}_${sanitizedFilename}.meta.json`)
    const metadataContent = JSON.stringify(
      {
        ...parsedResume.metadata,
        storedFilename,
        uploadTimestamp: timestamp
      },
      null,
      2
    )

    try {
      await fs.writeFile(metadataPath, metadataContent)
      console.log(`[Upload] Metadata file written: ${metadataPath}`)
    } catch (metaError) {
      console.error(`[Upload] Failed to write metadata: ${metaError}`)
      // Don't throw - metadata is optional
    }

    console.log(`[Upload] ✅ Resume uploaded and parsed successfully: ${storedFilename}`)
    console.log(`[Upload] Summary: ${parsedResume.metadata.wordCount} words, ${parsedResume.metadata.fileType.toUpperCase()} format`)

    // Return parsed content
    return res.json({
      success: true,
      data: {
        text: parsedResume.text,
        metadata: parsedResume.metadata,
        storedPath: `personal/bios/${storedFilename}`
      }
    })
  } catch (error) {
    console.error('[Upload] Error processing resume upload:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

/**
 * Error handler for multer errors
 */
router.use((error: Error, _req: Request, res: Response, _next: Function) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 10MB limit'
      })
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`
    })
  }

  return res.status(500).json({
    success: false,
    error: error.message || 'Unknown error during upload'
  })
})

export default router
