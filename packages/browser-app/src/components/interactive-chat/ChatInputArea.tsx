import { forwardRef } from 'react'
import { TextArea, Button, IconButton } from '@carbon/react'
import { SendAlt, Microphone } from '@carbon/icons-react'
import CommandMenu from '../CommandMenu'

interface SlashCommandsState {
  showMenu: boolean
  matches: any[]
  selectedIndex: number
  selectCommand: (cmd: any) => void
  closeMenu: () => void
  menuPosition: any
  handleKeyDown: (e: React.KeyboardEvent) => boolean
}

interface ChatInputAreaProps {
  draftInput: string
  onInputChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isInitialized: boolean
  isLoading: boolean
  slashCommands: SlashCommandsState
}

export const ChatInputArea = forwardRef<HTMLTextAreaElement, ChatInputAreaProps>(
  function ChatInputArea({ draftInput, onInputChange, onSend, onKeyDown, isInitialized, isLoading, slashCommands }, ref) {
    return (
      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="textarea-container">
            <TextArea
              ref={ref}
              labelText="Message"
              placeholder="Type / for commands, or ask about resume generation, job analysis, learning paths..."
              value={draftInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              disabled={!isInitialized}
              data-element="chat-input"
              aria-controls={slashCommands.showMenu ? 'slash-command-menu' : undefined}
              aria-activedescendant={slashCommands.showMenu ? `command-option-${slashCommands.selectedIndex}` : undefined}
              aria-autocomplete="list"
              aria-expanded={slashCommands.showMenu}
            />
            <div className="input-actions">
              <IconButton
                label="Voice input"
                onClick={() => console.log('[InteractiveChat] Microphone button clicked')}
                disabled={!isInitialized}
                className="microphone-button-input"
                kind="ghost"
                size="sm"
              >
                <Microphone size={20} />
              </IconButton>
              <Button
                renderIcon={SendAlt}
                onClick={onSend}
                disabled={!draftInput.trim() || isLoading || !isInitialized}
                className="send-button-inline"
                kind="primary"
                size="sm"
                hasIconOnly
                iconDescription="Send message"
                data-element="chat-send-button"
              />
            </div>
            {slashCommands.showMenu && (
              <CommandMenu
                matches={slashCommands.matches}
                selectedIndex={slashCommands.selectedIndex}
                onSelect={slashCommands.selectCommand}
                onClose={slashCommands.closeMenu}
                position={slashCommands.menuPosition}
              />
            )}
          </div>
        </div>
      </div>
    )
  }
)
