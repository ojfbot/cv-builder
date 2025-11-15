import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs/promises'
import { fileTypeFromBuffer } from 'file-type'
import mime from 'mime-types'

// Define allowed file types with MIME types and extensions
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  // Data
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  // Images
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Ensure bio files directory exists
const BIOS_DIR = path.join(process.cwd(), '../../personal/bios')

async function ensureBiosDirectory() {
  try {
    await fs.mkdir(BIOS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating bios directory:', error)
  }
}

ensureBiosDirectory()

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(BIOS_DIR, { recursive: true })
      cb(null, BIOS_DIR)
    } catch (error) {
      cb(error as Error, BIOS_DIR)
    }
  },
  filename: (_req, file, cb) => {
    // Generate unique filename using UUID
    const fileId = crypto.randomUUID()
    const ext = path.extname(file.originalname)
    cb(null, `${fileId}${ext}`)
  },
})

// File filter to validate file types
const fileFilter = async (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeType = file.mimetype

  // Check if MIME type is allowed
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES]

  if (!allowedExtensions || !allowedExtensions.includes(ext)) {
    return cb(new Error(`Unsupported file type. Allowed types: PDF, DOCX, TXT, MD, JSON, CSV, PNG, JPG, GIF`))
  }

  cb(null, true)
}

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter: fileFilter as any,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow one file at a time
  },
})

// Middleware to validate file content by magic bytes
export async function validateFileContent(
  req: any,
  _res: any,
  next: any
) {
  try {
    if (!req.file) {
      return next()
    }

    // Read file buffer to check magic bytes
    const buffer = await fs.readFile(req.file.path)
    const fileType = await fileTypeFromBuffer(buffer)

    // For text files, file-type won't detect them, so skip validation
    const textMimeTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv']
    if (textMimeTypes.includes(req.file.mimetype)) {
      return next()
    }

    // Validate that detected type matches claimed MIME type
    if (fileType && fileType.mime !== req.file.mimetype) {
      // Clean up uploaded file
      await fs.unlink(req.file.path)
      throw new Error(`File content does not match declared type. Expected ${req.file.mimetype}, got ${fileType.mime}`)
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Sanitize filename to prevent path traversal attacks
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = path.basename(filename)

  // Remove special characters except dots, dashes, underscores, and alphanumerics
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Limit filename length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized)
    const nameWithoutExt = path.basename(sanitized, ext)
    return nameWithoutExt.substring(0, maxLength - ext.length) + ext
  }

  return sanitized
}

// Format file size to human-readable string
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Get file extension from MIME type
export function getExtensionFromMimeType(mimeType: string): string {
  const extension = mime.extension(mimeType)
  return extension ? `.${extension}` : ''
}

export { BIOS_DIR, ALLOWED_FILE_TYPES, MAX_FILE_SIZE }
