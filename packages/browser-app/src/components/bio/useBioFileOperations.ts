import { useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import type { BioFile } from '@resume-builder/agent-core'
import { bioFilesApi } from '../../api/bioFilesApi'
import { setBioModalOpen } from '../../store/slices/v2Slice'

export function useBioFileOperations() {
  const dispatch = useDispatch()
  const [bioFiles, setBioFiles] = useState<BioFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const [chatFileId, setChatFileId] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true)
    setError(null)
    try {
      const files = await bioFilesApi.listFiles({ sortBy: 'date', order: 'desc' })
      setBioFiles(files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      console.error('Error loading files:', err)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setError(null)

    try {
      await bioFilesApi.uploadFile(file)
      await loadFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      console.error('Error uploading file:', err)
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }, [loadFiles])

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      await bioFilesApi.deleteFile(fileId)
      await loadFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
      console.error('Error deleting file:', err)
    }
  }, [loadFiles])

  const handleDownloadFile = useCallback(async (fileId: string, filename: string) => {
    try {
      await bioFilesApi.downloadFile(fileId, filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
      console.error('Error downloading file:', err)
    }
  }, [])

  const handlePreviewFile = useCallback((fileId: string) => {
    setPreviewFileId(fileId)
    dispatch(setBioModalOpen(true))
  }, [dispatch])

  const closePreview = useCallback(() => {
    setPreviewFileId(null)
    dispatch(setBioModalOpen(false))
  }, [dispatch])

  const handleChatAboutFile = useCallback((fileId: string) => {
    setChatFileId(fileId)
    dispatch(setBioModalOpen(true))
  }, [dispatch])

  const closeChat = useCallback(() => {
    setChatFileId(null)
    dispatch(setBioModalOpen(false))
  }, [dispatch])

  return {
    bioFiles,
    isLoadingFiles,
    error,
    setError,
    uploadingFile,
    previewFileId,
    chatFileId,
    loadFiles,
    handleFileUpload,
    handleDeleteFile,
    handleDownloadFile,
    handlePreviewFile,
    closePreview,
    handleChatAboutFile,
    closeChat,
  }
}
