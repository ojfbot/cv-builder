/**
 * Unit tests for mapJobToBead()
 *
 * Run with: pnpm --filter @resume-builder/api test
 */
import { describe, it, expect } from 'vitest';
import { mapJobToBead } from './mapJobToBead.js';
import type { JobListing } from '@resume-builder/agent-core';

const baseJob: JobListing = {
  id: 'abc123',
  title: 'Frontend Engineer',
  company: 'Acme Corp',
  description: 'Build great UIs.',
  requirements: ['TypeScript', 'React'],
  niceToHave: [],
};

describe('mapJobToBead()', () => {
  it('maps id with cv- prefix', () => {
    const bead = mapJobToBead(baseJob);
    expect(bead.id).toBe('cv-abc123');
  });

  it('maps active job status when no deadline is set', () => {
    const bead = mapJobToBead(baseJob);
    expect(bead.status).toBe('active');
  });

  it('maps active job status when deadline is in the future', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const bead = mapJobToBead({ ...baseJob, applicationDeadline: futureDate });
    expect(bead.status).toBe('active');
  });

  it('maps archived status when deadline is in the past', () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const bead = mapJobToBead({ ...baseJob, applicationDeadline: pastDate });
    expect(bead.status).toBe('archived');
  });

  it('sets type to job-listing', () => {
    const bead = mapJobToBead(baseJob);
    expect(bead.type).toBe('job-listing');
  });

  it('sets sourceApp to cv-builder', () => {
    const bead = mapJobToBead(baseJob);
    expect(bead.sourceApp).toBe('cv-builder');
  });

  it('sets created_at from postedDate when available', () => {
    const job = { ...baseJob, postedDate: '2026-03-01T00:00:00.000Z' };
    const bead = mapJobToBead(job);
    expect(bead.created_at).toBe('2026-03-01T00:00:00.000Z');
  });

  it('sets created_at to a valid ISO timestamp when postedDate is absent', () => {
    const bead = mapJobToBead(baseJob);
    expect(() => new Date(bead.created_at).toISOString()).not.toThrow();
    expect(bead.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sets updated_at to a valid ISO timestamp', () => {
    const bead = mapJobToBead(baseJob);
    expect(() => new Date(bead.updated_at).toISOString()).not.toThrow();
    expect(bead.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes required payload fields', () => {
    const job: JobListing = {
      ...baseJob,
      location: 'Remote',
      applicationDeadline: '2026-06-01',
      postedDate: '2026-03-01',
      applicationUrl: 'https://acme.com/apply',
    };
    const bead = mapJobToBead(job);
    expect(bead.payload.jobTitle).toBe('Frontend Engineer');
    expect(bead.payload.company).toBe('Acme Corp');
    expect(bead.payload.location).toBe('Remote');
    expect(bead.payload.applicationDeadline).toBe('2026-06-01');
    expect(bead.payload.postedDate).toBe('2026-03-01');
    expect(bead.payload.applicationUrl).toBe('https://acme.com/apply');
  });
});
