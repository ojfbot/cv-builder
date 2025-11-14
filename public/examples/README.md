# Example Data

This directory contains example data files to help you get started with CV Builder.

## Files

### bio-example.json
A sample professional bio showing the expected data structure. Copy this to `bio/bio.json` and customize it with your own information.

### job-example.json
An example job listing showing how to structure job information. Save job listings you're interested in to the `jobs/` directory.

## Getting Started

1. Copy the bio example to your private bio directory:
   ```bash
   mkdir -p bio
   cp public/examples/bio-example.json bio/bio.json
   ```

2. Edit `bio/bio.json` with your actual information

3. Add job listings to the jobs directory:
   ```bash
   mkdir -p jobs
   cp public/examples/job-example.json jobs/my-dream-job.json
   ```

4. Customize the job listing with actual job details

5. Start using CV Builder:
   ```bash
   npm run cli
   ```

## Data Privacy

Remember that files in `bio/`, `jobs/`, and `output/` directories are automatically excluded from version control via `.gitignore`. Only share the examples in `public/` directory if you're distributing this codebase.
