import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  SideNav,
  SideNavItems,
  SideNavMenu,
  SideNavMenuItem,
} from '@carbon/react';
import { Add, Chat, TrashCan, Renew } from '@carbon/icons-react';
import { RootState, AppDispatch } from '../store';
import {
  fetchThreads,
  createThread,
  setCurrentThreadId,
  deleteThread,
} from '../store/slices/threadsSlice';

interface ThreadSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function ThreadSidebar({ isExpanded, onToggle }: ThreadSidebarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { threads: threadsRaw, currentThreadId, isLoading, isCreatingThread } = useSelector(
    (state: RootState) => state.threads
  );

  // Defensive: Ensure threads is always an array
  const threads = Array.isArray(threadsRaw) ? threadsRaw : [];

  useEffect(() => {
    // Load threads on mount
    // For now, use a default userId. In production, this should come from authentication
    const userId = localStorage.getItem('userId') || 'browser-user';
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
    dispatch(fetchThreads({ userId }));
  }, [dispatch]);

  const handleCreateThread = async () => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    const result = await dispatch(createThread({ userId, title: 'New conversation' }));
    if (createThread.fulfilled.match(result)) {
      // Thread created and auto-selected via reducer
    }
  };

  const handleSelectThread = (threadId: string) => {
    dispatch(setCurrentThreadId(threadId));
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await dispatch(deleteThread(threadId));
    }
  };

  const handleRefresh = () => {
    const userId = localStorage.getItem('userId') || 'browser-user';
    dispatch(fetchThreads({ userId }));
  };

  return (
    <SideNav
      aria-label="Thread navigation"
      expanded={isExpanded}
      onOverlayClick={onToggle}
      className="thread-sidebar"
    >
      <SideNavItems>
        {/* Header */}
        <div className="thread-sidebar-header">
          <h4>Conversations</h4>
          <div className="thread-sidebar-actions">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh threads"
              className="thread-action-btn"
            >
              <Renew />
            </button>
            <button
              onClick={handleCreateThread}
              disabled={isCreatingThread}
              title="New conversation"
              className="thread-action-btn thread-action-primary"
            >
              <Add />
            </button>
          </div>
        </div>

        {/* Thread list */}
        {isLoading && threads.length === 0 ? (
          <div className="thread-sidebar-loading">Loading threads...</div>
        ) : threads.length === 0 ? (
          <div className="thread-sidebar-empty">
            <Chat size={32} />
            <p>No conversations yet</p>
            <button onClick={handleCreateThread} disabled={isCreatingThread}>
              Start a conversation
            </button>
          </div>
        ) : (
          <SideNavMenu title="Recent" defaultExpanded>
            {threads.map((thread) => (
              <SideNavMenuItem
                key={thread.threadId}
                isActive={thread.threadId === currentThreadId}
                onClick={() => handleSelectThread(thread.threadId)}
              >
                <div className="thread-item">
                  <div className="thread-item-content">
                    <span className="thread-item-title">
                      {thread.title || 'Untitled conversation'}
                    </span>
                    <span className="thread-item-date">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="thread-item-delete"
                    onClick={(e) => handleDeleteThread(thread.threadId, e)}
                    title="Delete thread"
                  >
                    <TrashCan size={16} />
                  </button>
                </div>
              </SideNavMenuItem>
            ))}
          </SideNavMenu>
        )}
      </SideNavItems>

      <style>{`
        .thread-sidebar {
          position: fixed !important;
          right: 0 !important;
          left: auto !important;
          top: 48px !important;
          height: calc(100vh - 48px) !important;
          width: 320px !important;
          max-width: 320px !important;
          transform: translateX(${isExpanded ? '0' : '100%'}) !important;
          transition: transform 0.3s ease !important;
          background: var(--cds-layer-01) !important;
          border-left: 1px solid var(--cds-border-subtle) !important;
          border-right: none !important;
          z-index: 999 !important;
          box-shadow: ${isExpanded ? '-4px 0 12px rgba(0, 0, 0, 0.1)' : 'none'} !important;
        }

        .thread-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--cds-border-subtle);
        }

        .thread-sidebar-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .thread-sidebar-actions {
          display: flex;
          gap: 0.5rem;
        }

        .thread-action-btn {
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--cds-border-subtle);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .thread-action-btn:hover {
          background: var(--cds-layer-hover);
        }

        .thread-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .thread-action-primary {
          background: var(--cds-button-primary);
          color: var(--cds-text-on-color);
          border-color: var(--cds-button-primary);
        }

        .thread-action-primary:hover:not(:disabled) {
          background: var(--cds-button-primary-hover);
        }

        .thread-sidebar-loading,
        .thread-sidebar-empty {
          padding: 2rem 1rem;
          text-align: center;
          color: var(--cds-text-secondary);
        }

        .thread-sidebar-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .thread-sidebar-empty button {
          padding: 0.5rem 1rem;
          background: var(--cds-button-primary);
          color: var(--cds-text-on-color);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .thread-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.5rem 0;
        }

        .thread-item-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
          min-width: 0;
        }

        .thread-item-title {
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thread-item-date {
          font-size: 0.75rem;
          color: var(--cds-text-secondary);
        }

        .thread-item-delete {
          padding: 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          color: var(--cds-text-secondary);
        }

        .thread-item:hover .thread-item-delete {
          opacity: 1;
        }

        .thread-item-delete:hover {
          color: var(--cds-support-error);
        }

        /* Override Carbon's SideNav overlay positioning */
        .cds--side-nav__overlay {
          right: 0 !important;
          left: auto !important;
        }

        /* Ensure all SideNav internal elements align properly */
        .thread-sidebar .cds--side-nav__navigation {
          width: 100% !important;
        }
      `}</style>
    </SideNav>
  );
}
