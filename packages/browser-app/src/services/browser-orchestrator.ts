/**
 * Browser Orchestrator Service
 *
 * This is a browser-compatible wrapper that communicates with the backend API.
 * It no longer directly instantiates agents - all agent operations are handled
 * server-side through the API for security and separation of concerns.
 */

import type { Bio, JobListing } from '@cv-builder/agent-core';
import { BioSchema, JobListingSchema } from '@cv-builder/agent-core';
import { BrowserStorage } from '../utils/browser-storage.js';
import { apiClient as defaultApiClient, type ApiClient } from '../api/client.js';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class BrowserOrchestrator {
  private bioStorage: BrowserStorage;
  private jobStorage: BrowserStorage;
  private outputStorage: BrowserStorage;
  private conversationHistory: ConversationMessage[] = [];
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    // Use provided API client or default one
    this.apiClient = apiClient || defaultApiClient;

    // Initialize browser storage
    this.bioStorage = new BrowserStorage('cv-builder:bio');
    this.jobStorage = new BrowserStorage('cv-builder:jobs');
    this.outputStorage = new BrowserStorage('cv-builder:output');
  }

  /**
   * Process a user request through the API
   */
  async processRequest(userRequest: string): Promise<string> {
    try {
      const result = await this.apiClient.chat(userRequest, this.conversationHistory);
      this.conversationHistory = result.conversationHistory;
      return result.response;
    } catch (error) {
      console.error('Error processing request:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to process request'
      );
    }
  }

  /**
   * Process a user request with streaming through the API
   */
  async processRequestStreaming(
    userRequest: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    try {
      let fullResponse = '';

      const finalHistory = await this.apiClient.chatStream(
        userRequest,
        (chunk) => {
          fullResponse += chunk;
          onChunk(chunk);
        },
        this.conversationHistory
      );

      this.conversationHistory = finalHistory;
      return fullResponse;
    } catch (error) {
      console.error('Error streaming request:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to stream request'
      );
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Set conversation history
   */
  setConversationHistory(history: ConversationMessage[]): void {
    this.conversationHistory = [...history];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  // ========================================================================
  // Data Management Methods (Browser-side storage)
  // ========================================================================

  /**
   * Load bio from browser storage
   */
  async loadBio(): Promise<Bio> {
    try {
      const bioData = await this.bioStorage.read<Bio>('bio.json');
      return BioSchema.parse(bioData);
    } catch (error) {
      throw new Error('Bio not found. Please create your bio in the Bio tab first.');
    }
  }

  /**
   * Save bio to browser storage
   */
  async saveBio(bio: Bio): Promise<void> {
    BioSchema.parse(bio); // Validate before saving
    await this.bioStorage.write('bio.json', bio);
  }

  /**
   * Load job from browser storage
   */
  async loadJob(jobId: string): Promise<JobListing> {
    try {
      const jobData = await this.jobStorage.read<JobListing>(`${jobId}.json`);
      return JobListingSchema.parse(jobData);
    } catch (error) {
      throw new Error(`Job listing "${jobId}" not found. Please add it in the Jobs tab.`);
    }
  }

  /**
   * Save job to browser storage
   */
  async saveJob(job: JobListing): Promise<void> {
    JobListingSchema.parse(job); // Validate before saving
    await this.jobStorage.write(`${job.id}.json`, job);
  }

  /**
   * List all jobs from browser storage
   */
  async listJobs(): Promise<string[]> {
    const keys = await this.jobStorage.list('');
    return keys.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  }

  // ========================================================================
  // Agent Operation Methods (API-based)
  // ========================================================================

  /**
   * Generate a resume through the API
   */
  async generateResume(
    bio: Bio,
    jobListing?: JobListing,
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<string> {
    const result = await this.apiClient.generateResume(bio, jobListing, format);
    return result.resume;
  }

  /**
   * Tailor a resume to a specific job through the API
   */
  async tailorResume(
    bio: Bio,
    jobListing: JobListing,
    existingResume?: string
  ): Promise<string> {
    const result = await this.apiClient.tailorResume(bio, jobListing, existingResume);
    return result.resume;
  }

  /**
   * Analyze a job listing through the API
   */
  async analyzeJob(jobListing: JobListing, bio?: Bio): Promise<string> {
    const result = await this.apiClient.analyzeJob(jobListing, bio);
    return result.analysis;
  }

  /**
   * Analyze skills gap and generate learning path through the API
   */
  async analyzeSkillsGap(bio: Bio, jobListing: JobListing): Promise<string> {
    const result = await this.apiClient.analyzeSkillsGap(bio, jobListing);
    return result.learningPath;
  }

  /**
   * Generate a cover letter through the API
   */
  async generateCoverLetter(
    bio: Bio,
    jobListing: JobListing,
    tone?: 'professional' | 'enthusiastic' | 'formal' | 'casual'
  ): Promise<string> {
    const result = await this.apiClient.generateCoverLetter(bio, jobListing, tone);
    return result.coverLetter;
  }

  /**
   * Prepare interview materials through the API
   */
  async prepareInterview(
    bio: Bio,
    jobListing: JobListing,
    resume?: string
  ): Promise<string> {
    const result = await this.apiClient.prepareInterview(bio, jobListing, resume);
    return result.preparation;
  }

  // ========================================================================
  // Storage Access (for components that need direct storage access)
  // ========================================================================

  getBioStorage(): BrowserStorage {
    return this.bioStorage;
  }

  getJobStorage(): BrowserStorage {
    return this.jobStorage;
  }

  getOutputStorage(): BrowserStorage {
    return this.outputStorage;
  }
}
