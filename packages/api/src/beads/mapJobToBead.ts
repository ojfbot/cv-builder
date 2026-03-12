import { type JobListing } from '@resume-builder/agent-core';
import { type CVJobBead, type CVJobBeadStatus } from './types.js';

/**
 * Derive bead status from the job listing's applicationDeadline.
 *
 * Rules:
 *   - No deadline present  → "active"  (open listing, no known close date)
 *   - Deadline in the future → "active"
 *   - Deadline in the past   → "archived" (window closed)
 */
function deriveStatus(applicationDeadline?: string): CVJobBeadStatus {
  if (!applicationDeadline) {
    return 'active';
  }
  const deadline = new Date(applicationDeadline);
  if (isNaN(deadline.getTime())) {
    return 'active';
  }
  return deadline < new Date() ? 'archived' : 'active';
}

/**
 * Map a JobListing domain object to a CVJobBead.
 *
 * ADR-0016 contract:
 *   id         — "cv-{jobId}"
 *   type       — "job-listing" (Mayor discriminant)
 *   status     — derived from applicationDeadline
 *   sourceApp  — "cv-builder"
 *   created_at — sourced from job.postedDate when available; wall-clock fallback (noted)
 *   updated_at — no update timestamp on JobListing; wall-clock at map time
 *   payload    — aggregation-relevant fields
 */
export function mapJobToBead(job: JobListing): CVJobBead {
  const now = new Date().toISOString();
  return {
    id: `cv-${job.id}`,
    type: 'job-listing',
    status: deriveStatus(job.applicationDeadline),
    sourceApp: 'cv-builder',
    // created_at: prefer postedDate (real signal); fall back to wall-clock (no stored date on JobListing)
    created_at: job.postedDate ?? now,
    // updated_at: JobListing has no update timestamp; wall-clock at map time
    updated_at: now,
    payload: {
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      applicationDeadline: job.applicationDeadline,
      postedDate: job.postedDate,
      applicationUrl: job.applicationUrl,
    },
  };
}
