/**
 * Unified Chat Service supporting V1 and V2 APIs
 *
 * This service provides a single interface for chat operations,
 * automatically routing to V1 or V2 based on user settings.
 */

import { apiClient } from '../api/client';
import { apiClientV2, StreamEvent } from '../api/client-v2';
import { store } from '../store';
import { addMessage, setIsLoading, appendStreamingContent, setStreamingContent } from '../store/slices/chatSlice';
import { createThread, addMessageToCurrentThread } from '../store/slices/threadsSlice';
import { Message } from '../store/slices/chatSlice';

export interface ChatOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Send a chat message using the appropriate API version
 */
export async function sendChatMessage(
  message: string,
  options?: ChatOptions
): Promise<void> {
  const state = store.getState();
  const { enabled: v2Enabled } = state.v2;
  const { messages } = state.chat;

  // Determine which API to use
  const useV2 = v2Enabled;

  try {
    store.dispatch(setIsLoading(true));
    store.dispatch(setStreamingContent(''));

    // Add user message to UI
    store.dispatch(addMessage({
      role: 'user',
      content: message,
    }));

    if (useV2) {
      await sendV2Message(message, options);
    } else {
      await sendV1Message(message, messages, options);
    }

    options?.onComplete?.();
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    store.dispatch(addMessage({
      role: 'assistant',
      content: `❌ **Error**: ${errorMessage}\n\nPlease try again or contact support.`,
    }));

    options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
  } finally {
    store.dispatch(setIsLoading(false));
  }
}

/**
 * Send message using V1 API
 */
async function sendV1Message(
  message: string,
  conversationHistory: Message[],
  options?: ChatOptions
): Promise<void> {
  const { streamingEnabled } = store.getState().v2;

  if (streamingEnabled) {
    // Use streaming
    await apiClient.chatStream(
      message,
      (chunk) => {
        store.dispatch(appendStreamingContent(chunk));
        options?.onChunk?.(chunk);
      },
      conversationHistory.map(m => ({ role: m.role, content: m.content }))
    );

    // Finalize streaming content
    const finalContent = store.getState().chat.streamingContent;
    store.dispatch(addMessage({
      role: 'assistant',
      content: finalContent,
    }));
    store.dispatch(setStreamingContent(''));
  } else {
    // Non-streaming
    const response = await apiClient.chat(
      message,
      conversationHistory.map(m => ({ role: m.role, content: m.content }))
    );

    store.dispatch(addMessage({
      role: 'assistant',
      content: response.response,
    }));
  }
}

/**
 * Send message using V2 API with thread support
 */
async function sendV2Message(
  message: string,
  options?: ChatOptions
): Promise<void> {
  const state = store.getState();
  const { currentThreadId } = state.threads;
  const { preferences, streamingEnabled } = state.v2;

  // Ensure we have a thread
  let threadId = currentThreadId;
  if (!threadId && preferences.autoCreateThread) {
    const result = await store.dispatch(createThread({ title: 'New conversation' }));
    if (createThread.fulfilled.match(result)) {
      threadId = result.payload.threadId;
    }
  }

  if (!threadId) {
    throw new Error('No thread selected. Please create or select a thread.');
  }

  if (streamingEnabled) {
    // Use streaming
    await apiClientV2.chatStream(
      {
        threadId,
        message,
      },
      (event: StreamEvent) => {
        switch (event.type) {
          case 'chunk':
            if (event.chunk) {
              store.dispatch(appendStreamingContent(event.chunk));
              options?.onChunk?.(event.chunk);
            }
            break;

          case 'node_start':
            // Optionally show which node is executing
            if (preferences.showNodeExecution && event.node) {
              console.log(`🚀 Node starting: ${event.node}`);
            }
            break;

          case 'node_end':
            if (preferences.showNodeExecution && event.node) {
              console.log(`✅ Node completed: ${event.node}`);
            }
            break;

          case 'state_update':
            // Optionally show RAG context
            if (preferences.showRAGContext && event.state) {
              console.log('📚 State updated:', event.state);
            }
            break;

          case 'done':
            // Finalize streaming content
            const finalContent = store.getState().chat.streamingContent;
            store.dispatch(addMessage({
              role: 'assistant',
              content: finalContent || event.message || '',
            }));
            store.dispatch(setStreamingContent(''));

            // Add to thread history
            if (event.threadId) {
              store.dispatch(addMessageToCurrentThread({
                messageId: `msg-${Date.now()}`,
                threadId: event.threadId,
                role: 'assistant',
                content: finalContent || event.message || '',
                createdAt: new Date().toISOString(),
              }));
            }
            break;

          case 'error':
            throw new Error(event.error || 'Stream error');
        }
      }
    );
  } else {
    // Non-streaming
    const response = await apiClientV2.chat({
      threadId,
      message,
    });

    store.dispatch(addMessage({
      role: 'assistant',
      content: response.message,
    }));

    // Add to thread history
    store.dispatch(addMessageToCurrentThread({
      messageId: `msg-${Date.now()}`,
      threadId: response.threadId,
      role: 'assistant',
      content: response.message,
      createdAt: new Date().toISOString(),
    }));
  }
}

/**
 * Check if V2 is currently active
 */
export function isV2Active(): boolean {
  return store.getState().v2.enabled;
}

/**
 * Get current thread ID (V2 only)
 */
export function getCurrentThreadId(): string | null {
  if (!isV2Active()) return null;
  return store.getState().threads.currentThreadId;
}
