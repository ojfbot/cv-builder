import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeSnippet, Tag } from '@carbon/react'
import './MarkdownMessage.css'

interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

interface MarkdownMessageProps {
  content: string
  suggestions?: QuickAction[]
  onActionClick?: (action: QuickAction) => void
  onActionExecute?: (actions: any[], badgeAction: any) => void
}

function MarkdownMessage({ content, suggestions, onActionClick, onActionExecute }: MarkdownMessageProps) {
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
  const findAction = (label: string): QuickAction | null => {
    console.log('[MarkdownMessage] findAction called with label:', label)
    console.log('[MarkdownMessage] suggestions:', suggestions)

    if (suggestions) {
      // First try exact match
      const exactMatch = suggestions.find(s => s.label === label)
      if (exactMatch) {
        console.log('[MarkdownMessage] Found exact match:', exactMatch)
        return exactMatch
      }

      // Then try case-insensitive partial match
      const lowerLabel = label.toLowerCase()
      const partialMatch = suggestions.find(s =>
        s.label.toLowerCase().includes(lowerLabel) ||
        lowerLabel.includes(s.label.toLowerCase())
      )
      if (partialMatch) {
        console.log('[MarkdownMessage] Found partial match:', partialMatch)
        return partialMatch
      }
    }

    // Fallback: Infer navigation from common label patterns
    const lowerLabel = label.toLowerCase()
    console.log('[MarkdownMessage] No match in suggestions, trying pattern matching for:', lowerLabel)

    // Upload Resume - special file upload action
    if (lowerLabel.match(/\b(upload.*resume|resume.*upload)\b/)) {
      return { label, query: '__FILE_UPLOAD__', icon: '📤' }
    }

    // Bio/Profile tab (tab 1)
    if (lowerLabel.match(/\b(bio|profile|add.*(bio|profile)|create.*(bio|profile)|your.*(bio|profile))\b/)) {
      return { label, query: label, icon: '👤', navigateTo: 1 }
    }

    // Jobs tab (tab 2)
    if (lowerLabel.match(/\b(job(?!.*generat)|listing|add.*job|import.*job|target)\b/)) {
      return { label, query: label, icon: '💼', navigateTo: 2 }
    }

    // Outputs tab (tab 3)
    if (lowerLabel.match(/\b(output|view.*resume|check.*resume|see.*resume)\b/)) {
      return { label, query: label, icon: '📄', navigateTo: 3 }
    }

    // Research tab (tab 4)
    if (lowerLabel.match(/\b(research|view.*research|check.*research|see.*research|intelligence|analysis)\b/)) {
      return { label, query: label, icon: '🔬', navigateTo: 4 }
    }

    return null
  }
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          // Allow custom protocols like upload: and action:
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
              const accept = href.replace('upload:', '') || '.pdf,.docx,.txt,.md'
              const label = typeof children === 'string' ? children : children?.join?.('') || 'Upload'

              if (onActionExecute) {
                console.log('[MarkdownMessage] Rendering upload Tag button')
                return (
                  <Tag
                    type="blue"
                    className="action-badge inline-action"
                    onClick={(e: any) => {
                      e.preventDefault()
                      console.log('[MarkdownMessage] Upload button clicked')
                      const actions = [{ type: 'file_upload', accept, multiple: false }]
                      const badgeAction = { label, actions, icon: '📎' }
                      onActionExecute(actions, badgeAction)
                    }}
                    title={`Upload file (${accept})`}
                  >
                    <span className="action-icon">📎</span>
                    {label}
                  </Tag>
                )
              } else {
                console.warn('[MarkdownMessage] Upload link detected but no onActionExecute handler!')
                // Return a disabled badge to show it's not functional
                return (
                  <Tag type="gray" className="action-badge inline-action" title="Upload handler not available">
                    <span className="action-icon">📎</span>
                    {label}
                  </Tag>
                )
              }
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
              const matchingAction = findAction(cleanLabel)
              console.log('[MarkdownMessage] matchingAction result:', matchingAction)

              const action: QuickAction = matchingAction || {
                label: cleanLabel,
                query: query,
                icon: icon
              }

              console.log('[MarkdownMessage] Final action for badge:', action)

              if (onActionClick) {
                console.log('[MarkdownMessage] Rendering Tag button with action:', action)
                return (
                  <Tag
                    type="purple"
                    className="action-badge inline-action"
                    onClick={(e: any) => {
                      e.preventDefault()
                      console.log('[MarkdownMessage] Action button clicked:', action)
                      onActionClick(action)
                    }}
                    title={`Ask: ${query}`}
                  >
                    <span className="action-icon">{icon}</span>
                    {cleanLabel}
                  </Tag>
                )
              } else {
                console.log('[MarkdownMessage] No onActionClick handler!')
              }
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

            if (parsed && onActionClick) {
              // Find matching action or create a default chat action
              const action = findAction(parsed.label) || {
                label: parsed.label,
                query: parsed.description,
                icon: '💡'
              }

              // Render as clickable badge + description
              return (
                <li className="markdown-action-item" {...props}>
                  <Tag
                    type="purple"
                    className="action-badge"
                    onClick={() => onActionClick(action)}
                    title={action.navigateTo !== undefined
                      ? `Navigate to tab ${action.navigateTo}`
                      : `Ask: ${action.query}`}
                  >
                    {action.icon && <span className="action-icon">{action.icon}</span>}
                    {parsed.label}
                  </Tag>
                  <span className="action-description">{parsed.description}</span>
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
    </div>
  )
}

export default MarkdownMessage
