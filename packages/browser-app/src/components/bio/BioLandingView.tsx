import { Heading, Tile, Grid, Column } from '@carbon/react'

interface StatItem {
  value: number
  label: string
  encouragement?: string
}

interface StatGroup {
  stats: StatItem[]
}

interface BioLandingViewProps {
  statGroups: StatGroup[]
  currentIndices: number[]
  fadeStates: boolean[]
}

export function BioLandingView({ statGroups, currentIndices, fadeStates }: BioLandingViewProps) {
  return (
    <>
      <Grid narrow>
        <Column lg={12} md={7} sm={4}>
          <Tile style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'var(--cds-text-secondary)' }}>
              Your professional bio is securely stored in private storage. Build your profile from multiple
              sources and let AI help you showcase your best self.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--cds-text-secondary)' }}>
              Click "Edit Bio" below to start creating entries. You can upload your resume, chat about your
              experiences, or fill out structured forms. Each entry becomes a tile you can edit and refine.
            </p>
          </Tile>
        </Column>
      </Grid>

      <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>Quick Stats</Heading>
      <div className="card-container">
        {statGroups.map((group, groupIndex) => {
          const currentStat = group.stats[currentIndices[groupIndex]]
          const isVisible = fadeStates[groupIndex]

          return (
            <Tile
              key={groupIndex}
              style={{
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                }}
              >
                <Heading style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {currentStat.value}
                </Heading>
                <div style={{ color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                  {currentStat.label}
                </div>
                {currentStat.value === 0 && currentStat.encouragement && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--cds-link-primary)',
                    fontStyle: 'italic',
                    marginTop: '0.5rem'
                  }}>
                    {currentStat.encouragement}
                  </div>
                )}
              </div>
            </Tile>
          )
        })}
      </div>
    </>
  )
}
