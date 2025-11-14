import { Modal, InlineNotification } from '@carbon/react';
import { useAgent } from '../contexts/AgentContext';

interface ApiKeySettingsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * API Connection Status Modal
 *
 * This component displays the connection status to the backend API.
 * API keys are now managed securely on the server via env.json.
 */
function ApiKeySettings({ open, onClose }: ApiKeySettingsProps) {
  const { isInitialized, error } = useAgent();

  return (
    <Modal
      open={open}
      modalHeading="API Connection Status"
      modalLabel="Settings"
      primaryButtonText="Close"
      onRequestClose={onClose}
      onRequestSubmit={onClose}
      secondaryButtonText={undefined}
    >
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          CV Builder now uses a secure backend API for all agent operations.
        </p>
        <p
          style={{
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)',
          }}
        >
          API keys are stored securely on the server in <code>env.json</code> and are
          never exposed to the browser.
        </p>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Connection Error"
          subtitle={error}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isInitialized && !error && (
        <InlineNotification
          kind="success"
          title="Connected"
          subtitle="API server is reachable and agent service is ready."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {!isInitialized && !error && (
        <InlineNotification
          kind="info"
          title="Initializing"
          subtitle="Connecting to API server..."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: 'var(--cds-text-secondary)',
        }}
      >
        <strong>Configuration:</strong> API keys are configured in{' '}
        <code>packages/agent-core/env.json</code> on the server.
      </div>
    </Modal>
  );
}

export default ApiKeySettings;
