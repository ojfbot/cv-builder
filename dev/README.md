# Dev Directory - Mock Data for Development

This directory contains mock data for development and testing purposes. It mirrors the structure used in production (`personal/`) and testing (`temp/`).

## Directory Structure

```
dev/
├── bios/        # Sample resume/bio data
├── jobs/        # Sample job listings
├── output/      # Sample generated outputs (resumes, cover letters)
└── research/    # Sample research data
```

## Purpose

- **Development**: Use consistent mock data across team members
- **Testing**: Automated tests can reference these files
- **Examples**: Demonstrate expected data formats
- **Git-tracked**: Unlike `personal/` and `temp/`, this directory is committed to git

## Files

- `bios/sample-bio.json` - Example personal bio/resume data
- `bios/sample-resume.txt` - Example resume in plain text format
- `jobs/sample-job.json` - Example job listing

## Usage

These files can be loaded by the application during development to test workflows without requiring real user data.
