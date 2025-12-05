import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Rocket, Information } from '@carbon/icons-react';
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved settings
    dispatch(loadV2Settings());

    // Check if V2 API is available
    checkV2ApiAvailability();
  }, [dispatch]);

  // Auto-show thread sidebar when V2 is enabled (on load or toggle)
  useEffect(() => {
    if (enabled) {
      dispatch(setShowThreadSidebar(true));
    }
  }, [enabled, dispatch]);

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

    // Auto-show thread sidebar when enabling V2, hide when disabling
    if (checked) {
      dispatch(setShowThreadSidebar(true));
    } else {
      dispatch(setShowThreadSidebar(false));
    }
  };

  return (
    <div
      className="v2-toggle-compact"
      ref={toggleRef}
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <button
        className="v2-info-button"
        aria-label="V2 mode information"
        tabIndex={0}
      >
        <Information size={16} />
      </button>
      <button
        className="v2-toggle-button"
        onClick={() => !apiAvailable ? null : handleToggle(!enabled)}
        disabled={!apiAvailable}
        aria-label={`Switch to ${enabled ? 'V1' : 'V2'} mode`}
      >
        <span className="v2-toggle-label">{enabled ? 'V2' : 'V1'}</span>
        <div className={`v2-toggle-switch ${enabled ? 'active' : ''}`}>
          <div className="v2-toggle-knob" />
        </div>
      </button>

      {isPopoverOpen && (
        <div className="v2-popover">
          <div className="v2-popover-header">
            <Rocket size={20} />
            <h4>V2 (LangGraph) Mode</h4>
          </div>
          <p className="v2-popover-description">
            Advanced multi-agent orchestration with thread persistence
          </p>

          {!apiAvailable && (
            <div className="v2-popover-warning">
              <strong>⚠️ V2 API Not Available</strong>
              <p>Set ENABLE_V2_API=true on the server</p>
            </div>
          )}

          {enabled && apiAvailable && (
            <div className="v2-popover-features">
              <strong>Active Features:</strong>
              <ul>
                <li>✅ Thread-based conversations</li>
                <li>✅ State persistence & recovery</li>
                <li>✅ Parallel expert execution</li>
                <li>✅ RAG-enhanced responses</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .v2-toggle-compact {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .v2-info-button {
          padding: 0;
          margin: 0;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: var(--cds-icon-secondary);
          transition: color 0.2s;
        }

        .v2-info-button:hover,
        .v2-info-button:focus {
          color: var(--cds-icon-primary);
          outline: none;
        }

        .v2-toggle-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--cds-layer);
          border: 1px solid var(--cds-border-subtle);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .v2-toggle-button:hover:not(:disabled) {
          background: var(--cds-layer-hover);
          border-color: var(--cds-border-strong);
        }

        .v2-toggle-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .v2-toggle-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--cds-text-primary);
          min-width: 1.5rem;
          text-align: center;
        }

        .v2-toggle-switch {
          position: relative;
          width: 32px;
          height: 16px;
          background: var(--cds-toggle-off);
          border-radius: 8px;
          transition: background 0.2s;
        }

        .v2-toggle-switch.active {
          background: var(--cds-button-primary);
        }

        .v2-toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .v2-toggle-switch.active .v2-toggle-knob {
          transform: translateX(16px);
        }

        .v2-popover {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          width: 280px;
          background: var(--cds-layer-01);
          border: 1px solid var(--cds-border-subtle);
          border-radius: 4px;
          padding: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .v2-popover-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .v2-popover-header h4 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--cds-text-primary);
        }

        .v2-popover-description {
          margin: 0 0 1rem 0;
          font-size: 0.75rem;
          color: var(--cds-text-secondary);
          line-height: 1.4;
        }

        .v2-popover-warning {
          padding: 0.75rem;
          background: var(--cds-support-warning);
          color: var(--cds-text-on-color);
          border-radius: 4px;
          margin-bottom: 0.75rem;
        }

        .v2-popover-warning strong {
          display: block;
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .v2-popover-warning p {
          margin: 0;
          font-size: 0.75rem;
        }

        .v2-popover-features {
          padding-top: 0.75rem;
          border-top: 1px solid var(--cds-border-subtle);
        }

        .v2-popover-features strong {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--cds-text-secondary);
          margin-bottom: 0.5rem;
        }

        .v2-popover-features ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .v2-popover-features li {
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
          color: var(--cds-text-primary);
        }
      `}</style>
    </div>
  );
}
