import { BioFile, FileListQuery } from '@cv-builder/agent-core'

/**
 * Bio Files API Client
 *
 * Provides type-safe methods for interacting with the bio files API endpoints.
 * Handles file uploads, downloads, metadata management, and previews.
 */
export class BioFilesApi {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl: string = 'http://localhost:3001/api', timeout: number = 30000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Fetch with timeout and error handling
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  /**
   * List files with optional filtering and sorting
   */
  async listFiles(query?: FileListQuery): Promise<BioFile[]> {
    const params = new URLSearchParams()

    if (query?.type) params.append('type', query.type)
    if (query?.sortBy) params.append('sortBy', query.sortBy)
    if (query?.order) params.append('order', query.order)
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.offset) params.append('offset', query.offset.toString())

    const url = `${this.baseUrl}/bios/files${params.toString() ? `?${params.toString()}` : ''}`
    const response = await this.fetchWithTimeout(url)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to list files')
    }

    const data = await response.json()

    // Convert date strings back to Date objects
    return data.files.map((file: any) => ({
      ...file,
      modified: new Date(file.modified),
      created: new Date(file.created),
    }))
  }

  /**
   * Get file by ID (download)
   */
  async getFile(fileId: string): Promise<Blob> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files/${fileId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to get file')
    }

    return response.blob()
  }

  /**
   * Download file as a browser download
   */
  async downloadFile(fileId: string, filename?: string): Promise<void> {
    const blob = await this.getFile(fileId)

    // Create a download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `file-${fileId}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Upload a file
   */
  async uploadFile(file: File, overwrite: boolean = false): Promise<BioFile> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('overwrite', overwrite.toString())

    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || error.message || 'Failed to upload file')
    }

    const data = await response.json()

    // Convert date strings back to Date objects
    return {
      ...data.file,
      modified: new Date(data.file.modified),
      created: new Date(data.file.created),
    }
  }

  /**
   * Update file (rename or replace content)
   */
  async updateFile(fileId: string, updates: { file?: File; originalName?: string }): Promise<BioFile> {
    const formData = new FormData()

    if (updates.file) {
      formData.append('file', updates.file)
    }
    if (updates.originalName) {
      formData.append('originalName', updates.originalName)
    }

    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files/${fileId}`, {
      method: 'PUT',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to update file')
    }

    const data = await response.json()

    return {
      ...data.file,
      modified: new Date(data.file.modified),
      created: new Date(data.file.created),
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files/${fileId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to delete file')
    }

    const data = await response.json()
    return data.deleted
  }

  /**
   * Get file preview and metadata
   */
  async getFilePreview(fileId: string): Promise<{
    fileId: string
    name: string
    type: string
    preview?: string
    thumbnail?: string
    metadata: Record<string, any>
  }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files/${fileId}/preview`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to get file preview')
    }

    return response.json()
  }

  /**
   * Get file statistics
   */
  async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
    filesByType: Record<string, number>
  }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/stats`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to get file statistics')
    }

    return response.json()
  }
}

/**
 * Create a BioFilesApi instance
 */
export function createBioFilesApi(baseUrl?: string, timeout?: number): BioFilesApi {
  const url = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  return new BioFilesApi(url, timeout)
}

/**
 * Default BioFilesApi instance
 */
export const bioFilesApi = createBioFilesApi()
