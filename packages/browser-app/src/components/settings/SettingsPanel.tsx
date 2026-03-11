/**
 * Resume Builder SettingsPanel — exposed via MF './Settings' to the shell.
 *
 * Shell provides the <Modal> chrome. This component reads from the shell's
 * shared Redux store and dispatches updates via action type string.
 *
 * Connection status: probes the cv-builder API server's /health endpoint
 * directly from the panel — no redirect to the standalone app needed.
 * Health URL is derived from the effective base URL (Redux override or env
 * default) so it reflects whatever URL is currently configured.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  TextInput,
  Select,
  SelectItem,
  InlineLoading,
  Button,
  FormGroup,
  Tag,
} from '@carbon/react'
import { Renew } from '@carbon/icons-react'
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

// ── Connection status hook ────────────────────────────────────────────────────

type ConnStatus = 'idle' | 'checking' | 'connected' | 'unreachable'

function useConnectionStatus(apiBaseUrl: string) {
  const [status, setStatus] = useState<ConnStatus>('idle')

  const check = useCallback(async () => {
    setStatus('checking')
    try {
      // Derive /health from any base URL (strips /api, /api/v2, etc.)
      const healthUrl = new URL('/health', apiBaseUrl || DEFAULT_API_BASE_URL).href
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(healthUrl, { signal: controller.signal })
      clearTimeout(timer)
      setStatus(res.ok ? 'connected' : 'unreachable')
    } catch {
      setStatus('unreachable')
    }
  }, [apiBaseUrl])

  useEffect(() => { check() }, [check])

  return { status, recheck: check }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose: _onClose }: { onClose?: () => void }) {
  const dispatch = useDispatch()
  const stored =
    useSelector((s: any) => s?.settings?.apps?.['cv-builder'] as CvSettings | undefined) ?? DEFAULTS

  const effectiveUrl = stored.apiBaseUrl || DEFAULT_API_BASE_URL
  const { status, recheck } = useConnectionStatus(stored.apiBaseUrl)

  // API URL — save on blur to avoid partial-URL dispatches while typing
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

        <div className="settings-connection-row">
          <ConnectionIndicator status={status} url={effectiveUrl} />
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            iconDescription="Re-check"
            hasIconOnly
            onClick={recheck}
            disabled={status === 'checking'}
            className="settings-recheck-btn"
          />
        </div>

        <p className="settings-info-text">
          API keys are stored securely in <code>packages/agent-core/env.json</code> on the server.
        </p>
      </FormGroup>

      {/* ── Preferences ──────────────────────────────────────────────────── */}
      <FormGroup legendText="Preferences" className="settings-form-group">
        <Select
          id="cv-default-template"
          labelText="Default template"
          value={stored.defaultTemplate}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('defaultTemplate', e.target.value)
          }
        >
          <SelectItem value="modern"  text="Modern" />
          <SelectItem value="classic" text="Classic" />
          <SelectItem value="minimal" text="Minimal" />
        </Select>

        <Select
          id="cv-export-format"
          labelText="Export format"
          value={stored.exportFormat}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('exportFormat', e.target.value)
          }
        >
          <SelectItem value="pdf"  text="PDF" />
          <SelectItem value="docx" text="Word (.docx)" />
        </Select>

        <Select
          id="cv-language"
          labelText="Language"
          value={stored.language}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handlePrefChange('language', e.target.value)
          }
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

// ── Shared status indicator (inline — no cross-app import needed) ─────────────

function ConnectionIndicator({ status, url }: { status: ConnStatus; url: string }) {
  if (status === 'checking') {
    return (
      <InlineLoading
        description="Checking connection…"
        status="active"
        className="settings-conn-loading"
      />
    )
  }
  if (status === 'connected') {
    return (
      <span className="settings-conn-status">
        <Tag type="green" size="sm">Connected</Tag>
        <span className="settings-conn-url">{url}</span>
      </span>
    )
  }
  if (status === 'unreachable') {
    return (
      <span className="settings-conn-status">
        <Tag type="red" size="sm">Unreachable</Tag>
        <span className="settings-conn-url">{url}</span>
      </span>
    )
  }
  return null
}
