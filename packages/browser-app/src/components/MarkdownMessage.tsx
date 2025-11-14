import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeSnippet } from '@carbon/react'
import BadgeButton from './BadgeButton'
import {
  BadgeAction,
  Action,
  LegacyQuickAction,
  convertLegacyAction,
  createBadgeAction,
  createChatAction,
  createNavigateAction,
} from '../models/badge-action'
import { TabKey } from '../models/navigation'
import './MarkdownMessage.css'

// Legacy support
interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

interface MarkdownMessageProps {
  content: string
  suggestions?: QuickAction[] | BadgeAction[]
  onActionClick?: (action: QuickAction) => void
  onActionExecute?: (actions: Action[], badgeAction: BadgeAction) => void
  compact?: boolean
}

function MarkdownMessage({ content, suggestions, onActionClick, onActionExecute, compact = false }: MarkdownMessageProps) {
  // Normalize suggestions to BadgeAction format
  const normalizedSuggestions: BadgeAction[] = suggestions
    ? suggestions.map((s) => {
        // Check if already a BadgeAction
        if ('actions' in s) {
          return s as BadgeAction
        }
        // Convert legacy QuickAction
        return convertLegacyAction(s as LegacyQuickAction)
      })
    : []

  // Parse list items in "Next Steps" section to extract action labels
  const parseListItem = (text: string) => {
    // Match pattern: "Label: Description" or "**Label**: Description"
    const match = text.match(/^\*\*(.+?)\*\*:\s*(.+)$/) || text.match(/^(.+?):\s*(.+)$/)
    if (match) {
      return {
        label: match[1].trim(),
        description: match[2].trim()
      }
    }
    return null
  }

  // Find matching action from suggestions
  const findBadgeAction = (label: string): BadgeAction | null => {
    console.log('[MarkdownMessage] findBadgeAction called with label:', label)
    console.log('[MarkdownMessage] normalizedSuggestions:', normalizedSuggestions)

    if (normalizedSuggestions.length > 0) {
      // First try exact match
      const exactMatch = normalizedSuggestions.find(s => s.label === label)
      if (exactMatch) {
        console.log('[MarkdownMessage] Found exact match:', exactMatch)
        return exactMatch
      }

      // Then try case-insensitive partial match
      const lowerLabel = label.toLowerCase()
      const partialMatch = normalizedSuggestions.find(s =>
        s.label.toLowerCase().includes(lowerLabel) ||
        lowerLabel.includes(s.label.toLowerCase())
      )
      if (partialMatch) {
        console.log('[MarkdownMessage] Found partial match:', partialMatch)
        return partialMatch
      }
    }

    // Fallback: Infer navigation from common label patterns and create BadgeAction
    const lowerLabel = label.toLowerCase()
    console.log('[MarkdownMessage] No match in suggestions, trying pattern matching for:', lowerLabel)

    // Bio/Profile tab
    if (lowerLabel.match(/\b(bio|profile|add.*(bio|profile)|create.*(bio|profile)|your.*(bio|profile))\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.BIO)], { icon: '👤' })
    }

    // Jobs tab
    if (lowerLabel.match(/\b(job(?!.*generat)|listing|add.*job|import.*job|target)\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.JOBS)], { icon: '💼' })
    }

    // Outputs tab
    if (lowerLabel.match(/\b(output|view.*resume|check.*resume|see.*resume)\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.OUTPUTS)], { icon: '📄' })
    }

    // Research tab
    if (lowerLabel.match(/\b(research|view.*research|check.*research|see.*research|intelligence|analysis)\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.RESEARCH)], { icon: '🔬' })
    }

    // Pipelines tab
    if (lowerLabel.match(/\b(pipeline|workflow|automation|automate)\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.PIPELINES)], { icon: '🔄' })
    }

    // Toolbox tab
    if (lowerLabel.match(/\b(toolbox|tool|utility|utilities)\b/)) {
      return createBadgeAction(label, [createNavigateAction(TabKey.TOOLBOX)], { icon: '🧰' })
    }

    return null
  }

  // Handle action execution (supports both legacy and new patterns)
  const handleActionExecute = (actions: Action[], badgeAction: BadgeAction) => {
    console.log('[MarkdownMessage] handleActionExecute called')
    console.log('[MarkdownMessage] Actions:', actions)
    console.log('[MarkdownMessage] BadgeAction:', JSON.stringify(badgeAction, null, 2))
    console.log('[MarkdownMessage] BadgeAction.suggestedMessage:', badgeAction.suggestedMessage)

    if (onActionExecute) {
      console.log('[MarkdownMessage] Calling onActionExecute with badgeAction')
      onActionExecute(actions, badgeAction)
    } else if (onActionClick) {
      // Legacy fallback: Convert first action to QuickAction and call legacy handler
      const firstAction = actions[0]
      if (firstAction?.type === 'chat') {
        onActionClick({
          label: firstAction.message,
          query: firstAction.message,
          icon: '💡',
        })
      } else if (firstAction?.type === 'navigate') {
        // Direct mapping to avoid require()
        const tabIndexMap: Record<TabKey, number> = {
          [TabKey.INTERACTIVE]: 0,
          [TabKey.BIO]: 1,
          [TabKey.JOBS]: 2,
          [TabKey.OUTPUTS]: 3,
          [TabKey.RESEARCH]: 4,
          [TabKey.PIPELINES]: 5,
          [TabKey.TOOLBOX]: 6,
        }
        const tabIndex = tabIndexMap[firstAction.tab] ?? 0
        onActionClick({
          label: `Navigate to ${firstAction.tab}`,
          query: '',
          icon: '📍',
          navigateTo: tabIndex,
        })
      }
    }
  }
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          // Preserve custom protocols like upload: and action:
          if (url.startsWith('upload:') || url.startsWith('action:')) {
            return url
          }
          // Default transformation for other URLs
          return url
        }}
        components={{
          // Custom code block renderer with copy functionality
          code({ node, className, children, ...props }: any) {
            const inline = !className
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (!inline && match) {
              // Multi-line code block with language
              return (
                <CodeSnippet
                  type="multi"
                  feedback="Copied!"
                  feedbackTimeout={2000}
                  className="code-block"
                >
                  {codeString}
                </CodeSnippet>
              )
            } else if (!inline) {
              // Multi-line code block without language
              return (
                <CodeSnippet
                  type="multi"
                  feedback="Copied!"
                  feedbackTimeout={2000}
                  className="code-block"
                >
                  {codeString}
                </CodeSnippet>
              )
            } else {
              // Inline code
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          },
          // Style links - convert action: and upload: links to badge buttons
          a({ children, href, ...props }: any) {
            console.log('[MarkdownMessage] Link detected:', { href, children })

            // Check if this is a file upload link
            if (href && href.startsWith('upload:')) {
              console.log('[MarkdownMessage] Upload link detected!')
              const uploadParams = href.replace('upload:', '')
              const label = typeof children === 'string' ? children : children?.join?.('') || 'Upload'

              // Parse upload parameters (e.g., "upload:.pdf,.docx" or just "upload:")
              const accept = uploadParams || '.pdf,.docx,.txt'

              // Create a file upload badge action
              const badgeAction: BadgeAction = createBadgeAction(
                label,
                [{
                  type: 'file_upload',
                  accept,
                  multiple: false,
                }],
                { icon: '📎', variant: 'blue' }
              )

              console.log('[MarkdownMessage] File upload badge action:', badgeAction)

              return (
                <BadgeButton
                  badgeAction={badgeAction}
                  onExecute={handleActionExecute}
                  className="inline-action"
                  size="sm"
                />
              )
            }

            // Check if this is an action link
            if (href && href.startsWith('action:')) {
              console.log('[MarkdownMessage] Action link detected!')
              const query = href.replace('action:', '')
              const label = typeof children === 'string' ? children : children?.join?.('') || 'Action'

              // Extract icon from label if present (e.g., "📄 Generate Resume")
              const iconMatch = label.match(/^([\u{1F300}-\u{1F9FF}])\s*(.+)$/u)
              const icon = iconMatch ? iconMatch[1] : '💡'
              const cleanLabel = iconMatch ? iconMatch[2] : label

              console.log('[MarkdownMessage] Creating action button:', { label, icon, cleanLabel, query })

              // Check if there's a matching navigation action in suggestions
              const matchingBadgeAction = findBadgeAction(cleanLabel)
              console.log('[MarkdownMessage] matchingBadgeAction result:', matchingBadgeAction)

              const badgeAction: BadgeAction = matchingBadgeAction || createBadgeAction(
                cleanLabel,
                [createChatAction(query)],
                { icon }
              )

              console.log('[MarkdownMessage] Final badge action:', badgeAction)

              return (
                <BadgeButton
                  badgeAction={badgeAction}
                  onExecute={handleActionExecute}
                  className="inline-action"
                  size="sm"
                />
              )
            }

            // Regular link
            return (
              <a {...props} href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
          // Style lists
          ul({ children, ...props }: any) {
            return <ul className="markdown-list" {...props}>{children}</ul>
          },
          ol({ children, ...props }: any) {
            return <ol className="markdown-list" {...props}>{children}</ol>
          },
          // Custom list item renderer for Next Steps
          li({ children, ...props }: any) {
            // Recursively extract all text content from React children
            const extractText = (node: any): string => {
              if (typeof node === 'string') return node
              if (typeof node === 'number') return String(node)
              if (!node) return ''

              if (Array.isArray(node)) {
                return node.map(extractText).join('')
              }

              if (node.props?.children) {
                return extractText(node.props.children)
              }

              return ''
            }

            const textContent = extractText(children)
            const parsed = parseListItem(textContent)

            if (parsed && (onActionExecute || onActionClick)) {
              // Find matching action or create a default chat action
              const badgeAction = findBadgeAction(parsed.label) || createBadgeAction(
                parsed.label,
                [createChatAction(parsed.description)],
                { icon: '💡' }
              )

              // Render as clickable badge + description (hide description in compact mode)
              return (
                <li className="markdown-action-item" {...props}>
                  <BadgeButton
                    badgeAction={badgeAction}
                    onExecute={handleActionExecute}
                    size="sm"
                  />
                  {!compact && <span className="action-description">{parsed.description}</span>}
                </li>
              )
            }

            // Regular list item
            return <li {...props}>{children}</li>
          },
          // Style blockquotes
          blockquote({ children, ...props }: any) {
            return <blockquote className="markdown-blockquote" {...props}>{children}</blockquote>
          },
          // Style tables
          table({ children, ...props }: any) {
            return <table className="markdown-table" {...props}>{children}</table>
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Render badge action suggestions if present */}
      {normalizedSuggestions.length > 0 && onActionExecute && (
        <div className="markdown-suggestions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {normalizedSuggestions.map((badgeAction, idx) => (
            <BadgeButton
              key={idx}
              badgeAction={badgeAction}
              onExecute={handleActionExecute}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MarkdownMessage
