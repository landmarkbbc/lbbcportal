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
      className="viewer-floating-note-btn md:hidden fixed bottom-20 right-4 z-30 min-h-[44px] px-4 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-accent-contrast shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 select-none text-xs font-semibold"
      title="Send a Note"
      aria-label="Send a Note"
    >
      <MessageSquarePlus className="w-4 h-4 shrink-0" />
      <span>Send a Note</span>
    </button>
  );
};
