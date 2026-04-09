import { Heading, Tile } from '@carbon/react'
import { Upload, ChatBot, DataTable, Connect } from '@carbon/icons-react'
import type { CarbonIconType } from '@carbon/icons-react/lib/CarbonIcon'

interface ActionTile {
  icon: CarbonIconType
  title: string
  description: string
  onClick: () => void
}

interface BioActionCarouselProps {
  carouselIndex: number
  onCarouselIndexChange: (index: number) => void
}

const ACTION_TILES: ActionTile[] = [
  {
    icon: Upload,
    title: 'Upload Resume',
    description: 'Upload your existing resume or CV. AI will extract and organize your information.',
    onClick: () => console.log('Upload resume clicked'),
  },
  {
    icon: ChatBot,
    title: 'Chat About Experiences',
    description: 'Have a conversation with AI about your career, goals, and achievements.',
    onClick: () => console.log('Chat about experiences clicked'),
  },
  {
    icon: DataTable,
    title: 'Fill In Form',
    description: 'Enter your information directly using structured forms for precision.',
    onClick: () => console.log('Fill in form clicked'),
  },
  {
    icon: Connect,
    title: 'Connect Sources',
    description: 'Link your LinkedIn, GitHub, portfolio, blog, or other professional profiles.',
    onClick: () => console.log('Connect sources clicked'),
  },
]

export function BioActionCarousel({ carouselIndex, onCarouselIndexChange }: BioActionCarouselProps) {
  return (
    <>
      <Heading style={{ fontSize: '1rem', marginBottom: '1rem' }}>
        Choose how to build your bio
      </Heading>
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <div className="card-container" style={{ marginBottom: '1rem' }}>
          {ACTION_TILES.map((tile, index) => {
            const TileIcon = tile.icon
            return (
              <Tile
                key={index}
                data-element={`bio-action-tile-${index}`}
                style={{
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: index === carouselIndex
                    ? '2px solid var(--cds-border-interactive)'
                    : '2px solid transparent',
                  outline: 'none',
                  boxShadow: index === carouselIndex
                    ? '0 0 0 2px var(--cds-focus)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cds-border-interactive)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  if (index !== carouselIndex) {
                    e.currentTarget.style.borderColor = 'transparent'
                  }
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onClick={() => {
                  onCarouselIndexChange(index)
                  tile.onClick()
                }}
                onFocus={() => onCarouselIndexChange(index)}
                tabIndex={0}
                role="button"
                aria-label={tile.title}
              >
                <TileIcon size={48} style={{ marginBottom: '1rem', color: 'var(--cds-icon-primary)' }} />
                <Heading style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  {tile.title}
                </Heading>
                <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                  {tile.description}
                </p>
              </Tile>
            )
          })}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem'
        }}>
          {ACTION_TILES.map((_, index) => (
            <button
              key={index}
              onClick={() => onCarouselIndexChange(index)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                backgroundColor: index === carouselIndex
                  ? 'var(--cds-icon-primary)'
                  : 'var(--cds-icon-secondary)',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                transform: index === carouselIndex ? 'scale(1.2)' : 'scale(1)',
              }}
              aria-label={`Highlight ${ACTION_TILES[index].title}`}
              aria-current={index === carouselIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      </div>
    </>
  )
}
