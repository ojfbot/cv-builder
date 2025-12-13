/**
 * Application configuration constants
 */

/**
 * Port mapping for multi-application navigation
 * Maps application names to their respective localhost ports
 */
export const APP_PORTS = {
  'CV Builder': 3000,
  'BlogEngine': 3005,
  'TripPlanner': 3010,
} as const satisfies Record<string, number>

/**
 * List of all available applications in the suite
 * Only includes applications with defined ports to prevent runtime errors
 */
export const APPLICATIONS = Object.keys(APP_PORTS) as (keyof typeof APP_PORTS)[]
