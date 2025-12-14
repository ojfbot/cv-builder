import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Rocket } from '@carbon/icons-react';
import { RootState, AppDispatch } from '../store';
import {
  setV2Enabled,
  setApiAvailable,
  loadV2Settings,
  setShowThreadSidebar,
} from '../store/slices/v2Slice';
import { apiClientV2 } from '../api/client-v2';
import './V2Toggle.css';

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
      onFocus={() => setIsPopoverOpen(true)}
      onBlur={(e) => {
        // Only close if focus is leaving the entire component
        if (!toggleRef.current?.contains(e.relatedTarget as Node)) {
          setIsPopoverOpen(false);
        }
      }}
    >
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

          {!enabled && (
            <div className="v2-popover-warning">
              <strong>⚠️ V1 Mode (Deprecated)</strong>
              <p>Limited functionality. V2 recommended for all new workflows.</p>
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
    </div>
  );
}
