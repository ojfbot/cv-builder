import { useState, useEffect } from 'react'
import {
  Heading,
  Tile,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
  Modal,
  Tag,
} from '@carbon/react'
import { View, TrashCan, Renew } from '@carbon/icons-react'
import { ResearchEntry } from '../../models/research'
import { BrowserStorage } from '../utils/browser-storage'
import MarkdownMessage from './MarkdownMessage'

const researchStorage = new BrowserStorage('cv-builder:research')

function ResearchDashboard() {
  const [researchEntries, setResearchEntries] = useState<ResearchEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<ResearchEntry | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  // Load research entries from browser storage
  useEffect(() => {
    loadResearchEntries()
  }, [])

  const loadResearchEntries = async () => {
    try {
      const keys = await researchStorage.list('')
      const entries: ResearchEntry[] = []

      for (const key of keys) {
        try {
          const entry = await researchStorage.read<ResearchEntry>(key)
          entries.push(entry)
        } catch (error) {
          console.error(`Error loading research entry ${key}:`, error)
        }
      }

      // Sort by creation date (newest first)
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setResearchEntries(entries)
    } catch (error) {
      console.error('Error loading research entries:', error)
    }
  }

  const handleView = (entry: ResearchEntry) => {
    setSelectedEntry(entry)
    setViewModalOpen(true)
  }

  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this research entry?')) {
      try {
        await researchStorage.delete(entryId + '.json')
        setResearchEntries(prev => prev.filter(e => e.id !== entryId))
      } catch (error) {
        console.error('Error deleting research entry:', error)
      }
    }
  }

  const getTypeColor = (type: ResearchEntry['type']): 'blue' | 'green' | 'purple' | 'magenta' | 'cyan' | 'teal' => {
    const typeColors: Record<string, 'blue' | 'green' | 'purple' | 'magenta' | 'cyan' | 'teal'> = {
      company_intelligence: 'blue',
      industry_analysis: 'green',
      role_research: 'purple',
      salary_data: 'magenta',
      interview_prep: 'cyan',
      market_trends: 'teal',
      best_practices: 'purple',
      other: 'blue'
    }
    return typeColors[type] || 'blue'
  }

  const formatType = (type: string): string => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const headers = [
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'tags', header: 'Tags' },
    { key: 'createdAt', header: 'Created' },
    { key: 'actions', header: 'Actions' },
  ]

  const rows = researchEntries.map(entry => ({
    id: entry.id,
    title: entry.title,
    type: (
      <Tag type={getTypeColor(entry.type)}>
        {formatType(entry.type)}
      </Tag>
    ),
    tags: (
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {entry.tags.slice(0, 3).map((tag, idx) => (
          <Tag key={idx} type="outline" size="sm">
            {tag}
          </Tag>
        ))}
        {entry.tags.length > 3 && (
          <Tag type="outline" size="sm">
            +{entry.tags.length - 3}
          </Tag>
        )}
      </div>
    ),
    createdAt: new Date(entry.createdAt).toLocaleDateString(),
    actions: (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={View}
          iconDescription="View"
          hasIconOnly
          onClick={() => handleView(entry)}
        />
        <Button
          kind="danger--ghost"
          size="sm"
          renderIcon={TrashCan}
          iconDescription="Delete"
          hasIconOnly
          onClick={() => handleDelete(entry.id)}
        />
      </div>
    ),
  }))

  return (
    <div className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Research Database</Heading>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          onClick={loadResearchEntries}
        >
          Refresh
        </Button>
      </div>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Store and organize your career research, company intelligence, industry analyses,
          and interview preparation materials. Research entries are automatically created
          by the AI assistant and saved in browser local storage.
        </p>
      </Tile>

      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header: any) => (
                  <TableHeader {...getHeaderProps({ header })} key={header.key}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ color: 'var(--cds-text-secondary)' }}>
                      No research entries yet. Ask the AI assistant to research companies,
                      analyze industries, or prepare interview materials!
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row: any) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell: any) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DataTable>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onRequestClose={() => setViewModalOpen(false)}
        modalHeading={selectedEntry?.title}
        passiveModal
        size="lg"
      >
        {selectedEntry && (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Tag type={getTypeColor(selectedEntry.type)}>
                {formatType(selectedEntry.type)}
              </Tag>
              {selectedEntry.tags.map((tag, idx) => (
                <Tag key={idx} type="outline">
                  {tag}
                </Tag>
              ))}
            </div>
            {selectedEntry.source && (
              <p style={{ marginBottom: '1rem', color: 'var(--cds-text-secondary)' }}>
                <strong>Source:</strong>{' '}
                <a href={selectedEntry.source} target="_blank" rel="noopener noreferrer">
                  {selectedEntry.source}
                </a>
              </p>
            )}
            {selectedEntry.jobId && (
              <p style={{ marginBottom: '1rem', color: 'var(--cds-text-secondary)' }}>
                <strong>Related Job:</strong> {selectedEntry.jobId}
              </p>
            )}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--cds-layer-01)',
              borderRadius: '4px'
            }}>
              <MarkdownMessage content={selectedEntry.content} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ResearchDashboard
