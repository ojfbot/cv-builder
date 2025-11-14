import {
  ResumeGeneratorAgent,
  JobAnalysisAgent,
  TailoringAgent,
  SkillsGapAgent,
  InterviewCoachAgent,
} from '@cv-builder/agent-core';
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent';
import { getConfig } from '@cv-builder/agent-core/utils/config';

/**
 * AgentManager - Singleton service for managing agent instances
 *
 * This service:
 * - Loads configuration from env.json securely on the server
 * - Instantiates and manages all agent instances
 * - Provides a clean API for agent operations
 * - Ensures agents are not exposed to the browser
 */
class AgentManager {
  private static instance: AgentManager | null = null;

  private orchestrator: OrchestratorAgent | null = null;
  private resumeGenerator: ResumeGeneratorAgent | null = null;
  private jobAnalysis: JobAnalysisAgent | null = null;
  private tailoring: TailoringAgent | null = null;
  private skillsGap: SkillsGapAgent | null = null;
  private interviewCoach: InterviewCoachAgent | null = null;

  private apiKey: string | null = null;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Initialize the agent manager with configuration
   * Loads API key from env.json securely
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      const config = getConfig();
      this.apiKey = config.anthropicApiKey;

      if (!this.apiKey) {
        throw new Error('API key not found in configuration');
      }

      // Initialize all agents
      this.orchestrator = new OrchestratorAgent(this.apiKey);
      this.resumeGenerator = new ResumeGeneratorAgent(this.apiKey);
      this.jobAnalysis = new JobAnalysisAgent(this.apiKey);
      this.tailoring = new TailoringAgent(this.apiKey);
      this.skillsGap = new SkillsGapAgent(this.apiKey);
      this.interviewCoach = new InterviewCoachAgent(this.apiKey);

      this.initialized = true;
      console.log('AgentManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AgentManager:', error);
      throw new Error('Failed to initialize agent services. Please check env.json configuration.');
    }
  }

  /**
   * Check if agent manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get orchestrator agent instance
   */
  getOrchestrator(): OrchestratorAgent {
    if (!this.initialized || !this.orchestrator) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.orchestrator;
  }

  /**
   * Get resume generator agent instance
   */
  getResumeGenerator(): ResumeGeneratorAgent {
    if (!this.initialized || !this.resumeGenerator) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.resumeGenerator;
  }

  /**
   * Get job analysis agent instance
   */
  getJobAnalysis(): JobAnalysisAgent {
    if (!this.initialized || !this.jobAnalysis) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.jobAnalysis;
  }

  /**
   * Get tailoring agent instance
   */
  getTailoring(): TailoringAgent {
    if (!this.initialized || !this.tailoring) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.tailoring;
  }

  /**
   * Get skills gap agent instance
   */
  getSkillsGap(): SkillsGapAgent {
    if (!this.initialized || !this.skillsGap) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.skillsGap;
  }

  /**
   * Get interview coach agent instance
   */
  getInterviewCoach(): InterviewCoachAgent {
    if (!this.initialized || !this.interviewCoach) {
      throw new Error('AgentManager not initialized. Call initialize() first.');
    }
    return this.interviewCoach;
  }

  /**
   * Reset the agent manager (useful for testing)
   */
  reset(): void {
    this.orchestrator = null;
    this.resumeGenerator = null;
    this.jobAnalysis = null;
    this.tailoring = null;
    this.skillsGap = null;
    this.interviewCoach = null;
    this.apiKey = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const agentManager = AgentManager.getInstance();
