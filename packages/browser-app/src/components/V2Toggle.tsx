import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Toggle, InlineNotification } from '@carbon/react';
import { Rocket } from '@carbon/icons-react';
import { RootState, AppDispatch } from '../store';
import {
  setV2Enabled,
  setApiAvailable,
  loadV2Settings,
  setShowThreadSidebar,
} from '../store/slices/v2Slice';
import { apiClientV2 } from '../api/client-v2';

export function V2Toggle() {
  const dispatch = useDispatch<AppDispatch>();
  const { enabled, apiAvailable } = useSelector((state: RootState) => state.v2);

  useEffect(() => {
    // Load saved settings
    dispatch(loadV2Settings());

    // Check if V2 API is available
    checkV2ApiAvailability();
  }, [dispatch]);

  const checkV2ApiAvailability = async () => {
    try {
      // Try to list threads (lightweight API call)
      await apiClientV2.listThreads({ limit: 1 });
      dispatch(setApiAvailable(true));
    } catch (error) {
      dispatch(setApiAvailable(false));
      console.warn('V2 API not available:', error);
    }
  };

  const handleToggle = (checked: boolean) => {
    dispatch(setV2Enabled(checked));

    // Auto-show thread sidebar when enabling V2
    if (checked) {
      dispatch(setShowThreadSidebar(true));
    }
  };

  return (
    <div className="v2-toggle-container">
      <div className="v2-toggle-header">
        <div className="v2-toggle-icon">
          <Rocket size={24} />
        </div>
        <div className="v2-toggle-content">
          <h4>V2 (LangGraph) Mode</h4>
          <p>Advanced multi-agent orchestration with thread persistence</p>
        </div>
        <Toggle
          id="v2-toggle"
          labelA="V1"
          labelB="V2"
          toggled={enabled}
          onToggle={handleToggle}
          disabled={!apiAvailable}
          size="sm"
        />
      </div>

      {!apiAvailable && (
        <InlineNotification
          kind="warning"
          subtitle="V2 API is not available. Set ENABLE_V2_API=true on the server."
          lowContrast
          hideCloseButton
        />
      )}

      {enabled && apiAvailable && (
        <div className="v2-toggle-features">
          <h5>Active Features:</h5>
          <ul>
            <li>✅ Thread-based conversations</li>
            <li>✅ State persistence & recovery</li>
            <li>✅ Parallel expert execution</li>
            <li>✅ RAG-enhanced responses</li>
            <li>✅ Advanced streaming</li>
          </ul>
        </div>
      )}

      <style>{`
        .v2-toggle-container {
          background: var(--cds-layer);
          border: 1px solid var(--cds-border-subtle);
          border-radius: 4px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .v2-toggle-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .v2-toggle-icon {
          color: var(--cds-icon-primary);
        }

        .v2-toggle-content {
          flex: 1;
        }

        .v2-toggle-content h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .v2-toggle-content p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--cds-text-secondary);
        }

        .v2-toggle-features {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--cds-border-subtle);
        }

        .v2-toggle-features h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--cds-text-secondary);
        }

        .v2-toggle-features ul {
          margin: 0;
          padding-left: 1.5rem;
          list-style: none;
        }

        .v2-toggle-features li {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          color: var(--cds-text-primary);
        }
      `}</style>
    </div>
  );
}
