# Resume Upload Feature

## Overview

The resume upload feature allows users to upload their existing resume files (PDF, DOCX, TXT, or MD) through the chat interface. The system automatically parses the content and stores it in the containerized file system for future processing.

## Supported Formats

- **PDF** (.pdf) - Parsed using pdf-parse
- **Microsoft Word** (.docx) - Parsed using mammoth
- **Plain Text** (.txt) - Direct text extraction
- **Markdown** (.md) - Direct text extraction

## File Size Limits

- Maximum file size: **10MB**
- Rate limiting: 100 requests per 15 minutes per IP

## Architecture

### Three-Tier Storage Structure

The system uses a three-tier directory structure for organized data management:

```
cv-builder/
├── personal/        # User data (gitignored, private)
│   ├── bios/        # Uploaded resumes and bio data
│   ├── jobs/        # Job listings
│   ├── output/      # Generated resumes and documents
│   └── research/    # Research data
├── dev/            # Mock data for development (tracked in git)
│   ├── bios/
│   ├── jobs/
│   ├── output/
│   └── research/
└── temp/           # Ephemeral test files (gitignored)
    ├── bios/
    ├── jobs/
    ├── output/
    └── research/
```

### Data Flow

```
Browser (File Upload)
  ↓
POST /api/bios/files (FormData)
  ↓
API Server (Validation + Parsing)
  ↓
BioFileManager Service
  ↓
File Storage (personal/bios/)
  ↓
Success Response to Browser
```

## API Endpoints

### File Management API

The application uses a comprehensive file management API:

- **`GET /api/bios/files`** - List all bio files with metadata
- **`GET /api/bios/files/:fileId`** - Download a specific file
- **`POST /api/bios/files`** - Upload a new file
- **`PUT /api/bios/files/:fileId`** - Update/rename a file
- **`DELETE /api/bios/files/:fileId`** - Delete a file
- **`GET /api/bios/files/:fileId/preview`** - Get file preview/metadata

### Upload File

**Endpoint:** `POST /api/bios/files`

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with 'file' field containing the file

**Response:**
```json
{
  "id": "uuid",
  "name": "john_doe_resume.pdf",
  "type": "application/pdf",
  "size": 250880,
  "created": "2025-01-15T10:30:00.000Z",
  "modified": "2025-01-15T10:30:00.000Z",
  "metadata": {
    "fileType": "pdf",
    "pageCount": 2,
    "wordCount": 450
  }
}
```

**Error Response:**
```json
{
  "error": "File size exceeds 10MB limit"
}
```

## Security Features

### File Validation

1. **File Type Whitelist**: Only allowed MIME types and extensions are accepted
2. **Content Validation**: Uses magic bytes to verify file types
3. **File Size Validation**: 10MB maximum to prevent large file attacks
4. **Filename Sanitization**: Removes path traversal attempts and special characters
5. **Rate Limiting**: Prevents abuse with configurable rate limits

### Security Middleware

- **Helmet**: Sets security headers
- **CORS**: Restricts origins to configured domain
- **Multer File Filter**: Validates file types before processing
- **Magic Bytes Validation**: Verifies actual file content type

## Usage

### From Chat Interface

1. Click the "Upload Resume" badge button in the chat interface
2. Select your resume file from the file picker dialog
3. Wait for the upload and parsing to complete
4. Navigate to the Bio Dashboard to view uploaded files

### From Bio Dashboard

1. Navigate to the Bio tab
2. Click "Upload File" button
3. Select your resume file
4. View the file in the file list with metadata

### From Code

```typescript
import { uploadBioFile } from '../api/bioFilesApi'

// Upload a resume file
const file = document.querySelector('input[type="file"]').files[0]
const result = await uploadBioFile(file)

console.log('Uploaded:', result)
```

## File Storage

### Stored Files

For each upload, a metadata JSON is created:

Example structure:
```
personal/bios/
├── resume.pdf
├── cover-letter.docx
└── .metadata/
    ├── {uuid}.json
    └── {uuid}.json
```

### Metadata Format

```json
{
  "id": "uuid",
  "name": "resume.pdf",
  "originalName": "John_Doe_Resume.pdf",
  "type": "application/pdf",
  "extension": "pdf",
  "size": 250880,
  "sizeFormatted": "245 KB",
  "path": "personal/bios/resume.pdf",
  "created": "2025-01-15T10:30:00.000Z",
  "modified": "2025-01-15T10:30:00.000Z",
  "metadata": {
    "fileType": "pdf",
    "pageCount": 2,
    "wordCount": 450
  }
}
```

## Error Handling

### Common Errors

1. **Invalid File Type**
   - Error: "Invalid file type. Only PDF, DOCX, TXT, MD, JSON, CSV, and images are allowed."
   - Solution: Convert your resume to a supported format

2. **File Too Large**
   - Error: "File size exceeds 10MB limit"
   - Solution: Compress or reduce the file size

3. **Parse Error**
   - Error: "Failed to parse PDF: ..."
   - Solution: Ensure the file is not corrupted or password-protected

4. **Upload Timeout**
   - Error: "Upload timeout - file may be too large or connection is slow"
   - Solution: Check network connection or reduce file size

5. **File Not Found**
   - Error: "File not found"
   - Solution: Ensure the file still exists in the system

## Implementation Details

### Resume Parser Utility

Located at: `packages/agent-core/src/utils/resume-parser.ts`

Key functions:
- `parseResume()` - Main parser function
- `parsePDF()` - PDF-specific parsing
- `parseDOCX()` - Word document parsing
- `parseText()` - Plain text/markdown parsing
- `validateFileSize()` - File size validation
- `sanitizeFilename()` - Filename sanitization

### BioFileManager Service

Located at: `packages/api/src/services/bio-file-manager.ts`

Features:
- CRUD operations for file management
- JSON-based metadata storage
- Thumbnail generation for images
- Text preview extraction
- File statistics aggregation

### API Routes

Located at: `packages/api/src/routes/bio-files.ts`

All 6 REST endpoints for complete file management.

### Browser Integration

Located at: `packages/browser-app/src/components/InteractiveChat.tsx`

Function: `handleFileUpload()`

Flow:
1. Creates file input element
2. Triggers file picker dialog
3. Shows upload progress message
4. Calls API endpoint
5. Displays success/error message
6. Auto-navigates to Bio tab

## Testing

### Manual Testing

1. Start the API server: `npm run dev:api`
2. Start the browser app: `npm run dev`
3. Navigate to the chat interface
4. Click "Upload Resume" badge
5. Select a test file from `dev/bios/` or upload your own
6. Verify the file is uploaded and appears in Bio Dashboard

### Test Files

Sample test files are available in:
- `dev/bios/sample-bio.json` - JSON bio data
- `dev/bios/sample-resume.txt` - Plain text resume
- `public/examples/bio-example.json` - Example bio structure

### Expected Results

- File uploads successfully
- Text is extracted correctly (for parseable formats)
- Metadata is accurate (word count, page count for PDFs)
- File appears in Bio Dashboard file list
- File can be downloaded from Bio Dashboard
- File can be deleted from Bio Dashboard

## Future Enhancements

1. **Multiple File Upload**: Support uploading multiple resumes at once
2. **OCR Support**: Parse scanned PDFs using OCR
3. **Smart Bio Extraction**: Automatically parse resume into Bio schema fields
4. **Version History**: Keep track of multiple versions of uploaded resumes
5. **File Preview**: Show visual preview of uploaded document
6. **Drag and Drop**: Support drag-and-drop file upload in chat
7. **Progress Indicator**: Show upload progress bar for large files
8. **Resume Comparison**: Compare uploaded resume with generated versions

## Troubleshooting

### Server Not Running

If you see "Verify the API server is running on port 3001":
```bash
npm run dev:api
```

### CORS Errors

Ensure the CORS origin in the API server matches your browser app URL:
```bash
# In packages/api/.env or env.json
CORS_ORIGIN=http://localhost:3000
```

### File Not Uploading

Check the console logs for detailed error messages:
```bash
# API server logs
[BioFileManager] File uploaded successfully: ...

# Browser console
[InteractiveChat] Upload successful: { id: 'uuid', ... }
```

### Metadata Not Showing

Ensure the `.metadata/` directory exists in `personal/bios/`:
```bash
mkdir -p personal/bios/.metadata
```

## Related Code

- Resume parser: `packages/agent-core/src/utils/resume-parser.ts`
- BioFileManager service: `packages/api/src/services/bio-file-manager.ts`
- API routes: `packages/api/src/routes/bio-files.ts`
- API client: `packages/browser-app/src/api/bioFilesApi.ts`
- Upload handler: `packages/browser-app/src/components/InteractiveChat.tsx`
- Bio Dashboard: `packages/browser-app/src/components/BioDashboard.tsx`
