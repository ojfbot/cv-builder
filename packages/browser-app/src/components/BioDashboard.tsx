import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  Heading,
  Tile,
  Button,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Loading,
  InlineNotification,
  Grid,
  Column,
} from '@carbon/react'
import { DocumentAdd, Edit, Upload, ChatBot, DataTable, Connect, ViewFilled, Folder, TrashCan, Download } from '@carbon/icons-react'
import { BioFile } from '@cv-builder/agent-core'
import { bioFilesApi } from '../api/bioFilesApi'
import { setIsExpanded } from '../store/slices/chatSlice'
import { setBioViewMode, type BioViewMode } from '../store/slices/navigationSlice'

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
  const [bioFiles, setBioFiles] = useState<BioFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Define rotating stat groups - each tile cycles through its own stats
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

  // Load files from API
  const loadFiles = async () => {
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
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setError(null)

    try {
      await bioFilesApi.uploadFile(file)
      await loadFiles() // Reload files after upload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      console.error('Error uploading file:', err)
    } finally {
      setUploadingFile(false)
      // Reset input
      event.target.value = ''
    }
  }

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      await bioFilesApi.deleteFile(fileId)
      await loadFiles() // Reload files after deletion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
      console.error('Error deleting file:', err)
    }
  }

  // Handle file download
  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      await bioFilesApi.downloadFile(fileId, filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
      console.error('Error downloading file:', err)
    }
  }

  // Collapse chat when navigating to Bio panel if on files/tiles view
  useEffect(() => {
    // When currentTab changes to Bio and we're not on landing view, collapse chat
    if (viewMode !== 'landing') {
      dispatch(setIsExpanded(false))
    }
  }, [currentTab, viewMode, dispatch]) // Run when navigating to Bio tab or view changes

  // Load files when switching to files view
  useEffect(() => {
    if (viewMode === 'files') {
      loadFiles()
    }
  }, [viewMode])

  // Keyboard navigation for carousel (only when no bios exist)
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

  useEffect(() => {
    // Rotate stats every 4 seconds with staggered timing
    const intervals = statGroups.map((group, groupIndex) => {
      return setInterval(() => {
        // Fade out
        setFadeStates(prev => {
          const next = [...prev]
          next[groupIndex] = false
          return next
        })

        // After fade out, change stat and fade in
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
        }, 300) // Half of transition duration
      }, 4000 + (groupIndex * 1000)) // Stagger by 1 second
    })

    return () => intervals.forEach(clearInterval)
  }, [])

  const renderLandingView = () => (
    <>
      <Grid narrow>
        <Column lg={12} md={7} sm={4}>
          <Tile style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Your professional bio is securely stored in private storage. Build your profile from multiple
              sources and let AI help you showcase your best self.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)' }}>
              Click "Edit Bio" below to start creating entries. You can upload your resume, chat about your
              experiences, or fill out structured forms. Each entry becomes a tile you can edit and refine.
            </p>
          </Tile>
        </Column>
      </Grid>

      <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>Quick Stats</Heading>
      <div className="card-container">
        {statGroups.map((group, groupIndex) => {
          const currentStat = group.stats[currentIndices[groupIndex]]
          const isVisible = fadeStates[groupIndex]

          return (
            <Tile
              key={groupIndex}
              style={{
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                }}
              >
                <Heading style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {currentStat.value}
                </Heading>
                <div style={{ color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                  {currentStat.label}
                </div>
                {currentStat.value === 0 && currentStat.encouragement && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--cds-link-primary)',
                    fontStyle: 'italic',
                    marginTop: '0.5rem'
                  }}>
                    {currentStat.encouragement}
                  </div>
                )}
              </div>
            </Tile>
          )
        })}
      </div>
    </>
  )

  const renderFilesView = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <Heading style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            Bio Files Directory
          </Heading>
          <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
            Files stored in <code>personal/bios/</code> directory
          </div>
        </div>
        <div>
          <input
            type="file"
            id="file-upload-input"
            data-element="bio-file-upload-input"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.gif"
          />
          <Button
            data-element="bio-upload-button"
            renderIcon={Upload}
            kind="primary"
            onClick={() => document.getElementById('file-upload-input')?.click()}
            disabled={uploadingFile}
          >
            {uploadingFile ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isLoadingFiles ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loading description="Loading files..." withOverlay={false} />
        </div>
      ) : bioFiles.length === 0 ? (
        <Tile style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            No files found. Upload your first file to get started.
          </p>
        </Tile>
      ) : (
        <Table size="md" useZebraStyles={true} data-element="bio-files-table">
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Size</TableHeader>
              <TableHeader>Modified</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {bioFiles.map((file) => (
              <TableRow key={file.id} data-element="bio-file-row">
                <TableCell>{file.originalName}</TableCell>
                <TableCell>{file.extension.toUpperCase().replace('.', '')}</TableCell>
                <TableCell>{file.sizeFormatted}</TableCell>
                <TableCell>{new Date(file.modified).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      data-element="bio-file-download-button"
                      size="sm"
                      kind="ghost"
                      renderIcon={Download}
                      iconDescription="Download"
                      hasIconOnly
                      onClick={() => handleDownloadFile(file.id, file.originalName)}
                    />
                    <Button
                      data-element="bio-file-delete-button"
                      size="sm"
                      kind="danger--ghost"
                      renderIcon={TrashCan}
                      iconDescription="Delete"
                      hasIconOnly
                      onClick={() => handleDeleteFile(file.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )

  const renderTilesView = () => {
    if (bioEntries.length === 0) {
      // Empty state: Show action tiles in a carousel (4 tiles, one per page)
      const tiles = [
        {
          icon: Upload,
          title: 'Upload Resume',
          description: 'Upload your existing resume or CV. AI will extract and organize your information.',
          onClick: () => {
            // TODO: Open file upload dialog
            console.log('Upload resume clicked')
          }
        },
        {
          icon: ChatBot,
          title: 'Chat About Experiences',
          description: 'Have a conversation with AI about your career, goals, and achievements.',
          onClick: () => {
            // TODO: Open chat interface
            console.log('Chat about experiences clicked')
          }
        },
        {
          icon: DataTable,
          title: 'Fill In Form',
          description: 'Enter your information directly using structured forms for precision.',
          onClick: () => {
            // TODO: Open manual entry form
            console.log('Fill in form clicked')
          }
        },
        {
          icon: Connect,
          title: 'Connect Sources',
          description: 'Link your LinkedIn, GitHub, portfolio, blog, or other professional profiles.',
          onClick: () => {
            // TODO: Open source connection interface
            console.log('Connect sources clicked')
          }
        }
      ]

      const goToSlide = (index: number) => {
        setCarouselIndex(index)
      }

      return (
        <>
          <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Choose how to build your bio
          </Heading>
          <div style={{ position: 'relative', marginBottom: '2rem' }}>
            {/* Carousel container - shows all 4 tiles in grid */}
            <div className="card-container" style={{ marginBottom: '1rem' }}>
              {tiles.map((tile, index) => {
                const TileIcon = tile.icon
                return (
                  <Tile
                    key={index}
                    data-element={`bio-action-tile-${index}`}
                    style={{
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: index === carouselIndex
                        ? '2px solid var(--cds-border-interactive)'
                        : '2px solid transparent',
                      outline: 'none',
                      boxShadow: index === carouselIndex
                        ? '0 0 0 2px var(--cds-focus)'
                        : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--cds-border-interactive)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={(e) => {
                      if (index !== carouselIndex) {
                        e.currentTarget.style.borderColor = 'transparent'
                      }
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onClick={() => {
                      // Set focus to this tile when clicked
                      setCarouselIndex(index)
                      tile.onClick()
                    }}
                    onFocus={() => setCarouselIndex(index)}
                    tabIndex={0}
                    role="button"
                    aria-label={tile.title}
                  >
                    <TileIcon size={48} style={{ marginBottom: '1rem', color: 'var(--cds-icon-primary)' }} />
                    <Heading style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                      {tile.title}
                    </Heading>
                    <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      {tile.description}
                    </p>
                  </Tile>
                )
              })}
            </div>

            {/* Carbon Design System style pagination dots */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1rem'
            }}>
              {tiles.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: index === carouselIndex
                      ? 'var(--cds-icon-primary)'
                      : 'var(--cds-icon-secondary)',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                    transform: index === carouselIndex ? 'scale(1.2)' : 'scale(1)',
                  }}
                  aria-label={`Highlight ${tiles[index].title}`}
                  aria-current={index === carouselIndex ? 'true' : 'false'}
                />
              ))}
            </div>
          </div>
        </>
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
            onClick={() => {
              // TODO: Open new bio template selector
              console.log('Create new bio from template')
            }}
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
              onClick={() => {
                // TODO: Open bio detail view
                console.log('View bio entry:', entry)
              }}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Edit bio:', entry)
                    }}
                  />
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Download}
                    iconDescription="Export"
                    hasIconOnly
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Export bio:', entry)
                    }}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{
                  color: 'var(--cds-text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
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
                  {/* TODO: Show actual bio summary */}
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

        {/* Template Quick Actions */}
        <div style={{ marginTop: '2rem' }}>
          <Heading style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            Quick Create
          </Heading>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={Upload}
              onClick={() => {
                // TODO: Open upload dialog
                console.log('Upload resume')
              }}
            >
              From Resume
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={ChatBot}
              onClick={() => {
                // TODO: Open chat
                console.log('Chat to create')
              }}
            >
              Chat to Create
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={DataTable}
              onClick={() => {
                // TODO: Open form
                console.log('Manual entry')
              }}
            >
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
                // Navigating FROM landing/summary TO tiles - collapse chat
                setViewMode('tiles')
                dispatch(setIsExpanded(false))
              } else {
                // Navigating back TO landing/summary - don't change chat state
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
                // Navigating FROM files back to tiles - don't change chat state
                setViewMode('tiles')
              } else {
                // Navigating FROM landing/tiles TO files - collapse chat only if from landing
                if (viewMode === 'landing') {
                  dispatch(setIsExpanded(false))
                }
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
              // Navigating to tiles from anywhere - collapse only if from landing
              if (viewMode === 'landing') {
                dispatch(setIsExpanded(false))
              }
              setViewMode('tiles')
            }}
          >
            Create New Bio
          </Button>
        </div>
      </div>

      <div
        style={{
          transform: viewMode === 'landing' ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.4s ease-in-out',
          position: viewMode === 'landing' ? 'relative' : 'absolute',
          width: '100%',
          opacity: viewMode === 'landing' ? 1 : 0,
          pointerEvents: viewMode === 'landing' ? 'auto' : 'none',
        }}
      >
        {renderLandingView()}
      </div>

      <div
        style={{
          transform: viewMode === 'tiles' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s ease-in-out',
          position: viewMode === 'tiles' ? 'relative' : 'absolute',
          width: '100%',
          opacity: viewMode === 'tiles' ? 1 : 0,
          pointerEvents: viewMode === 'tiles' ? 'auto' : 'none',
        }}
      >
        {renderTilesView()}
      </div>

      <div
        style={{
          transform: viewMode === 'files' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s ease-in-out',
          position: viewMode === 'files' ? 'relative' : 'absolute',
          width: '100%',
          opacity: viewMode === 'files' ? 1 : 0,
          pointerEvents: viewMode === 'files' ? 'auto' : 'none',
        }}
      >
        {renderFilesView()}
      </div>
    </div>
  )
}

export default BioDashboard
