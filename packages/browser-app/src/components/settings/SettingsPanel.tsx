/**
 * CV Builder SettingsPanel — bare panel exposed via MF './Settings' to the shell.
 *
 * CV Builder uses a secure server-side API; keys are never stored in the browser.
 * Dynamic connection status requires AgentContext (available in standalone mode only).
 * This panel shows the static configuration info instead.
 *
 * Shell provides the <Modal> chrome; this component is display-only.
 */

import { InlineNotification } from '@carbon/react'

interface SettingsPanelProps {
  onClose?: () => void
}

export default function SettingsPanel(_props: SettingsPanelProps) {
  return (
    <div>
      <p style={{ marginBottom: '1rem' }}>
        CV Builder uses a secure backend API for all agent operations.
      </p>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
        API keys are stored securely on the server in{' '}
        <code>packages/agent-core/env.json</code> and are never exposed to the browser.
      </p>
      <InlineNotification
        kind="info"
        title="Connection status"
        subtitle="Open CV Builder directly to view live connection status."
        lowContrast
        hideCloseButton
        style={{ marginBottom: '1rem' }}
      />
      <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
        <strong>Configuration:</strong> Edit{' '}
        <code>packages/agent-core/env.json</code> on the server to update API keys.
      </div>
    </div>
  )
}
