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

function PipelinesDashboard() {
  const headers = [
    { key: 'name', header: 'Pipeline Name' },
    { key: 'status', header: 'Status' },
    { key: 'jobs', header: 'Jobs' },
    { key: 'lastRun', header: 'Last Run' },
  ]

  const rows: any[] = []

  return (
    <div>
      <Heading className="section-header">Application Pipelines</Heading>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Automated workflows for job applications. Create pipelines to automatically generate
          tailored resumes, cover letters, and follow-up emails for multiple job opportunities.
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
                      <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🔄</p>
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No pipelines configured yet</p>
                      <p style={{ fontSize: '0.875rem' }}>
                        Create automated workflows to streamline your job application process
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

export default PipelinesDashboard
