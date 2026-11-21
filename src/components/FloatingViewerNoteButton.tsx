import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface FloatingViewerNoteButtonProps {
  onClick: () => void;
}

export const FloatingViewerNoteButton: React.FC<FloatingViewerNoteButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="viewer-floating-note-btn md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] right-4 z-30 w-12 h-12 rounded-full bg-surface hover:bg-surface-hover text-accent border border-strong shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 select-none"
      title="Send a Note"
      aria-label="Send a Note"
    >
      <MessageSquarePlus className="w-5 h-5 shrink-0" />
    </button>
  );
};
