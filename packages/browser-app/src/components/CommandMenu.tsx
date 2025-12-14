/**
 * CommandMenu Component
 * Autocomplete dropdown for slash commands
 */

import { useEffect, useRef } from 'react';
import type { CommandMatch } from '../types/slash-commands';
import '../styles/CommandMenu.css';

interface CommandMenuProps {
  matches: CommandMatch[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function CommandMenu({
  matches,
  selectedIndex,
  onSelect,
  onClose,
  position
}: CommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (matches.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="command-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      role="listbox"
      aria-label="Slash commands"
    >
      {matches.map((match, index) => (
        <div
          key={`${match.command.name}-${index}`}
          ref={index === selectedIndex ? selectedItemRef : null}
          className={`command-menu-item ${index === selectedIndex ? 'selected' : ''}`}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => onSelect(index)}
          onMouseEnter={() => onSelect(index)}
        >
          <div className="command-menu-item-header">
            <span className="command-menu-item-name">/{match.command.name}</span>
            <span className={`command-menu-item-category category-${match.command.category}`}>
              {match.command.category}
            </span>
          </div>
          <div className="command-menu-item-description">
            {match.command.description}
          </div>
          {match.command.args && match.command.args.length > 0 && (
            <div className="command-menu-item-args">
              {match.command.args.map(arg => (
                <span
                  key={arg.name}
                  className={`command-arg ${arg.required ? 'required' : 'optional'}`}
                >
                  {arg.required ? `<${arg.name}>` : `[${arg.name}]`}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
