/**
 * useSlashCommands Hook
 * Manages slash command menu state and interactions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { slashCommandService } from '../services/slash-command-service';
import type { CommandMatch, CommandContext } from '../types/slash-commands';

interface UseSlashCommandsProps {
  input: string;
  onCommandExecuted?: (command: string) => void;
  context: CommandContext;
}

export function useSlashCommands({ input, onCommandExecuted, context }: UseSlashCommandsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [matches, setMatches] = useState<CommandMatch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Check if input starts with / and update matches
  useEffect(() => {
    const trimmed = input.trim();

    if (trimmed.startsWith('/')) {
      // Extract command query (remove leading /)
      const query = trimmed.slice(1);

      // Search for matching commands
      const commandMatches = slashCommandService.searchCommands(query);

      setMatches(commandMatches);
      setShowMenu(commandMatches.length > 0);
      setSelectedIndex(0); // Reset selection when matches change
    } else {
      setShowMenu(false);
      setMatches([]);
    }
  }, [input]);

  // Update menu position when input ref changes
  const updateMenuPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 300; // Approximate max menu height

      // Check if there's enough space above the input
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position menu where there's more space
      if (spaceAbove > menuHeight || spaceAbove > spaceBelow) {
        // Position above input
        setMenuPosition({
          top: rect.top - 10,
          left: rect.left
        });
      } else {
        // Position below input
        setMenuPosition({
          top: rect.bottom + 10,
          left: rect.left
        });
      }
    }
  }, []);

  // Update position when menu is shown
  useEffect(() => {
    if (showMenu) {
      updateMenuPosition();

      // Update on window resize
      window.addEventListener('resize', updateMenuPosition);
      return () => window.removeEventListener('resize', updateMenuPosition);
    }
    // updateMenuPosition is stable (no dependencies), so we exclude it from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMenu]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showMenu) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % matches.length);
          return true;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + matches.length) % matches.length);
          return true;

        case 'Enter':
          if (matches.length > 0) {
            e.preventDefault();
            selectCommand(selectedIndex);
            return true;
          }
          return false;

        case 'Escape':
          e.preventDefault();
          setShowMenu(false);
          return true;

        default:
          return false;
      }
    },
    [showMenu, matches, selectedIndex]
  );

  // Select a command from the menu
  const selectCommand = useCallback(
    (index: number) => {
      const match = matches[index];
      if (!match) return;

      const command = match.command;

      // Build command string with placeholders for args
      let commandString = `/${command.name}`;

      if (command.args && command.args.length > 0) {
        const argPlaceholders = command.args.map(arg =>
          arg.required ? `<${arg.name}>` : `[${arg.name}]`
        );
        commandString += ' ' + argPlaceholders.join(' ');
      }

      // Call the onCommandExecuted callback to update the input
      if (onCommandExecuted) {
        onCommandExecuted(commandString);
      }

      setShowMenu(false);
    },
    [matches, onCommandExecuted]
  );

  // Execute command string and return result
  const executeCommand = useCallback(
    async (commandString: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      return await slashCommandService.executeCommand(commandString, context);
    },
    [context]
  );

  // Close menu
  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  return {
    showMenu,
    matches,
    selectedIndex,
    menuPosition,
    inputRef,
    handleKeyDown,
    selectCommand,
    executeCommand,
    closeMenu
  };
}
