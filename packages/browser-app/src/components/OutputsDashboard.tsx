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

function OutputsDashboard() {
  const headers = [
    { key: 'filename', header: 'Filename' },
    { key: 'type', header: 'Type' },
    { key: 'job', header: 'For Job' },
    { key: 'date', header: 'Generated' },
  ]

  const rows: any[] = []

  return (
    <div>
      <Heading className="section-header">Generated Outputs</Heading>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          All generated resumes, cover letters, and learning paths are saved in the{' '}
          <code>output/</code> directory. You can view and download them here.
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
                      No outputs generated yet. Use the Interactive tab to create your first resume!
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

export default OutputsDashboard
