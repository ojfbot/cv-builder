/**
 * CVJobBead — FrameBeadLike shape for Resume Builder job listings.
 *
 * Satisfies the FrameBeadLike contract defined in ADR-0016 (core repo).
 * Deliberately not imported from @core/workflows to avoid a cross-repo
 * dependency — the interface is reproduced locally per ADR-0016 guidance.
 *
 * Prefix: "cv-"
 * sourceApp: "cv-builder"
 */

/**
 * Bead status for CV job listings.
 *
 * Derived from applicationDeadline:
 *   - no deadline or future deadline  → "active"
 *   - past deadline                   → "archived"
 *   - manually closed                 → "complete"
 */
export type CVJobBeadStatus = 'active' | 'complete' | 'archived';

export interface CVJobBead {
  /** Prefixed bead id: "cv-{jobId}" */
  id: string;
  /** Lifecycle status derived from application deadline */
  status: CVJobBeadStatus;
  /** Owning sub-app — always "cv-builder" */
  sourceApp: 'cv-builder';
  /** Aggregation-relevant fields from the source JobListing */
  payload: {
    jobTitle: string;
    company: string;
    location?: string;
    applicationDeadline?: string;
    postedDate?: string;
    applicationUrl?: string;
    [key: string]: unknown;
  };
}
