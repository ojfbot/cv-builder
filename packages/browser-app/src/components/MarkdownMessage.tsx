import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeSnippet, Tag } from '@carbon/react'
import './MarkdownMessage.css'

interface NavigateAction {
  tab: number
  focus?: string
  context?: string
}

interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number  // DEPRECATED: Use navigate instead
  navigate?: NavigateAction
}

interface MarkdownMessageProps {
  content: string
  suggestions?: QuickAction[]
  onActionClick?: (action: QuickAction) => void
  compact?: boolean  // If true, strip descriptions after badge buttons
  onExpandContent?: () => void  // Callback to navigate to Interactive tab to see full content
}

function MarkdownMessage({ content, suggestions, onActionClick, compact = false, onExpandContent }: MarkdownMessageProps) {
  console.log('[MarkdownMessage] Rendering with content:', content.substring(0, 200))
  console.log('[MarkdownMessage] onActionClick handler present:', !!onActionClick)
  console.log('[MarkdownMessage] Compact mode:', compact)

  // If compact mode, strip descriptions and line breaks between badge buttons
  // Format: [📄 Badge](action:query) - Description text\n\n[Another Badge]...
  // Becomes: [📄 Badge](action:query) [Another Badge]...
  const processedContent = compact
    ? content
        .replace(/(\[([^\]]+)\]\(action:[^)]+\))\s*-\s*[^\n]+/g, '$1')  // Remove descriptions
        .replace(/(\]\(action:[^)]+\))\s*\n+\s*(\[)/g, '$1 $2')  // Remove line breaks between badges
    : content

  // Function to parse and render content with action badges
  const renderContentWithBadges = (text: string) => {
    const parts: any[] = []
    let lastIndex = 0
    // Match [label](action:query) pattern
    const regex = /\[([^\]]+)\]\(action:([^)]+)\)/g
    let match

    while ((match = regex.exec(text)) !== null) {
      console.log('[MarkdownMessage] Found action link:', { label: match[1], query: match[2] })

      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      const label = match[1]
      const query = match[2]

      // Extract icon from label
      const iconMatch = label.match(/^([\u{1F300}-\u{1F9FF}])\s*(.+)$/u)
      const icon = iconMatch ? iconMatch[1] : '💡'
      const cleanLabel = iconMatch ? iconMatch[2] : label

      // Try to infer navigation from the label pattern
      const inferredAction = findAction(cleanLabel)

      const action: QuickAction = {
        label: cleanLabel,
        query: query,
        icon: inferredAction?.icon || icon,
        navigateTo: inferredAction?.navigateTo
      }

      // Add Tag component
      if (onActionClick) {
        parts.push(
          <Tag
            key={`action-${match.index}`}
            type="purple"
            className="action-badge inline-action"
            onClick={(e: any) => {
              e.preventDefault()
              console.log('[MarkdownMessage] Action button clicked:', action)
              onActionClick(action)
            }}
            title={
              action.navigateTo !== undefined
                ? `Navigate to tab ${action.navigateTo}: ${query}`
                : `Ask: ${query}`
            }
          >
            <span className="action-icon">{icon}</span>
            {cleanLabel}
          </Tag>
        )
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

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

    if (suggestions) {
      const match = suggestions.find(s => s.label === label)
      if (match) {
        console.log('[MarkdownMessage] Found exact match in suggestions:', match)
        return match
      }
    }

    // Fallback: Infer navigation from common label patterns
    const lowerLabel = label.toLowerCase()
    console.log('[MarkdownMessage] Checking patterns for:', lowerLabel)

    // Bio/Profile tab (tab 1)
    if (lowerLabel.match(/\b(bio|profile|add.*(bio|profile)|create.*(bio|profile)|your.*(bio|profile))\b/)) {
      console.log('[MarkdownMessage] Matched Bio/Profile pattern -> tab 1')
      return { label, query: label, icon: '👤', navigateTo: 1 }
    }

    // Jobs tab (tab 2)
    if (lowerLabel.match(/\b(job(?!.*generat)|listing|add.*job|import.*job|target)\b/)) {
      console.log('[MarkdownMessage] Matched Jobs pattern -> tab 2')
      return { label, query: label, icon: '💼', navigateTo: 2 }
    }

    // Outputs tab (tab 3)
    if (lowerLabel.match(/\b(output|view.*resume|check.*resume|see.*resume)\b/)) {
      console.log('[MarkdownMessage] Matched Outputs pattern -> tab 3')
      return { label, query: label, icon: '📄', navigateTo: 3 }
    }

    // Research tab (tab 4)
    if (lowerLabel.match(/\b(research|industry.*trend|salary.*data|market.*insight|best.*practice)\b/)) {
      console.log('[MarkdownMessage] Matched Research pattern -> tab 4')
      return { label, query: label, icon: '📊', navigateTo: 4 }
    }

    // Pipelines tab (tab 5)
    if (lowerLabel.match(/\b(pipeline|workflow|automat.*application|batch.*apply)\b/)) {
      console.log('[MarkdownMessage] Matched Pipelines pattern -> tab 5')
      return { label, query: label, icon: '🔄', navigateTo: 5 }
    }

    // Toolbox tab (tab 6)
    if (lowerLabel.match(/\b(toolbox|action|agent|tool|custom.*agent|configure.*agent|automation)\b/)) {
      console.log('[MarkdownMessage] Matched Toolbox pattern -> tab 6')
      return { label, query: label, icon: '🔧', navigateTo: 6 }
    }

    console.log('[MarkdownMessage] No pattern matched, returning null')
    return null
  }
  return (
    <div className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Handle paragraphs to replace action link markdown with badges
          p({ children, ...props }: any) {
            // Convert children to text to check for action links
            let textContent = ''
            if (typeof children === 'string') {
              textContent = children
            } else if (Array.isArray(children)) {
              textContent = children.map(child => {
                if (typeof child === 'string') return child
                return ''
              }).join('')
            }

            // Check if this paragraph contains action links
            if (textContent.includes('](action:')) {
              console.log('[MarkdownMessage] Paragraph with action links:', textContent.substring(0, 100))
              const processedContent = renderContentWithBadges(textContent)
              return <p {...props}>{processedContent}</p>
            }

            // Regular paragraph
            return <p {...props}>{children}</p>
          },
          // Custom code block renderer with copy functionality
          code({ node, className, children, ...props }: any) {
            const inline = !className
            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children).replace(/\n$/, '')

            if (!inline && compact && onExpandContent) {
              // Compact mode: show collapsed code block with click to expand
              const language = match ? match[1] : 'code'
              const lineCount = codeString.split('\n').length
              return (
                <Tag
                  type="cyan"
                  className="compact-content-indicator"
                  onClick={() => onExpandContent()}
                  title="Click to view full code in Interactive tab"
                >
                  <span className="action-icon">💻</span>
                  {language} snippet ({lineCount} lines)
                </Tag>
              )
            } else if (!inline && match) {
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
          // Style links - convert action: links to banner buttons
          a({ children, href, ...props }: any) {
            console.log('[MarkdownMessage] Link detected:', { href, children })

            // Check if this is an action link
            if (href && href.startsWith('action:')) {
              console.log('[MarkdownMessage] Action link detected!')
              const query = href.replace('action:', '')

              // Extract text from children (handle arrays, strings, etc.)
              let label = 'Action'
              if (typeof children === 'string') {
                label = children
              } else if (Array.isArray(children)) {
                label = children.map(child => {
                  if (typeof child === 'string') return child
                  if (child?.props?.children) return String(child.props.children)
                  return ''
                }).join('')
              } else if (children) {
                label = String(children)
              }

              console.log('[MarkdownMessage] Extracted label:', label)

              // Extract icon from label if present (e.g., "📄 Generate Resume")
              const iconMatch = label.match(/^([\u{1F300}-\u{1F9FF}])\s*(.+)$/u)
              const icon = iconMatch ? iconMatch[1] : '💡'
              const cleanLabel = iconMatch ? iconMatch[2] : label

              // Try to infer navigation from the label pattern
              const inferredAction = findAction(cleanLabel)

              console.log('[MarkdownMessage] Creating action button:', { label, icon, cleanLabel, query, inferredAction })

              const action: QuickAction = {
                label: cleanLabel,
                query: query,
                icon: inferredAction?.icon || icon,
                navigateTo: inferredAction?.navigateTo
              }

              if (onActionClick) {
                console.log('[MarkdownMessage] Rendering Tag button')
                return (
                  <Tag
                    type="purple"
                    className="action-badge inline-action"
                    onClick={(e: any) => {
                      e.preventDefault()
                      console.log('[MarkdownMessage] Action button clicked:', action)
                      onActionClick(action)
                    }}
                    title={
                      action.navigateTo !== undefined
                        ? `Navigate to tab ${action.navigateTo}: ${query}`
                        : `Ask: ${query}`
                    }
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
            // Extract text content from React children
            let textContent = ''
            if (Array.isArray(children)) {
              textContent = children.map((child: any) => {
                if (typeof child === 'string') return child
                if (child?.props?.children) {
                  if (typeof child.props.children === 'string') return child.props.children
                  if (Array.isArray(child.props.children)) {
                    return child.props.children.join('')
                  }
                }
                return ''
              }).join('')
            } else if (typeof children === 'string') {
              textContent = children
            }

            const parsed = parseListItem(textContent)

            if (parsed && onActionClick) {
              // Find matching action or create a default chat action
              const action = findAction(parsed.label) || {
                label: parsed.label,
                query: parsed.description,
                icon: '💡'
              }

              // Render as clickable badge + description (hide description in compact mode)
              return (
                <li className="markdown-action-item" {...props}>
                  <Tag
                    type="purple"
                    className="action-badge"
                    onClick={() => onActionClick(action)}
                    title={
                      action.navigate
                        ? `Navigate to tab ${action.navigate.tab}`
                        : action.navigateTo !== undefined
                        ? `Navigate to tab ${action.navigateTo}`
                        : `Ask: ${action.query}`
                    }
                  >
                    {action.icon && <span className="action-icon">{action.icon}</span>}
                    {parsed.label}
                  </Tag>
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
            if (compact && onExpandContent) {
              // Compact mode: show collapsed table indicator with click to expand
              // Count rows by checking children structure
              let rowCount = 0
              if (Array.isArray(children)) {
                children.forEach((child: any) => {
                  if (child?.props?.children && Array.isArray(child.props.children)) {
                    rowCount += child.props.children.filter((c: any) => c?.type === 'tr').length
                  }
                })
              }

              return (
                <Tag
                  type="teal"
                  className="compact-content-indicator"
                  onClick={() => onExpandContent()}
                  title="Click to view full table in Interactive tab"
                >
                  <span className="action-icon">📊</span>
                  Table ({rowCount > 0 ? `${rowCount} rows` : 'view details'})
                </Tag>
              )
            }
            return <table className="markdown-table" {...props}>{children}</table>
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownMessage
