import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Link2, X } from 'lucide-react';
import { PortalLesson } from '../types';
import {
  PORTAL_LESSON_NOTE_MAX,
  PORTAL_LESSON_TITLE_MAX,
  PORTAL_LESSON_URL_MAX,
  validatePortalLessonDriveUrl,
} from '../lib/portalLessons';
import { Spinner } from './LoadingIndicator';

interface PortalLessonEditorModalProps {
  isOpen: boolean;
  lesson: PortalLesson | null;
  onSave: (
    id: string,
    updates: {
      sundayDate: string;
      title: string;
      driveUrl?: string;
      note?: string;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export const PortalLessonEditorModal: React.FC<PortalLessonEditorModalProps> = ({
  isOpen,
  lesson,
  onSave,
  onClose,
}) => {
  const [sundayDate, setSundayDate] = useState('');
  const [title, setTitle] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [note, setNote] = useState('');
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
    if (isOpen && lesson) {
      setSundayDate(lesson.sundayDate || '');
      setTitle(lesson.title || '');
      setDriveUrl(lesson.driveUrl || '');
      setNote(lesson.note || '');
      setError('');
      setIsSaving(false);
    }
  }, [isOpen, lesson]);

  if (!mounted || !lesson) return null;

  const hasBodyText = Boolean(lesson.bodyHtml && lesson.bodyHtml.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const cleanDate = sundayDate.trim();
    const cleanTitle = title.trim();
    const cleanNote = note.trim();
    const cleanDriveUrl = driveUrl.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      setError('Please pick a valid Sunday date.');
      return;
    }
    if (!cleanTitle) {
      setError('Please enter a lesson title.');
      return;
    }
    if (cleanTitle.length > PORTAL_LESSON_TITLE_MAX) {
      setError(`Title must be ${PORTAL_LESSON_TITLE_MAX} characters or less.`);
      return;
    }

    let normalizedDriveUrl = '';
    if (cleanDriveUrl) {
      const urlCheck = validatePortalLessonDriveUrl(cleanDriveUrl);
      if (!urlCheck.valid) {
        setError(
          urlCheck.error ||
            'Link must be a Google Drive or Google Docs https link starting with https://drive.google.com/ or https://docs.google.com/.'
        );
        return;
      }
      normalizedDriveUrl = urlCheck.normalized;
    } else if (!hasBodyText) {
      setError('Google Drive link is required.');
      return;
    }

    if (cleanNote.length > PORTAL_LESSON_NOTE_MAX) {
      setError(`Note must be ${PORTAL_LESSON_NOTE_MAX} characters or less.`);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(lesson.id, {
        sundayDate: cleanDate,
        title: cleanTitle,
        driveUrl: normalizedDriveUrl,
        note: cleanNote,
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
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-main">Edit Lesson</h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-lesson-date"
                className="text-xs font-semibold uppercase tracking-wider text-sec flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-mut" />
                <span>Sunday date <span className="text-accent">*</span></span>
              </label>
              <input
                id="edit-lesson-date"
                type="date"
                value={sundayDate}
                onChange={(e) => {
                  setSundayDate(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="edit-lesson-title" className="text-xs font-semibold uppercase tracking-wider text-sec">
                  Title <span className="text-accent">*</span>
                </label>
                <span className="text-[11px] text-mut tabular-nums">
                  {title.length} / {PORTAL_LESSON_TITLE_MAX}
                </span>
              </div>
              <input
                id="edit-lesson-title"
                type="text"
                value={title}
                maxLength={PORTAL_LESSON_TITLE_MAX}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Revelation 20:7-8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="edit-lesson-url"
                className="text-xs font-semibold uppercase tracking-wider text-sec inline-flex items-center gap-1"
              >
                <Link2 className="w-3.5 h-3.5 text-mut" />
                <span>
                  Google Drive link{' '}
                  {hasBodyText ? (
                    <span className="normal-case font-normal text-mut">(optional)</span>
                  ) : (
                    <span className="text-accent">*</span>
                  )}
                </span>
              </label>
              <span className="text-[11px] text-mut tabular-nums">
                {driveUrl.length} / {PORTAL_LESSON_URL_MAX}
              </span>
            </div>
            <input
              id="edit-lesson-url"
              type="url"
              value={driveUrl}
              maxLength={PORTAL_LESSON_URL_MAX}
              onChange={(e) => {
                setDriveUrl(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://drive.google.com/... or https://docs.google.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          {hasBodyText && (
            <div className="p-3 rounded-xl bg-subtle/60 border border-subtle text-xs text-sec">
              This lesson&apos;s text was posted from Lesson Maker. To change the lesson text itself, update it in Forerunner Studio &gt; Lesson Maker.
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="edit-lesson-note" className="text-xs font-semibold uppercase tracking-wider text-sec">
                Note (optional)
              </label>
              <span className="text-[11px] text-mut tabular-nums">
                {note.length} / {PORTAL_LESSON_NOTE_MAX}
              </span>
            </div>
            <input
              id="edit-lesson-note"
              type="text"
              value={note}
              maxLength={PORTAL_LESSON_NOTE_MAX}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError('');
              }}
              placeholder="Optional note about this lesson"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
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
              <span>{isSaving ? 'Saving...' : 'Save lesson'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
