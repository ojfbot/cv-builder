import { BioFile, FileListQuery, DocumentSummary, ChatMessage } from '@cv-builder/agent-core'

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
   * Get file preview with full content
   */
  async getPreview(
    fileId: string,
    options?: { full?: boolean }
  ): Promise<{
    fileId: string
    name: string
    type: string
    extension: string
    size: number
    sizeFormatted: string
    preview: string | null
    thumbnail: string | null
    parsedContent?: {
      text: string
      wordCount: number
      pageCount?: number
    }
    metadata: Record<string, any>
  }> {
    const params = new URLSearchParams()
    if (options?.full) params.set('full', 'true')

    const url = `${this.baseUrl}/bios/files/${fileId}/preview${params.toString() ? `?${params.toString()}` : ''}`
    const response = await this.fetchWithTimeout(url)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to get preview')
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

  /**
   * Get AI-generated summary for a file
   */
  async getSummary(
    fileId: string,
    force = false
  ): Promise<{
    summary: DocumentSummary
    cached: boolean
  }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bios/files/${fileId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || error.message || 'Failed to get summary')
    }

    return response.json()
  }

  /**
   * Chat about a document with streaming response
   */
  async *chatStream(
    fileId: string,
    message: string,
    history: ChatMessage[]
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/bios/files/${fileId}/chat?stream=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || error.message || 'Failed to start chat')
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix
            if (data === '[DONE]') return

            try {
              const json = JSON.parse(data)
              if (json.chunk) {
                yield json.chunk
              }
              if (json.error) {
                throw new Error(json.error)
              }
            } catch (e) {
              // Skip malformed JSON lines
              if (e instanceof Error && e.message.startsWith('Unexpected')) {
                continue
              }
              throw e
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
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
