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
POST /api/upload/resume (FormData)
  ↓
API Server (Validation + Parsing)
  ↓
Resume Parser Utility
  ↓
File Storage (personal/bios/)
  ↓
Success Response to Browser
```

## API Endpoint

### POST /api/upload/resume

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with 'resume' field containing the file

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Extracted resume text content...",
    "metadata": {
      "fileType": "pdf",
      "originalFilename": "john_doe_resume.pdf",
      "uploadDate": "2025-01-15T10:30:00.000Z",
      "pageCount": 2,
      "wordCount": 450
    },
    "storedPath": "personal/bios/1736938200000_john_doe_resume.pdf"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "File size exceeds 10MB limit"
}
```

## Security Features

### File Validation

1. **File Type Whitelist**: Only allowed MIME types and extensions are accepted
2. **File Size Validation**: 10MB maximum to prevent large file attacks
3. **Filename Sanitization**: Removes path traversal attempts and special characters
4. **Rate Limiting**: Prevents abuse with 100 requests per 15 minutes

### Security Middleware

- **Helmet**: Sets security headers
- **CORS**: Restricts origins to configured domain
- **Multer File Filter**: Validates file types before processing

## Usage

### From Chat Interface

1. Click the "Upload Resume" badge button in the chat interface
2. Select your resume file from the file picker dialog
3. Wait for the upload and parsing to complete
4. Review the extracted text preview in the chat

### From Code

```typescript
import { apiClient } from '../api/client'

// Upload a resume file
const file = document.querySelector('input[type="file"]').files[0]
const result = await apiClient.uploadResume(file)

console.log('Uploaded:', result.metadata)
console.log('Extracted text:', result.text)
```

## File Storage

### Stored Files

For each upload, two files are created:

1. **Original file**: `{timestamp}_{sanitized_filename}`
2. **Metadata file**: `{timestamp}_{sanitized_filename}.meta.json`

Example:
```
personal/bios/
├── 1736938200000_john_doe_resume.pdf
└── 1736938200000_john_doe_resume.pdf.meta.json
```

### Metadata Format

```json
{
  "fileType": "pdf",
  "originalFilename": "john_doe_resume.pdf",
  "uploadDate": "2025-01-15T10:30:00.000Z",
  "pageCount": 2,
  "wordCount": 450,
  "storedFilename": "1736938200000_john_doe_resume.pdf",
  "uploadTimestamp": 1736938200000
}
```

## Error Handling

### Common Errors

1. **Invalid File Type**
   - Error: "Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed."
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

### API Route

Located at: `packages/api/src/routes/upload.ts`

Features:
- Multer configuration for file uploads
- File type validation middleware
- Error handling for upload failures
- Storage to personal/bios/ directory

### Browser Integration

Located at: `packages/browser-app/src/components/InteractiveChat.tsx`

Function: `handleFileUpload()`

Flow:
1. Creates file input element
2. Triggers file picker dialog
3. Shows upload progress message
4. Calls API endpoint
5. Displays success/error message with extracted content

## Testing

### Manual Testing

1. Start the API server: `npm run dev:api`
2. Start the browser app: `npm run dev`
3. Navigate to the chat interface
4. Click "Upload Resume" badge
5. Select a test file from `dev/bios/` or upload your own
6. Verify the file is parsed and stored correctly

### Test Files

Sample test files are available in:
- `dev/bios/sample-bio.json` - JSON bio data
- `public/examples/bio-example.json` - Example bio structure

### Expected Results

- ✅ File uploads successfully
- ✅ Text is extracted correctly
- ✅ Metadata is accurate (word count, page count)
- ✅ File is stored in personal/bios/
- ✅ Metadata JSON is created
- ✅ Success message displays in chat

## Future Enhancements

1. **Multiple File Upload**: Support uploading multiple resumes at once
2. **OCR Support**: Parse scanned PDFs using OCR
3. **Smart Bio Extraction**: Automatically parse resume into Bio schema fields
4. **Version History**: Keep track of multiple versions of uploaded resumes
5. **File Preview**: Show visual preview of uploaded document
6. **Drag and Drop**: Support drag-and-drop file upload in chat
7. **Progress Indicator**: Show upload progress bar for large files

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

### File Not Parsing

Check the console logs for detailed error messages:
```bash
# API server logs
[Upload] Resume uploaded and parsed successfully: ...

# Browser console
[InteractiveChat] Upload successful: { fileType: 'pdf', ... }
```

## Related Code

- Resume parser: `packages/agent-core/src/utils/resume-parser.ts`
- Upload API route: `packages/api/src/routes/upload.ts`
- API client: `packages/browser-app/src/api/client.ts:279-316`
- Upload handler: `packages/browser-app/src/components/InteractiveChat.tsx:349-431`
- Badge action definition: `packages/browser-app/src/models/badge-action.ts:288`
