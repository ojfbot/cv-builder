import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  Heading,
  Tile,
  Button,
} from '@carbon/react'
import { DocumentAdd, Edit, Upload, ChatBot, DataTable, ViewFilled, Folder, Download } from '@carbon/icons-react'
import { setIsExpanded } from '../store/slices/chatSlice'
import { setBioViewMode, type BioViewMode } from '../store/slices/navigationSlice'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import { DocumentChatModal } from './DocumentChatModal'
import { useBioFileOperations } from './bio/useBioFileOperations'
import { BioLandingView } from './bio/BioLandingView'
import { BioActionCarousel } from './bio/BioActionCarousel'
import { BioFilesView } from './bio/BioFilesView'

interface StatItem {
  value: number
  label: string
  encouragement?: string
}

interface StatGroup {
  stats: StatItem[]
}

function BioDashboard() {
  const dispatch = useDispatch()
  const viewMode = useSelector((state: RootState) => state.navigation.bioViewMode)
  const currentTab = useSelector((state: RootState) => state.navigation.currentTab)
  const setViewMode = (mode: BioViewMode) => dispatch(setBioViewMode(mode))
  const [bioEntries] = useState<any[]>([]) // TODO: Replace with actual bio entries from state/API
  const [carouselIndex, setCarouselIndex] = useState(0)

  const fileOps = useBioFileOperations()

  // Define rotating stat groups
  const statGroups: StatGroup[] = [
    {
      stats: [
        { value: 0, label: 'Years of Experience', encouragement: 'Add your work history!' },
        { value: bioEntries.length, label: 'Bio Entries', encouragement: 'Start building your profile' },
        { value: 0, label: 'Career Conversations', encouragement: 'Share your story with AI' },
      ]
    },
    {
      stats: [
        { value: 0, label: 'Skills Listed', encouragement: 'Showcase your expertise' },
        { value: 0, label: 'Documents Uploaded', encouragement: 'Upload your resume' },
        { value: 0, label: 'Certifications', encouragement: 'Add your credentials' },
      ]
    },
    {
      stats: [
        { value: 0, label: 'Projects', encouragement: 'Highlight your work' },
        { value: 0, label: 'Annotations Added', encouragement: 'Add context to your entries' },
        { value: 0, label: 'Publications', encouragement: 'Share your thought leadership' },
      ]
    }
  ]

  const [currentIndices, setCurrentIndices] = useState([0, 0, 0])
  const [fadeStates, setFadeStates] = useState([true, true, true])

  // Collapse chat when navigating to Bio panel if on files/tiles view
  useEffect(() => {
    if (viewMode !== 'landing') {
      dispatch(setIsExpanded(false))
    }
  }, [currentTab, viewMode, dispatch])

  // Load files when switching to files view
  useEffect(() => {
    if (viewMode === 'files') {
      fileOps.loadFiles()
    }
  }, [viewMode])

  // Keyboard navigation for carousel
  useEffect(() => {
    if (viewMode !== 'tiles' || bioEntries.length > 0) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCarouselIndex((prev) => (prev - 1 + 4) % 4)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setCarouselIndex((prev) => (prev + 1) % 4)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewMode, bioEntries.length])

  // Rotating stat animation
  useEffect(() => {
    const intervals = statGroups.map((group, groupIndex) => {
      return setInterval(() => {
        setFadeStates(prev => {
          const next = [...prev]
          next[groupIndex] = false
          return next
        })

        setTimeout(() => {
          setCurrentIndices(prev => {
            const next = [...prev]
            next[groupIndex] = (next[groupIndex] + 1) % group.stats.length
            return next
          })

          setFadeStates(prev => {
            const next = [...prev]
            next[groupIndex] = true
            return next
          })
        }, 300)
      }, 4000 + (groupIndex * 1000))
    })

    return () => intervals.forEach(clearInterval)
  }, [])

  const renderTilesView = () => {
    if (bioEntries.length === 0) {
      return (
        <BioActionCarousel
          carouselIndex={carouselIndex}
          onCarouselIndexChange={setCarouselIndex}
        />
      )
    }

    // When there are entries, show them as tiles with template interface
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Heading style={{ fontSize: '1rem' }}>
            Your Bio Library ({bioEntries.length})
          </Heading>
          <Button
            renderIcon={DocumentAdd}
            kind="primary"
            size="sm"
            onClick={() => console.log('Create new bio from template')}
          >
            New from Template
          </Button>
        </div>

        <div className="card-container" style={{ marginBottom: '2rem' }}>
          {bioEntries.map((entry, index) => (
            <Tile
              key={index}
              data-element="bio-entry-tile"
              style={{
                minHeight: '180px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cds-border-interactive)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              onClick={() => console.log('View bio entry:', entry)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <Heading style={{ fontSize: '1.125rem' }}>
                  Bio {index + 1}
                </Heading>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Edit}
                    iconDescription="Edit"
                    hasIconOnly
                    onClick={(e) => { e.stopPropagation(); console.log('Edit bio:', entry) }}
                  />
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Download}
                    iconDescription="Export"
                    hasIconOnly
                    onClick={(e) => { e.stopPropagation(); console.log('Export bio:', entry) }}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Created: {new Date().toLocaleDateString()}
                </p>
                <p style={{
                  color: 'var(--cds-text-secondary)',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}>
                  Professional bio entry with experience, education, and skills...
                </p>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '1rem',
                borderTop: '1px solid var(--cds-border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--cds-text-secondary)'
              }}>
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </Tile>
          ))}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Heading style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            Quick Create
          </Heading>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button size="sm" kind="tertiary" renderIcon={Upload} onClick={() => console.log('Upload resume')}>
              From Resume
            </Button>
            <Button size="sm" kind="tertiary" renderIcon={ChatBot} onClick={() => console.log('Chat to create')}>
              Chat to Create
            </Button>
            <Button size="sm" kind="tertiary" renderIcon={DataTable} onClick={() => console.log('Manual entry')}>
              Manual Entry
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="dashboard-content" data-element="bio-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Your Professional Bio</Heading>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            data-element="bio-edit-button"
            renderIcon={viewMode === 'landing' ? Edit : ViewFilled}
            kind="tertiary"
            onClick={() => {
              if (viewMode === 'landing') {
                setViewMode('tiles')
                dispatch(setIsExpanded(false))
              } else {
                setViewMode('landing')
              }
            }}
          >
            {viewMode === 'landing' ? 'Edit Bio' : 'Summarize'}
          </Button>
          <Button
            data-element="bio-files-button"
            renderIcon={Folder}
            kind="tertiary"
            onClick={() => {
              if (viewMode === 'files') {
                setViewMode('tiles')
              } else {
                if (viewMode === 'landing') dispatch(setIsExpanded(false))
                setViewMode('files')
              }
            }}
          >
            {viewMode === 'files' ? 'Library' : 'View Files'}
          </Button>
          <Button
            data-element="bio-create-button"
            renderIcon={DocumentAdd}
            kind="primary"
            onClick={() => {
              if (viewMode === 'landing') dispatch(setIsExpanded(false))
              setViewMode('tiles')
            }}
          >
            Create New Bio
          </Button>
        </div>
      </div>

      <div style={{
        transform: viewMode === 'landing' ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s ease-in-out',
        position: viewMode === 'landing' ? 'relative' : 'absolute',
        width: '100%',
        opacity: viewMode === 'landing' ? 1 : 0,
        pointerEvents: viewMode === 'landing' ? 'auto' : 'none',
      }}>
        <BioLandingView
          statGroups={statGroups}
          currentIndices={currentIndices}
          fadeStates={fadeStates}
        />
      </div>

      <div style={{
        transform: viewMode === 'tiles' ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s ease-in-out',
        position: viewMode === 'tiles' ? 'relative' : 'absolute',
        width: '100%',
        opacity: viewMode === 'tiles' ? 1 : 0,
        pointerEvents: viewMode === 'tiles' ? 'auto' : 'none',
      }}>
        {renderTilesView()}
      </div>

      <div style={{
        transform: viewMode === 'files' ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s ease-in-out',
        position: viewMode === 'files' ? 'relative' : 'absolute',
        width: '100%',
        opacity: viewMode === 'files' ? 1 : 0,
        pointerEvents: viewMode === 'files' ? 'auto' : 'none',
      }}>
        <BioFilesView
          bioFiles={fileOps.bioFiles}
          isLoadingFiles={fileOps.isLoadingFiles}
          error={fileOps.error}
          uploadingFile={fileOps.uploadingFile}
          onErrorDismiss={() => fileOps.setError(null)}
          onFileUpload={fileOps.handleFileUpload}
          onDeleteFile={fileOps.handleDeleteFile}
          onDownloadFile={fileOps.handleDownloadFile}
          onPreviewFile={fileOps.handlePreviewFile}
          onChatAboutFile={fileOps.handleChatAboutFile}
        />
      </div>

      {fileOps.previewFileId && (
        <DocumentPreviewModal
          fileId={fileOps.previewFileId}
          fileName={fileOps.bioFiles.find(f => f.id === fileOps.previewFileId)?.originalName || 'Document'}
          onClose={fileOps.closePreview}
        />
      )}

      {fileOps.chatFileId && (
        <DocumentChatModal
          fileId={fileOps.chatFileId}
          fileName={fileOps.bioFiles.find(f => f.id === fileOps.chatFileId)?.originalName || 'Document'}
          onClose={fileOps.closeChat}
        />
      )}
    </div>
  )
}

export default BioDashboard
