/**
 * Test timing constants
 * Centralized timing values for better maintainability and tuning
 */
export const TEST_TIMING = {
  /** Short delay for UI to settle after quick interactions (500ms) */
  UI_SETTLE: 500,

  /** Wait for chat responses and content updates (1000ms) */
  CHAT_RESPONSE: 1000,

  /** Wait for navigation transitions and tab changes (1500ms) */
  NAVIGATION: 1500,

  /** Wait for heavy content loading and complex state updates (2000ms) */
  CONTENT_LOAD: 2000,

  /** Wait for chat expansion animation to complete (1500ms) */
  CHAT_EXPANSION: 1500,

  /** Wait for CondensedChat to fully render and become interactive (3000ms) */
  CONDENSED_CHAT_READY: 3000,
} as const;

/**
 * Helper function to create a promise that resolves after a delay
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
