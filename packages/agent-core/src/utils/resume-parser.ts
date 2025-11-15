/**
 * Resume Parser Utility
 * Extracts text content from various resume file formats (PDF, DOCX, TXT, MD)
 */

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

export interface ParsedResume {
  text: string
  metadata: {
    fileType: string
    originalFilename: string
    uploadDate: string
    pageCount?: number
    wordCount: number
  }
}

/**
 * Parse PDF file and extract text content
 */
async function parsePDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfParser = new PDFParse({ data: buffer })
    const textResult = await pdfParser.getText()

    return {
      text: textResult.text,
      pageCount: textResult.pages.length
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse DOCX file and extract text content
 */
async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse plain text file (TXT, MD)
 */
function parseText(buffer: Buffer): string {
  try {
    return buffer.toString('utf-8')
  } catch (error) {
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Detect file type from filename or MIME type
 */
export function detectFileType(filename: string, mimeType?: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''

  // First check extension
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'txt') return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'

  // Fallback to MIME type
  if (mimeType) {
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'docx'
    if (mimeType.includes('text/plain')) return 'txt'
    if (mimeType.includes('text/markdown')) return 'md'
  }

  throw new Error(`Unsupported file type: ${filename} (${mimeType || 'unknown MIME type'})`)
}

/**
 * Main resume parser function
 * Supports PDF, DOCX, TXT, and MD formats
 */
export async function parseResume(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<ParsedResume> {
  const fileType = detectFileType(filename, mimeType)
  const uploadDate = new Date().toISOString()

  let text: string
  let pageCount: number | undefined

  switch (fileType) {
    case 'pdf': {
      const result = await parsePDF(buffer)
      text = result.text
      pageCount = result.pageCount
      break
    }

    case 'docx':
      text = await parseDOCX(buffer)
      break

    case 'txt':
    case 'md':
      text = parseText(buffer)
      break

    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }

  // Clean up the text (remove excessive whitespace, normalize line breaks)
  text = text
    .replace(/\r\n/g, '\n')  // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
    .trim()

  const wordCount = countWords(text)

  return {
    text,
    metadata: {
      fileType,
      originalFilename: filename,
      uploadDate,
      pageCount,
      wordCount
    }
  }
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(size: number, maxSizeMB: number = 10): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (size > maxSizeBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }
}

/**
 * Sanitize filename to prevent directory traversal and other security issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.replace(/^.*[\\\/]/, '')

  // Remove any characters that aren't alphanumeric, dash, underscore, or dot
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Ensure filename isn't empty
  if (!sanitized || sanitized === '.') {
    return `resume_${Date.now()}.txt`
  }

  return sanitized
}
