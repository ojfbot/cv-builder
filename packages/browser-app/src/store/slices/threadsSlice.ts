import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClientV2, Thread, ThreadMessage, ThreadWithMessages } from '../../api/client-v2';

export interface ThreadsState {
  threads: Thread[];
  currentThreadId: string | null;
  currentThread: ThreadWithMessages | null;
  isLoading: boolean;
  error: string | null;
  isCreatingThread: boolean;
  lastCreatedThreadId: string | null;
}

const initialState: ThreadsState = {
  threads: [],
  currentThreadId: null,
  currentThread: null,
  isLoading: false,
  error: null,
  isCreatingThread: false,
  lastCreatedThreadId: null,
};

/**
 * Async thunks for thread operations
 */

export const fetchThreads = createAsyncThunk(
  'threads/fetchThreads',
  async (options?: { userId?: string; limit?: number }) => {
    return await apiClientV2.listThreads(options);
  }
);

export const createThread = createAsyncThunk(
  'threads/createThread',
  async (metadata?: { userId?: string; title?: string; metadata?: Record<string, unknown> }) => {
    return await apiClientV2.createThread(metadata);
  }
);

export const fetchThread = createAsyncThunk(
  'threads/fetchThread',
  async (threadId: string) => {
    return await apiClientV2.getThread(threadId);
  }
);

export const updateThread = createAsyncThunk(
  'threads/updateThread',
  async ({ threadId, updates }: { threadId: string; updates: { title?: string; metadata?: Record<string, unknown> } }) => {
    return await apiClientV2.updateThread(threadId, updates);
  }
);

export const deleteThread = createAsyncThunk(
  'threads/deleteThread',
  async (threadId: string) => {
    await apiClientV2.deleteThread(threadId);
    return threadId;
  }
);

const threadsSlice = createSlice({
  name: 'threads',
  initialState,
  reducers: {
    setCurrentThreadId: (state, action: PayloadAction<string | null>) => {
      state.currentThreadId = action.payload;
    },
    addMessageToCurrentThread: (state, action: PayloadAction<ThreadMessage>) => {
      if (state.currentThread) {
        state.currentThread.messages.push(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetThreads: (state) => {
      state.threads = [];
      state.currentThreadId = null;
      state.currentThread = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch threads
    builder.addCase(fetchThreads.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchThreads.fulfilled, (state, action) => {
      state.isLoading = false;
      state.threads = action.payload;
    });
    builder.addCase(fetchThreads.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch threads';
    });

    // Create thread
    builder.addCase(createThread.pending, (state) => {
      state.isCreatingThread = true;
      state.error = null;
    });
    builder.addCase(createThread.fulfilled, (state, action) => {
      state.isCreatingThread = false;
      state.threads.unshift(action.payload);
      state.currentThreadId = action.payload.threadId;
      state.lastCreatedThreadId = action.payload.threadId;
      state.currentThread = {
        ...action.payload,
        messages: [],
      };
    });
    builder.addCase(createThread.rejected, (state, action) => {
      state.isCreatingThread = false;
      state.error = action.error.message || 'Failed to create thread';
    });

    // Fetch thread
    builder.addCase(fetchThread.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchThread.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentThread = action.payload;
      state.currentThreadId = action.payload.threadId;
    });
    builder.addCase(fetchThread.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch thread';
    });

    // Update thread
    builder.addCase(updateThread.fulfilled, (state, action) => {
      const index = state.threads.findIndex(t => t.threadId === action.payload.threadId);
      if (index !== -1) {
        state.threads[index] = action.payload;
      }
      if (state.currentThread && state.currentThread.threadId === action.payload.threadId) {
        state.currentThread = {
          ...state.currentThread,
          ...action.payload,
        };
      }
    });
    builder.addCase(updateThread.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to update thread';
    });

    // Delete thread
    builder.addCase(deleteThread.fulfilled, (state, action) => {
      state.threads = state.threads.filter(t => t.threadId !== action.payload);
      if (state.currentThreadId === action.payload) {
        state.currentThreadId = null;
        state.currentThread = null;
      }
    });
    builder.addCase(deleteThread.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to delete thread';
    });
  },
});

export const {
  setCurrentThreadId,
  addMessageToCurrentThread,
  clearError,
  resetThreads,
} = threadsSlice.actions;

export default threadsSlice.reducer;
