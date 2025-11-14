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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react'

function ToolboxDashboard() {
  const actionsHeaders = [
    { key: 'name', header: 'Action Name' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' },
    { key: 'lastUsed', header: 'Last Used' },
  ]

  const agentsHeaders = [
    { key: 'name', header: 'Agent Name' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status' },
    { key: 'runs', header: 'Runs' },
  ]

  const actionsRows: any[] = []
  const agentsRows: any[] = []

  return (
    <div>
      <Heading className="section-header">Toolbox</Heading>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Define custom actions, configure AI agents, and manage automation tools.
          Create reusable workflows and extend the CV Builder's capabilities.
        </p>
      </Tile>

      <Tabs>
        <TabList aria-label="Toolbox sections" contained>
          <Tab>Actions</Tab>
          <Tab>Agents</Tab>
          <Tab>Tools</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DataTable rows={actionsRows} headers={actionsHeaders}>
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
                            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>⚡</p>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No custom actions defined</p>
                            <p style={{ fontSize: '0.875rem' }}>
                              Create custom actions to automate repetitive tasks
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
          </TabPanel>

          <TabPanel>
            <DataTable rows={agentsRows} headers={agentsHeaders}>
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
                            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🤖</p>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No custom agents configured</p>
                            <p style={{ fontSize: '0.875rem' }}>
                              Configure specialized AI agents with custom prompts and behaviors
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
          </TabPanel>

          <TabPanel>
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🔧</p>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Tools & Integrations</p>
              <p style={{ fontSize: '0.875rem' }}>
                Connect external tools and services to enhance your workflow
              </p>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}

export default ToolboxDashboard
