import React, { useEffect, useState } from 'react';
import { Calendar, Megaphone, Pin, X } from 'lucide-react';
import { Announcement } from '../types';
import { Spinner } from './LoadingIndicator';

interface AnnouncementEditorModalProps {
  isOpen: boolean;
  announcement: Announcement | null;
  onSave: (
    id: string,
    updates: {
      title: string;
      message: string;
      pinned: boolean;
      showUntil?: string;
    }
  ) => Promise<void>;
  onClose: () => void;
}

const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;

export const AnnouncementEditorModal: React.FC<AnnouncementEditorModalProps> = ({
  isOpen,
  announcement,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [pinned, setPinned] = useState(false);
  const [showUntil, setShowUntil] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && announcement) {
      setTitle(announcement.title || '');
      setMessage(announcement.message || '');
      setPinned(Boolean(announcement.pinned));
      setShowUntil(announcement.showUntil || '');
      setError('');
      setIsSaving(false);
    }
  }, [isOpen, announcement]);

  if (!mounted || !announcement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle) {
      setError('Please enter a title.');
      return;
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setError(`Title must be ${TITLE_MAX} characters or less.`);
      return;
    }
    if (!trimmedMessage) {
      setError('Please enter an announcement message.');
      return;
    }
    if (trimmedMessage.length > MESSAGE_MAX) {
      setError(`Message must be ${MESSAGE_MAX} characters or less.`);
      return;
    }
    if (showUntil && !/^\d{4}-\d{2}-\d{2}$/.test(showUntil)) {
      setError('Please choose a valid Show until date.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(announcement.id, {
        title: trimmedTitle,
        message: trimmedMessage,
        pinned,
        showUntil: showUntil || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full max-w-xl rounded-2xl bg-surface border border-subtle shadow-xl text-main overflow-hidden transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
        }`}
        role="dialog"
        aria-modal="true"
        data-controlled-dialog="true"
      >
        <div className="px-5 py-4 border-b border-subtle flex items-center justify-between bg-subtle/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-tint text-accent">
              <Megaphone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-main">Edit Announcement</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-sec hover:text-main hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="edit-ann-title" className="text-xs font-semibold uppercase tracking-wider text-sec">
                Title <span className="text-accent">*</span>
              </label>
              <span className="text-[11px] text-mut tabular-nums">
                {title.length} / {TITLE_MAX}
              </span>
            </div>
            <input
              id="edit-ann-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Announcement title"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="edit-ann-message" className="text-xs font-semibold uppercase tracking-wider text-sec">
                Message <span className="text-accent">*</span>
              </label>
              <span className={`text-[11px] tabular-nums ${
                message.length >= MESSAGE_MAX ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-mut'
              }`}>
                {message.length} / {MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="edit-ann-message"
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError('');
              }}
              rows={5}
              placeholder="Write your announcement message..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y min-h-[120px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            {/* Pin to top switch */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={pinned}
                onClick={() => setPinned(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                  pinned
                    ? 'bg-accent border-accent'
                    : 'bg-subtle border-subtle'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    pinned ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                onClick={() => setPinned(prev => !prev)}
                className="text-sm font-medium text-main inline-flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Pin className={`w-3.5 h-3.5 ${pinned ? 'text-accent' : 'text-mut'}`} />
                <span>Pin to top</span>
              </span>
            </div>

            {/* Optional Show until date */}
            <div className="flex items-center gap-2">
              <label htmlFor="edit-ann-show-until" className="text-xs font-medium text-sec inline-flex items-center gap-1 whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-mut" />
                <span>Show until</span>
              </label>
              <input
                id="edit-ann-show-until"
                type="date"
                value={showUntil}
                onChange={(e) => setShowUntil(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-subtle bg-canvas text-main text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
              {showUntil && (
                <button
                  type="button"
                  onClick={() => setShowUntil('')}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium text-sec hover:text-main hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-subtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 min-h-[44px] rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-sm font-medium text-sec transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-accent hover:opacity-95 text-accent-contrast text-sm font-semibold transition-opacity inline-flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Spinner size="xs" variant="contrast" />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
