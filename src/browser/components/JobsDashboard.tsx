import {
  Heading,
  Tile,
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react'
import { DocumentAdd } from '@carbon/icons-react'

function JobsDashboard() {
  const headers = [
    { key: 'title', header: 'Job Title' },
    { key: 'company', header: 'Company' },
    { key: 'location', header: 'Location' },
    { key: 'status', header: 'Status' },
  ]

  const rows: any[] = []

  return (
    <div className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Job Listings</Heading>
        <Button renderIcon={DocumentAdd} kind="primary">
          Add Job Listing
        </Button>
      </div>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Track jobs you're interested in applying for. Store job descriptions in the{' '}
          <code>jobs/</code> directory. The system will analyze requirements and help tailor
          your resume for each position.
        </p>
      </Tile>

      <DataTable rows={rows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }: any) => (
          <TableContainer>
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
                        No job listings yet. Add your first job to get started!
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
          </TableContainer>
        )}
      </DataTable>
    </div>
  )
}

export default JobsDashboard
