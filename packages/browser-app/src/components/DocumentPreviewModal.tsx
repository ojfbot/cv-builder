import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal, Loading, InlineNotification } from '@carbon/react'
import { bioFilesApi } from '../api/bioFilesApi'
import { setDisplayState, ChatDisplayState } from '../store/slices/chatSlice'
import type { RootState } from '../store'
import { getApiBaseUrl } from '../config/api'

interface PreviewData {
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
}

interface DocumentPreviewModalProps {
  fileId: string
  fileName: string
  onClose: () => void
}

export function DocumentPreviewModal({ fileId, fileName, onClose }: DocumentPreviewModalProps) {
  const dispatch = useDispatch()
  const currentDisplayState = useSelector((state: RootState) => state.chat.displayState)
  const sidebarExpanded = useSelector((state: RootState) => state.v2.sidebarExpanded)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previousChatState, setPreviousChatState] = useState<ChatDisplayState>(currentDisplayState)

  // Minimize chat when modal opens, restore when it closes
  useEffect(() => {
    // Save current state
    setPreviousChatState(currentDisplayState)
    // Minimize chat to maximize vertical space for preview
    dispatch(setDisplayState('minimized'))

    // Restore previous state when modal closes
    return () => {
      dispatch(setDisplayState(previousChatState))
    }
  }, []) // Only run on mount/unmount

  // Add/remove sidebar class AND inline styles to modal container
  useEffect(() => {
    const modalContainer = document.querySelector('.cds--modal-container') as HTMLElement
    if (modalContainer) {
      if (sidebarExpanded) {
        modalContainer.classList.add('with-right-sidebar')
        // Also set inline styles as fallback to ensure width changes
        modalContainer.style.maxWidth = 'calc(100vw - 464px)'
        modalContainer.style.width = 'calc(100vw - 464px)'
      } else {
        modalContainer.classList.remove('with-right-sidebar')
        // Reset to default width
        modalContainer.style.maxWidth = 'calc(100vw - 144px)'
        modalContainer.style.width = ''
      }
    }

    // Cleanup on unmount
    return () => {
      const modalContainer = document.querySelector('.cds--modal-container') as HTMLElement
      if (modalContainer) {
        modalContainer.classList.remove('with-right-sidebar')
        modalContainer.style.maxWidth = ''
        modalContainer.style.width = ''
      }
    }
  }, [sidebarExpanded])

  useEffect(() => {
    loadPreview()
  }, [fileId])

  const loadPreview = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bioFilesApi.getPreview(fileId, { full: true })
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
      console.error('Preview error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Loading description="Loading preview..." withOverlay={false} />
        </div>
      )
    }

    if (error) {
      return (
        <InlineNotification
          kind="error"
          title="Error loading preview"
          subtitle={error}
          lowContrast
        />
      )
    }

    if (!preview) {
      return (
        <InlineNotification
          kind="info"
          title="No preview available"
          subtitle="This file type cannot be previewed"
          lowContrast
        />
      )
    }

    // Image preview
    if (preview.type.startsWith('image/')) {
      if (preview.thumbnail) {
        return (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <img
              src={`data:${preview.type};base64,${preview.thumbnail}`}
              alt={fileName}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
              {preview.sizeFormatted}
            </div>
          </div>
        )
      }
    }

    // PDF preview - use browser's built-in PDF viewer
    if (preview.extension === '.pdf' || preview.type === 'application/pdf') {
      const pdfUrl = `${getApiBaseUrl()}/bios/files/${fileId}`

      return (
        <div style={{ padding: '1rem' }}>
          {preview.parsedContent && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--cds-layer-01)',
                borderLeft: '3px solid var(--cds-border-interactive)',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                {preview.parsedContent.wordCount} words
                {preview.parsedContent.pageCount && ` • ${preview.parsedContent.pageCount} pages`}
              </div>
            </div>
          )}
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: 'calc(100vh - 320px)', // Fit within: margins(140) + modal-header(60) + stats(60) + padding(60)
              minHeight: '400px',
              maxHeight: '650px',
              border: '1px solid var(--cds-border-subtle)',
              borderRadius: '4px',
            }}
            title={`PDF Preview: ${fileName}`}
          />
        </div>
      )
    }

    // Text file preview
    if (preview.preview) {
      const isJson = preview.type === 'application/json'
      let displayContent = preview.preview

      // Pretty-print JSON
      if (isJson) {
        try {
          displayContent = JSON.stringify(JSON.parse(preview.preview), null, 2)
        } catch {
          // Keep original if JSON parse fails
        }
      }

      return (
        <div style={{ padding: '1rem' }}>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: isJson ? 'var(--cds-code-01-font-family)' : 'inherit',
              fontSize: '0.875rem',
              maxHeight: '60vh',
              overflow: 'auto',
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              borderRadius: '4px',
            }}
          >
            {displayContent}
          </pre>
        </div>
      )
    }

    // Fallback: show file info
    return (
      <div style={{ padding: '1rem' }}>
        <InlineNotification
          kind="info"
          title="Preview not available"
          subtitle={`This ${preview.extension} file cannot be previewed in the browser. Use the download button to view the file.`}
          lowContrast
        />
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--cds-layer-01)',
            borderRadius: '4px',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>File information:</strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            <div>Type: {preview.type}</div>
            <div>Size: {preview.sizeFormatted}</div>
            {preview.parsedContent && (
              <>
                <div>Words: {preview.parsedContent.wordCount}</div>
                {preview.parsedContent.pageCount && (
                  <div>Pages: {preview.parsedContent.pageCount}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal
      data-element="document-preview-modal"
      open
      modalHeading={`Preview: ${fileName}`}
      primaryButtonText="Close"
      onRequestClose={onClose}
      onRequestSubmit={onClose}
      size="lg"
    >
      {renderContent()}
    </Modal>
  )
}
