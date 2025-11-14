import { z } from 'zod'

/**
 * Navigation System
 *
 * Provides a robust, keyed navigation system for tabs instead of index-based navigation.
 * This prevents issues with tab order changes and makes navigation more explicit.
 */

// Define tab keys as a const enum for type safety
export enum TabKey {
  INTERACTIVE = 'interactive',
  BIO = 'bio',
  JOBS = 'jobs',
  OUTPUTS = 'outputs',
  RESEARCH = 'research',
  PIPELINES = 'pipelines',
  TOOLBOX = 'toolbox',
}

// Zod schema for runtime validation
export const TabKeySchema = z.nativeEnum(TabKey)

// Tab metadata type
export interface TabMetadata {
  key: TabKey
  label: string
  icon: string
  description: string
  index: number // Position in the tab list
}

// Tab registry - single source of truth for all tabs
export const TAB_REGISTRY: Record<TabKey, TabMetadata> = {
  [TabKey.INTERACTIVE]: {
    key: TabKey.INTERACTIVE,
    label: 'Interactive',
    icon: '💬',
    description: 'Chat with the AI assistant',
    index: 0,
  },
  [TabKey.BIO]: {
    key: TabKey.BIO,
    label: 'Bio',
    icon: '👤',
    description: 'Your professional profile and experience',
    index: 1,
  },
  [TabKey.JOBS]: {
    key: TabKey.JOBS,
    label: 'Jobs',
    icon: '💼',
    description: 'Job listings and opportunities',
    index: 2,
  },
  [TabKey.OUTPUTS]: {
    key: TabKey.OUTPUTS,
    label: 'Outputs',
    icon: '📄',
    description: 'Generated resumes and cover letters',
    index: 3,
  },
  [TabKey.RESEARCH]: {
    key: TabKey.RESEARCH,
    label: 'Research',
    icon: '🔬',
    description: 'Industry research and insights',
    index: 4,
  },
  [TabKey.PIPELINES]: {
    key: TabKey.PIPELINES,
    label: 'Pipelines',
    icon: '🔄',
    description: 'Automated workflows and job application pipelines',
    index: 5,
  },
  [TabKey.TOOLBOX]: {
    key: TabKey.TOOLBOX,
    label: 'Toolbox',
    icon: '🧰',
    description: 'Utilities and tools for career development',
    index: 6,
  },
}

// Ordered list of tabs for rendering
export const TAB_ORDER: TabKey[] = [
  TabKey.INTERACTIVE,
  TabKey.BIO,
  TabKey.JOBS,
  TabKey.OUTPUTS,
  TabKey.RESEARCH,
  TabKey.PIPELINES,
  TabKey.TOOLBOX,
]

/**
 * Helper functions
 */

// Get tab metadata by key
export const getTabByKey = (key: TabKey): TabMetadata => {
  return TAB_REGISTRY[key]
}

// Get tab metadata by index
export const getTabByIndex = (index: number): TabMetadata | undefined => {
  return TAB_ORDER[index] ? TAB_REGISTRY[TAB_ORDER[index]] : undefined
}

// Get index from tab key
export const getIndexFromKey = (key: TabKey): number => {
  return TAB_REGISTRY[key].index
}

// Get key from index
export const getKeyFromIndex = (index: number): TabKey | undefined => {
  return TAB_ORDER[index]
}

// Validate tab key
export const isValidTabKey = (key: string): key is TabKey => {
  return Object.values(TabKey).includes(key as TabKey)
}

// Get all tab metadata in order
export const getAllTabs = (): TabMetadata[] => {
  return TAB_ORDER.map(key => TAB_REGISTRY[key])
}

// Get tab label for display
export const getTabLabel = (key: TabKey): string => {
  return TAB_REGISTRY[key].label
}

// Get tab icon for display
export const getTabIcon = (key: TabKey): string => {
  return TAB_REGISTRY[key].icon
}

/**
 * Agent-friendly tab descriptions
 * For use in agent prompts to help them understand tab navigation
 */
export const getAgentTabDescription = (): string => {
  return `
Available tabs for navigation:

${TAB_ORDER.map(key => {
  const tab = TAB_REGISTRY[key]
  return `- **${key}** (${tab.icon} ${tab.label}): ${tab.description}`
}).join('\n')}

When suggesting navigation, use the tab key (e.g., "bio", "jobs", "outputs") in your metadata.
  `.trim()
}

/**
 * Get tab key from various input formats
 * Supports: exact key, label, index, case-insensitive matching
 */
export const parseTabReference = (ref: string | number): TabKey | undefined => {
  // If it's a number, treat as index
  if (typeof ref === 'number') {
    return getKeyFromIndex(ref)
  }

  const refLower = ref.toLowerCase()

  // Try exact key match
  if (isValidTabKey(refLower)) {
    return refLower as TabKey
  }

  // Try label match (case-insensitive)
  const matchingTab = TAB_ORDER.find(key => {
    const tab = TAB_REGISTRY[key]
    return tab.label.toLowerCase() === refLower
  })

  return matchingTab
}

/**
 * Legacy support: Convert index-based navigation to key-based
 */
export const convertIndexToKey = (index: number): TabKey => {
  const key = getKeyFromIndex(index)
  if (!key) {
    console.warn(`[Navigation] Invalid tab index: ${index}, defaulting to INTERACTIVE`)
    return TabKey.INTERACTIVE
  }
  return key
}

/**
 * Legacy support: Convert key-based navigation to index-based
 */
export const convertKeyToIndex = (key: TabKey): number => {
  return getIndexFromKey(key)
}
