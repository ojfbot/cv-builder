/**
 * Application configuration constants
 */

/**
 * Port mapping for multi-application navigation
 * Maps application names to their respective localhost ports
 */
export const APP_PORTS: Record<string, number> = {
  'CV Builder': 3000,
  'BlogEngine': 3005,
  'TripPlanner': 3010,
} as const

/**
 * List of all available applications in the suite
 */
export const APPLICATIONS = [
  'CV Builder',
  'BlogEngine',
  'TripPlanner',
  'Project Manager',
  'Analytics Dashboard',
] as const
