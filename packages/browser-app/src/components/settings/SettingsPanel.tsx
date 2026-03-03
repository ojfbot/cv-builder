/**
 * CV Builder SettingsPanel — exposed via MF './Settings' to the shell.
 *
 * Shell provides the <Modal> chrome (ComposedModal + tab bar + search).
 * This component owns the form fields, reads settings from the shell's
 * shared Redux store, and dispatches updates back.
 *
 * ── Redux dispatch pattern ───────────────────────────────────────────────────
 *
 * Sub-apps cannot import from the shell (that would create a circular MF
 * dependency). Instead, dispatch uses the Redux action type string directly:
 *
 *   dispatch({ type: 'settings/updateCvBuilderSettings', payload: partial })
 *
 * This is valid Redux — the shell's settingsSlice reducer handles it.
 * The store is shared via Module Federation's 'react-redux' singleton.
 *
 * ── Sensitive data ───────────────────────────────────────────────────────────
 *
 * API keys (ANTHROPIC_API_KEY) live in server-side env.json — never in
 * the browser or Redux. This panel only configures non-sensitive settings.
 */

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
  FormGroup,
} from '@carbon/react'
import { DEFAULT_API_BASE_URL } from '../../config/api.js'

const ACTION_TYPE = 'settings/updateCvBuilderSettings'

interface CvSettings {
  apiBaseUrl: string
  defaultTemplate: string
  exportFormat: string
  language: string
}

const DEFAULTS: CvSettings = {
  apiBaseUrl: '',
  defaultTemplate: 'modern',
  exportFormat: 'pdf',
  language: 'en',
}

export default function SettingsPanel({ onClose: _onClose }: { onClose?: () => void }) {
  const dispatch = useDispatch()
  // Reads from the shell's Redux singleton (shared via MF)
  const stored = useSelector((s: any) => s?.settings?.apps?.['cv-builder'] as CvSettings | undefined) ?? DEFAULTS

  // API URL — save on blur (avoid partial-URL dispatches while typing)
  const [apiBaseUrl, setApiBaseUrl] = useState(stored.apiBaseUrl)

  function handleApiUrlBlur() {
    const trimmed = apiBaseUrl.trim()
    if (trimmed !== stored.apiBaseUrl) {
      dispatch({ type: ACTION_TYPE, payload: { apiBaseUrl: trimmed } })
    }
  }

  function handlePrefChange(field: keyof CvSettings, value: string) {
    dispatch({ type: ACTION_TYPE, payload: { [field]: value } })
  }

  return (
    <div className="cv-settings-panel">
      {/* ── Connection ─────────────────────────────────────────────────────── */}
      <FormGroup legendText="Connection" className="settings-form-group">
        <TextInput
          id="cv-api-base-url"
          labelText="API base URL"
          helperText={`Default: ${DEFAULT_API_BASE_URL}`}
          placeholder={DEFAULT_API_BASE_URL}
          value={apiBaseUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiBaseUrl(e.target.value)}
          onBlur={handleApiUrlBlur}
        />
        <InlineNotification
          kind="info"
          title="API keys"
          subtitle="Keys are stored securely in packages/agent-core/env.json on the server — never in the browser."
          lowContrast
          hideCloseButton
          className="settings-info-banner"
        />
      </FormGroup>

      {/* ── Preferences ──────────────────────────────────────────────────── */}
      <FormGroup legendText="Preferences" className="settings-form-group">
        <Select
          id="cv-default-template"
          labelText="Default template"
          value={stored.defaultTemplate}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrefChange('defaultTemplate', e.target.value)}
        >
          <SelectItem value="modern"  text="Modern" />
          <SelectItem value="classic" text="Classic" />
          <SelectItem value="minimal" text="Minimal" />
        </Select>

        <Select
          id="cv-export-format"
          labelText="Export format"
          value={stored.exportFormat}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrefChange('exportFormat', e.target.value)}
        >
          <SelectItem value="pdf"  text="PDF" />
          <SelectItem value="docx" text="Word (.docx)" />
        </Select>

        <Select
          id="cv-language"
          labelText="Language"
          value={stored.language}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePrefChange('language', e.target.value)}
        >
          <SelectItem value="en" text="English" />
          <SelectItem value="fr" text="French" />
          <SelectItem value="de" text="German" />
          <SelectItem value="es" text="Spanish" />
        </Select>
      </FormGroup>
    </div>
  )
}
