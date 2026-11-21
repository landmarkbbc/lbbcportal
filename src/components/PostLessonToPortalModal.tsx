import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Eye,
  Link2,
  Send,
  X,
} from 'lucide-react';
import { PortalLesson } from '../types';
import { formatDate } from '../lib/dateTime';
import {
  PORTAL_LESSON_BODY_HTML_MAX,
  PORTAL_LESSON_TITLE_MAX,
  PORTAL_LESSON_URL_MAX,
  sanitizeLessonBodyHtml,
  validatePortalLessonDriveUrl,
} from '../lib/portalLessons';
import { SanitizedLessonBody } from './SanitizedLessonBody';
import { Spinner } from './LoadingIndicator';

interface PostLessonToPortalModalProps {
  isOpen: boolean;
  existingPortalLesson: PortalLesson | null;
  initialSundayDate: string;
  initialTitle: string;
  contentHtml: string;
  sourceLessonId: string;
  onConfirmPost: (payload: {
    sundayDate: string;
    title: string;
    driveUrl?: string;
    bodyHtml: string;
    source: 'lessonMaker';
    sourceLessonId: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const PostLessonToPortalModal: React.FC<PostLessonToPortalModalProps> = ({
  isOpen,
  existingPortalLesson,
  initialSundayDate,
  initialTitle,
  contentHtml,
  sourceLessonId,
  onConfirmPost,
  onClose,
}) => {
  const [sundayDate, setSundayDate] = useState(initialSundayDate);
  const [title, setTitle] = useState(initialTitle);
  const [driveUrl, setDriveUrl] = useState('');
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
    if (isOpen) {
      setSundayDate(initialSundayDate);
      setTitle(initialTitle);
      setDriveUrl(existingPortalLesson?.driveUrl || '');
      setError('');
      setIsSaving(false);
    }
  }, [isOpen, initialSundayDate, initialTitle, existingPortalLesson]);

  const sanitizedBodyHtml = useMemo(
    () => sanitizeLessonBodyHtml(contentHtml),
    [contentHtml]
  );

  const isBodyEmpty = sanitizedBodyHtml.length === 0;
  const isBodyTooLong = sanitizedBodyHtml.length > PORTAL_LESSON_BODY_HTML_MAX;

  if (!mounted) return null;

  const isUpdating = Boolean(existingPortalLesson);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const cleanDate = sundayDate.trim();
    const cleanTitle = title.trim();
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

    let normalizedDriveUrl: string | undefined = existingPortalLesson ? '' : undefined;
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
    }

    if (isBodyEmpty) {
      setError('This lesson has no formatted text yet. Add lesson text in Step 3 before posting.');
      return;
    }
    if (isBodyTooLong) {
      setError(
        `Lesson text is too long (${sanitizedBodyHtml.length.toLocaleString()} / ${PORTAL_LESSON_BODY_HTML_MAX.toLocaleString()} characters). Please shorten slightly.`
      );
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onConfirmPost({
        sundayDate: cleanDate,
        title: cleanTitle,
        driveUrl: normalizedDriveUrl,
        bodyHtml: sanitizedBodyHtml,
        source: 'lessonMaker',
        sourceLessonId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to post lesson to portal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-subtle shadow-xl text-main overflow-hidden transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-portal-lesson-heading"
        data-controlled-dialog="true"
      >
        <div className="px-5 py-4 border-b border-subtle flex items-center justify-between bg-subtle/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-tint text-accent">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 id="post-portal-lesson-heading" className="text-base font-bold text-main">
                {isUpdating ? 'Update Lesson on Portal' : 'Post to Portal as Latest Lesson'}
              </h3>
              <p className="text-xs text-sec">
                Only the sanitized lesson text, title, date, and optional Word link will be posted.
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="portal-post-date"
                  className="text-xs font-semibold uppercase tracking-wider text-sec flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-mut" />
                  <span>Sunday date <span className="text-accent">*</span></span>
                </label>
                <input
                  id="portal-post-date"
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
                  <label htmlFor="portal-post-title" className="text-xs font-semibold uppercase tracking-wider text-sec">
                    Title <span className="text-accent">*</span>
                  </label>
                  <span className="text-[11px] text-mut tabular-nums">
                    {title.length} / {PORTAL_LESSON_TITLE_MAX}
                  </span>
                </div>
                <input
                  id="portal-post-title"
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
                  htmlFor="portal-post-drive-url"
                  className="text-xs font-semibold uppercase tracking-wider text-sec inline-flex items-center gap-1"
                >
                  <Link2 className="w-3.5 h-3.5 text-mut" />
                  <span>Google Drive link (optional, for the Word file)</span>
                </label>
                <span className="text-[11px] text-mut tabular-nums">
                  {driveUrl.length} / {PORTAL_LESSON_URL_MAX}
                </span>
              </div>
              <input
                id="portal-post-drive-url"
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

            {/* Member Preview */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-sec inline-flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-accent" />
                  <span>Preview of what members will read</span>
                </div>
                <span
                  className={`text-[11px] tabular-nums ${
                    isBodyTooLong ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-mut'
                  }`}
                >
                  {sanitizedBodyHtml.length.toLocaleString()} / {PORTAL_LESSON_BODY_HTML_MAX.toLocaleString()} chars
                </span>
              </div>

              {isBodyEmpty ? (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-300">
                  No lesson text found yet. Type or paste the lesson in Step 3 before posting.
                </div>
              ) : (
                <div className="viewer-card p-5 space-y-4 bg-canvas/60 max-h-[300px] overflow-y-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-subtle">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent bg-accent-tint px-2.5 py-1 rounded-md">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>Latest lesson</span>
                    </span>
                    <span className="text-xs font-medium text-sec">
                      {sundayDate ? formatDate(sundayDate, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  <h4 className="text-lg sm:text-xl font-bold tracking-tight text-accent text-balance">
                    {title.trim() || 'Untitled Lesson'}
                  </h4>

                  <SanitizedLessonBody html={sanitizedBodyHtml} />
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-subtle flex items-center justify-end gap-2.5 bg-subtle/20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 min-h-[42px] rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-sm font-medium text-sec transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isBodyEmpty || isBodyTooLong}
              className="px-5 py-2 min-h-[42px] rounded-xl bg-accent hover:opacity-95 text-accent-contrast text-sm font-semibold transition-opacity inline-flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Spinner size="xs" variant="contrast" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isUpdating ? 'Update on Portal' : 'Post to Portal'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
