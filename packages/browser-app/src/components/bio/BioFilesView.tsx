import type { BioFile } from '@resume-builder/agent-core'
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
} from '@carbon/react'
import { Upload, ChatBot, View, Download, TrashCan } from '@carbon/icons-react'

interface BioFilesViewProps {
  bioFiles: BioFile[]
  isLoadingFiles: boolean
  error: string | null
  uploadingFile: boolean
  onErrorDismiss: () => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteFile: (fileId: string) => void
  onDownloadFile: (fileId: string, filename: string) => void
  onPreviewFile: (fileId: string) => void
  onChatAboutFile: (fileId: string) => void
}

export function BioFilesView({
  bioFiles,
  isLoadingFiles,
  error,
  uploadingFile,
  onErrorDismiss,
  onFileUpload,
  onDeleteFile,
  onDownloadFile,
  onPreviewFile,
  onChatAboutFile,
}: BioFilesViewProps) {
  return (
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
            onChange={onFileUpload}
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
          onCloseButtonClick={onErrorDismiss}
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
                      data-element="bio-file-chat-button"
                      size="sm"
                      kind="ghost"
                      renderIcon={ChatBot}
                      iconDescription="Chat about document"
                      hasIconOnly
                      onClick={() => onChatAboutFile(file.id)}
                    />
                    <Button
                      data-element="bio-file-preview-button"
                      size="sm"
                      kind="ghost"
                      renderIcon={View}
                      iconDescription="Preview"
                      hasIconOnly
                      onClick={() => onPreviewFile(file.id)}
                    />
                    <Button
                      data-element="bio-file-download-button"
                      size="sm"
                      kind="ghost"
                      renderIcon={Download}
                      iconDescription="Download"
                      hasIconOnly
                      onClick={() => onDownloadFile(file.id, file.originalName)}
                    />
                    <Button
                      data-element="bio-file-delete-button"
                      size="sm"
                      kind="ghost"
                      renderIcon={TrashCan}
                      iconDescription="Delete"
                      hasIconOnly
                      onClick={() => onDeleteFile(file.id)}
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
}
