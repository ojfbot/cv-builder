import {
  Heading,
  Tile,
  Button,
} from '@carbon/react'
import { DocumentAdd, Edit } from '@carbon/icons-react'

function BioDashboard() {
  return (
    <div className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading className="section-header">Your Professional Bio</Heading>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button renderIcon={Edit} kind="tertiary">
            Edit Bio
          </Button>
          <Button renderIcon={DocumentAdd} kind="primary">
            Create New Bio
          </Button>
        </div>
      </div>

      <Tile style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--cds-text-secondary)' }}>
          Your professional bio will be stored in the <code>bio/</code> directory.
          It includes your personal information, work experience, education, skills, and projects.
        </p>
        <p style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)' }}>
          To get started, create a <code>bio/bio.json</code> file using the example template in{' '}
          <code>public/examples/bio-example.json</code>
        </p>
      </Tile>

      <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>Quick Stats</Heading>
      <div className="card-container">
        <Tile>
          <Heading style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>0</Heading>
          <div style={{ color: 'var(--cds-text-secondary)' }}>Years of Experience</div>
        </Tile>
        <Tile>
          <Heading style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>0</Heading>
          <div style={{ color: 'var(--cds-text-secondary)' }}>Skills Listed</div>
        </Tile>
        <Tile>
          <Heading style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>0</Heading>
          <div style={{ color: 'var(--cds-text-secondary)' }}>Projects</div>
        </Tile>
      </div>
    </div>
  )
}

export default BioDashboard
