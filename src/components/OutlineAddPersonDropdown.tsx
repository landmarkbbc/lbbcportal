import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Person } from '../types';

interface OutlineAddPersonDropdownProps {
  assignedPeopleIds: string[];
  people: Person[];
  onSelectPerson: (personId: string) => Promise<void>;
  onClose: () => void;
}

export const OutlineAddPersonDropdown: React.FC<OutlineAddPersonDropdownProps> = ({
  assignedPeopleIds,
  people,
  onSelectPerson,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus search input when opened
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close when clicking/tapping outside
  useEffect(() => {
    const handleOutsidePointer = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!isSubmitting) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [isSubmitting, onClose]);

  const availableSorted = useMemo(() => {
    const assignedSet = new Set(assignedPeopleIds);
    return people
      .filter((p) => !assignedSet.has(p.id))
      .slice()
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
  }, [people, assignedPeopleIds]);

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableSorted;
    return availableSorted.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [availableSorted, query]);

  // Reset highlighted item whenever filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, filteredMatches.length]);

  // Keep keyboard-highlighted item scrolled into view
  useEffect(() => {
    const el = optionRefs.current[highlightedIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handlePick = async (person: Person) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSelectPerson(person.id);
      onClose();
    } catch (err) {
      console.error('Error attaching person:', err);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      if (!isSubmitting) onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredMatches.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredMatches.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredMatches.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredMatches.length) % filteredMatches.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredMatches.length > 0) {
        const target = filteredMatches[highlightedIndex] || filteredMatches[0];
        if (target) {
          void handlePick(target);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full sm:w-64 min-w-[200px] max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 rounded-lg border border-accent bg-field shadow-2xs px-2 py-1">
        <Search className="w-3.5 h-3.5 text-mut shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={isSubmitting}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search member..."
          aria-label="Search member to add"
          aria-autocomplete="list"
          aria-expanded="true"
          className="w-full min-w-0 bg-transparent text-xs text-main placeholder-mut focus:outline-none py-0.5"
        />
        <button
          type="button"
          disabled={isSubmitting}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          className="p-1 rounded text-mut hover:text-main hover:bg-subtle transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          title="Close (Esc)"
          aria-label="Close member search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown List */}
      <div
        role="listbox"
        className="absolute left-0 top-full mt-1 z-40 w-full max-h-60 overflow-y-auto rounded-xl bg-surface border border-subtle shadow-dropdown py-1"
      >
        {filteredMatches.length === 0 ? (
          <div className="px-3 py-3 text-xs text-mut italic text-center">
            No matching member
          </div>
        ) : (
          filteredMatches.map((person, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={person.id}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                disabled={isSubmitting}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => void handlePick(person)}
                className={`w-full text-left px-3 py-2.5 sm:py-2 text-sm sm:text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
                  isHighlighted
                    ? 'bg-accent-tint text-accent font-semibold'
                    : 'text-main hover:bg-surface-hover'
                }`}
              >
                <span className="truncate">{person.name}</span>
                {isHighlighted && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
