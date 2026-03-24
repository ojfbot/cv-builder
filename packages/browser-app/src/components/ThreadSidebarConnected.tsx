import { useEffect } from 'react'
import { ThreadSidebar } from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/thread-sidebar'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchThreads,
  createThread,
  setCurrentThreadId,
  deleteThread,
} from '../store/slices/threadsSlice'

interface ThreadSidebarConnectedProps {
  isExpanded: boolean
  onToggle: () => void
}

/**
 * Thin Redux wrapper around the shared ThreadSidebar component.
 * Maps cv-builder's threadsSlice state to the pure component's props.
 */
export default function ThreadSidebarConnected({ isExpanded, onToggle }: ThreadSidebarConnectedProps) {
  const dispatch = useAppDispatch()
  const { threads, currentThreadId, isLoading, isCreatingThread } = useAppSelector(
    state => state.threads
  )

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'browser-user'
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId)
    }
    dispatch(fetchThreads({ userId }))
  }, [dispatch])

  // Map cv-builder Thread shape to ThreadItem shape
  const threadItems = (Array.isArray(threads) ? threads : []).map(t => ({
    threadId: t.threadId,
    title: t.title || 'Untitled conversation',
    updatedAt: t.updatedAt,
  }))

  return (
    <ThreadSidebar
      isExpanded={isExpanded}
      onToggle={onToggle}
      threads={threadItems}
      currentThreadId={currentThreadId}
      isLoading={isLoading}
      isCreatingThread={isCreatingThread}
      onCreateThread={() => {
        const userId = localStorage.getItem('userId') || 'browser-user'
        dispatch(createThread({ userId, title: 'New conversation' }))
      }}
      onSelectThread={(threadId) => {
        if (currentThreadId !== threadId) {
          dispatch(setCurrentThreadId(threadId))
        }
      }}
      onDeleteThread={(threadId) => {
        dispatch(deleteThread(threadId))
      }}
      onRefresh={() => {
        const userId = localStorage.getItem('userId') || 'browser-user'
        dispatch(fetchThreads({ userId }))
      }}
    />
  )
}
