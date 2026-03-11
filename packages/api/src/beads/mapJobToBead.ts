import { type JobListing } from '@cv-builder/agent-core';
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
 *   id        — "cv-{jobId}"
 *   status    — derived from applicationDeadline
 *   sourceApp — "cv-builder"
 *   payload   — aggregation-relevant fields
 */
export function mapJobToBead(job: JobListing): CVJobBead {
  return {
    id: `cv-${job.id}`,
    status: deriveStatus(job.applicationDeadline),
    sourceApp: 'cv-builder',
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
