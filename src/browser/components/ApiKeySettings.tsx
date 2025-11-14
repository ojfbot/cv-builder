import { useState } from 'react'
import {
  Modal,
  TextInput,
  InlineNotification,
} from '@carbon/react'
import { useAgent } from '../contexts/AgentContext'

interface ApiKeySettingsProps {
  open: boolean
  onClose: () => void
}

function ApiKeySettings({ open, onClose }: ApiKeySettingsProps) {
  const { apiKey, setApiKey, isInitialized, error } = useAgent()
  const [inputValue, setInputValue] = useState(apiKey || '')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSave = () => {
    if (inputValue.trim()) {
      setApiKey(inputValue.trim())
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
      }, 1500)
    }
  }

  return (
    <Modal
      open={open}
      modalHeading="API Key Configuration"
      modalLabel="Settings"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={handleSave}
      preventCloseOnClickOutside
    >
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          Enter your Anthropic API key to enable the CV Builder agents.
        </p>
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
          Get your API key from{' '}
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            console.anthropic.com
          </a>
        </p>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {showSuccess && (
        <InlineNotification
          kind="success"
          title="Success"
          subtitle="API key saved successfully!"
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isInitialized && !showSuccess && (
        <InlineNotification
          kind="success"
          title="Connected"
          subtitle="Agent service is active and ready to use."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      <TextInput
        id="api-key-input"
        labelText="Anthropic API Key"
        placeholder="sk-ant-api03-..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        type="password"
        autoComplete="off"
      />

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
        <strong>Note:</strong> Your API key is stored locally in your browser.
        In a production environment, you should use a backend server to protect your API key.
      </div>
    </Modal>
  )
}

export default ApiKeySettings
