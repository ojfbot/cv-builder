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
} from '@carbon/react'

function ResearchDashboard() {
  const headers = [
    { key: 'topic', header: 'Research Topic' },
    { key: 'type', header: 'Type' },
    { key: 'source', header: 'Source' },
    { key: 'date', header: 'Date' },
  ]

  const rows: any[] = []

  return (
    <div>
      <Heading className="section-header">Research & Insights</Heading>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Research on industry trends, job market insights, salary data, and best practices
          to help you make informed career decisions. AI-powered research findings are saved here.
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
                      <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📊</p>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No research saved yet</p>
                      <p style={{ fontSize: '0.875rem' }}>
                        Ask the AI assistant to research industry trends, salary data, or job market insights
                      </p>
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
    </div>
  )
}

export default ResearchDashboard
