/**
 * Store Map Schema
 *
 * Provides mapping for querying application state (Redux, MobX, Zustand, etc.).
 * Enables LLM agents to wait for state changes and inspect application state.
 */

/**
 * Supported store/state management types
 */
export type StoreType = 'redux' | 'mobx' | 'zustand' | 'jotai' | 'valtio' | 'custom';

/**
 * Query value type
 */
export type QueryType = 'string' | 'boolean' | 'number' | 'object' | 'array' | 'null' | 'undefined';

/**
 * Store query definition
 */
export interface StoreQuery {
  /** State path (e.g., "state.ui.activeTab") */
  path: string;
  /** Expected value type */
  type: QueryType;
  /** Possible values (for validation and LLM context) */
  values?: any[];
  /** Human-readable description */
  description?: string;
  /** Whether this query requires dev mode */
  devModeOnly?: boolean;
}

/**
 * Store queries organized by category
 */
export interface StoreQueries {
  [queryName: string]: StoreQuery;
}

/**
 * Complete store map for an application
 */
export interface StoreMap {
  /** Application identifier */
  app: string;
  /** Store/state management type */
  storeType: StoreType;
  /** JavaScript path to access store (e.g., "window.__REDUX_STORE__") */
  accessPath: string;
  /** Alternative access paths (fallbacks) */
  alternativeAccessPaths?: string[];
  /** Query definitions */
  queries: StoreQueries;
  /** Map version */
  version?: string;
  /** Last update timestamp */
  updated?: string;
}

/**
 * Store query request
 */
export interface StoreQueryRequest {
  /** Application name */
  app?: string;
  /** Query name from store map */
  query: string;
}

/**
 * Store query response
 */
export interface StoreQueryResponse {
  /** Query name */
  query: string;
  /** Full query path */
  queryPath: string;
  /** Query result value */
  result: any;
  /** Result type */
  type: string;
  /** Query timestamp */
  timestamp: string;
}

/**
 * Store wait request (wait for state condition)
 */
export interface StoreWaitRequest {
  /** Application name */
  app?: string;
  /** Query name from store map */
  query: string;
  /** Expected value to wait for */
  value: any;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Polling interval in milliseconds */
  pollInterval?: number;
}

/**
 * Store wait response
 */
export interface StoreWaitResponse {
  /** Whether condition was met */
  success: boolean;
  /** Query name */
  query: string;
  /** Expected value */
  value: any;
  /** Actual final value (if timeout) */
  actualValue?: any;
  /** Timestamp when condition was met (or timeout occurred) */
  timestamp: string;
  /** Time taken in milliseconds */
  elapsed?: number;
}

/**
 * Store snapshot request (full state dump)
 */
export interface StoreSnapshotRequest {
  /** Application name */
  app?: string;
}

/**
 * Store snapshot response
 */
export interface StoreSnapshotResponse {
  /** Full state snapshot */
  snapshot: any;
  /** Snapshot timestamp */
  timestamp: string;
  /** Dev mode warning */
  devModeOnly: boolean;
  /** Store type */
  storeType: StoreType;
}

/**
 * Store validation result
 */
export interface StoreValidationResult {
  /** Store accessible */
  accessible: boolean;
  /** Store type matches expected */
  typeMatches: boolean;
  /** All queries valid */
  queriesValid: boolean;
  /** Query validation details */
  queryResults: {
    [queryName: string]: {
      valid: boolean;
      error?: string;
      actualType?: string;
      expectedType: string;
    };
  };
}
