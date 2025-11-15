import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import mime from 'mime-types'
import sharp from 'sharp'
import { BioFile, FileListQuery } from '@cv-builder/agent-core'
import { formatFileSize, sanitizeFilename, BIOS_DIR } from '../middleware/file-upload'

interface FileMetadata {
  [key: string]: any
}

export class BioFileManager {
  private biosDir: string
  private metadataFile: string

  constructor() {
    this.biosDir = BIOS_DIR
    this.metadataFile = path.join(this.biosDir, '.file-metadata.json')
  }

  // Load metadata from JSON file
  private async loadMetadata(): Promise<Map<string, BioFile>> {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8')
      const parsed = JSON.parse(data)
      const map = new Map<string, BioFile>()

      for (const [key, value] of Object.entries(parsed)) {
        const fileData = value as any
        map.set(key, {
          ...fileData,
          modified: new Date(fileData.modified),
          created: new Date(fileData.created),
        })
      }

      return map
    } catch (error) {
      // If file doesn't exist, return empty map
      return new Map()
    }
  }

  // Save metadata to JSON file
  private async saveMetadata(metadata: Map<string, BioFile>): Promise<void> {
    const obj = Object.fromEntries(metadata)
    await fs.writeFile(this.metadataFile, JSON.stringify(obj, null, 2))
  }

  // List all files with optional filtering and sorting
  async listFiles(query: FileListQuery = {}): Promise<BioFile[]> {
    const metadata = await this.loadMetadata()
    let files = Array.from(metadata.values())

    // Filter by type if specified
    if (query.type) {
      files = files.filter(file =>
        file.type.includes(query.type!) || file.extension.includes(query.type!)
      )
    }

    // Sort files
    const sortBy = query.sortBy || 'date'
    const order = query.order || 'desc'

    files.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'date':
        default:
          comparison = a.modified.getTime() - b.modified.getTime()
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit

    if (limit) {
      files = files.slice(offset, offset + limit)
    } else if (offset > 0) {
      files = files.slice(offset)
    }

    return files
  }

  // Get file by ID
  async getFile(fileId: string): Promise<BioFile | null> {
    const metadata = await this.loadMetadata()
    return metadata.get(fileId) || null
  }

  // Get file path by ID
  async getFilePath(fileId: string): Promise<string | null> {
    const file = await this.getFile(fileId)
    if (!file) return null

    const filePath = path.join(this.biosDir, file.name)

    // Verify file exists
    try {
      await fs.access(filePath)
      return filePath
    } catch {
      return null
    }
  }

  // Add file metadata
  async addFile(
    fileId: string,
    originalName: string,
    storedName: string,
    mimeType: string,
    size: number,
    additionalMetadata?: FileMetadata
  ): Promise<BioFile> {
    const metadata = await this.loadMetadata()

    const ext = path.extname(originalName)
    const now = new Date()

    const bioFile: BioFile = {
      id: fileId,
      name: storedName,
      originalName: sanitizeFilename(originalName),
      type: mimeType,
      extension: ext,
      size,
      sizeFormatted: formatFileSize(size),
      path: path.join(this.biosDir, storedName),
      modified: now,
      created: now,
      metadata: additionalMetadata,
    }

    metadata.set(fileId, bioFile)
    await this.saveMetadata(metadata)

    return bioFile
  }

  // Update file metadata
  async updateFile(fileId: string, updates: Partial<BioFile>): Promise<BioFile | null> {
    const metadata = await this.loadMetadata()
    const existing = metadata.get(fileId)

    if (!existing) {
      return null
    }

    const updated: BioFile = {
      ...existing,
      ...updates,
      id: fileId, // Ensure ID doesn't change
      modified: new Date(),
    }

    metadata.set(fileId, updated)
    await this.saveMetadata(metadata)

    return updated
  }

  // Delete file and its metadata
  async deleteFile(fileId: string): Promise<boolean> {
    const metadata = await this.loadMetadata()
    const file = metadata.get(fileId)

    if (!file) {
      return false
    }

    // Delete physical file
    try {
      const filePath = path.join(this.biosDir, file.name)
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Error deleting file:', error)
      // Continue to remove metadata even if file deletion fails
    }

    // Remove from metadata
    metadata.delete(fileId)
    await this.saveMetadata(metadata)

    return true
  }

  // Check if file exists by original name
  async fileExistsByName(originalName: string): Promise<boolean> {
    const metadata = await this.loadMetadata()
    const sanitized = sanitizeFilename(originalName)

    for (const file of metadata.values()) {
      if (file.originalName === sanitized) {
        return true
      }
    }

    return false
  }

  // Generate thumbnail for images
  async generateThumbnail(fileId: string, width: number = 200): Promise<Buffer | null> {
    const filePath = await this.getFilePath(fileId)
    if (!filePath) return null

    const file = await this.getFile(fileId)
    if (!file || !file.type.startsWith('image/')) {
      return null
    }

    try {
      const thumbnail = await sharp(filePath)
        .resize(width, null, { withoutEnlargement: true })
        .toBuffer()

      return thumbnail
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      return null
    }
  }

  // Extract text preview from file
  async extractTextPreview(fileId: string, maxLength: number = 500): Promise<string | null> {
    const filePath = await this.getFilePath(fileId)
    if (!filePath) return null

    const file = await this.getFile(fileId)
    if (!file) return null

    // Only extract from text-based files
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv']
    if (!textTypes.includes(file.type)) {
      return null
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content.substring(0, maxLength)
    } catch (error) {
      console.error('Error reading file for preview:', error)
      return null
    }
  }

  // Get file statistics
  async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
    filesByType: Record<string, number>
  }> {
    const files = await this.listFiles()

    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: '',
      filesByType: {} as Record<string, number>,
    }

    stats.totalSizeFormatted = formatFileSize(stats.totalSize)

    // Count files by type
    for (const file of files) {
      const ext = file.extension || 'unknown'
      stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1
    }

    return stats
  }

  // Ensure bios directory exists
  async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.biosDir, { recursive: true })
    } catch (error) {
      console.error('Error creating bios directory:', error)
      throw error
    }
  }
}

// Export singleton instance
export const bioFileManager = new BioFileManager()
