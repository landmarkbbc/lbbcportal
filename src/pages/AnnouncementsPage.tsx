import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Edit2,
  Megaphone,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Announcement } from '../types';
import { formatDate, getTodayString } from '../lib/dateTime';
import { linkifyPlainText } from '../lib/linkifyText';
import { ConfirmModal } from '../components/ConfirmModal';
import { AnnouncementEditorModal } from '../components/AnnouncementEditorModal';
import { PageLoading, Spinner } from '../components/LoadingIndicator';

const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;

function formatPostedDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const AnnouncementsPage: React.FC = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    dataLoading,
  } = useData();

  // Top composer form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [pinned, setPinned] = useState(false);
  const [showUntil, setShowUntil] = useState('');
  const [formError, setFormError] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Edit & Delete modals
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deletingItem, setDeletingItem] = useState<Announcement | null>(null);

  const todayStr = getTodayString();

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [announcements]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosting) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle) {
      setFormError('Please enter an announcement title.');
      return;
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setFormError(`Title must be ${TITLE_MAX} characters or less.`);
      return;
    }
    if (!trimmedMessage) {
      setFormError('Please enter an announcement message.');
      return;
    }
    if (trimmedMessage.length > MESSAGE_MAX) {
      setFormError(`Message must be ${MESSAGE_MAX} characters or less.`);
      return;
    }
    if (showUntil && !/^\d{4}-\d{2}-\d{2}$/.test(showUntil)) {
      setFormError('Please select a valid Show until date.');
      return;
    }

    setFormError('');
    setIsPosting(true);
    try {
      await addAnnouncement({
        title: trimmedTitle,
        message: trimmedMessage,
        pinned,
        showUntil: showUntil || undefined,
      });
      setTitle('');
      setMessage('');
      setPinned(false);
      setShowUntil('');
    } catch (err: any) {
      setFormError(err?.message || 'Unable to post announcement. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    setDeletingItem(null);
    try {
      await deleteAnnouncement(targetId);
    } catch {
      // CloudError banner handles reporting
    }
  };

  if (dataLoading.announcements) {
    return <PageLoading label="Loading announcements..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 motion-page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-main tracking-tight">
              Announcements
            </h1>
            <p className="text-xs sm:text-sm text-sec mt-0.5">
              Post church announcements shown on the public Home page.
            </p>
          </div>
        </div>

        {announcements.length > 0 && (
          <div className="text-xs font-semibold text-mut bg-subtle px-3 py-1.5 rounded-xl border border-subtle self-start sm:self-auto tabular-nums">
            {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
          </div>
        )}
      </div>

      {/* Top Post Form */}
      <div className="rounded-2xl border border-subtle bg-surface shadow-card p-5 sm:p-6">
        <form onSubmit={handlePost} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ann-title" className="text-xs font-semibold uppercase tracking-wider text-sec">
                Title <span className="text-accent">*</span>
              </label>
              <span className="text-[11px] text-mut tabular-nums">
                {title.length} / {TITLE_MAX}
              </span>
            </div>
            <input
              id="ann-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="e.g., Sunday Fellowship Lunch after Morning Service"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ann-message" className="text-xs font-semibold uppercase tracking-wider text-sec">
                Message <span className="text-accent">*</span>
              </label>
              <span
                className={`text-[11px] tabular-nums ${
                  message.length >= MESSAGE_MAX
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-mut'
                }`}
              >
                {message.length} / {MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="ann-message"
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formError) setFormError('');
              }}
              rows={4}
              placeholder="Write the full announcement details. Web links (https://...) will become clickable automatically for members."
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle bg-canvas text-main text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y min-h-[110px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-subtle/60">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Pin to top switch */}
              <div className="flex items-center gap-2.5">
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
                <label htmlFor="ann-show-until" className="text-xs font-medium text-sec inline-flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-mut" />
                  <span>Show until</span>
                </label>
                <input
                  id="ann-show-until"
                  type="date"
                  value={showUntil}
                  onChange={(e) => {
                    setShowUntil(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-subtle bg-canvas text-main text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                {showUntil && (
                  <button
                    type="button"
                    onClick={() => setShowUntil('')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-sec hover:text-main hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-accent hover:opacity-95 text-accent-contrast text-sm font-semibold transition-opacity inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isPosting ? (
                <>
                  <Spinner size="xs" variant="contrast" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Announcements List */}
      <div className="space-y-3 motion-list-enter">
        {sortedAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-subtle bg-surface p-10 text-center space-y-2 shadow-xs">
            <Megaphone className="w-9 h-9 text-mut mx-auto" />
            <h2 className="text-sm font-bold text-main">No announcements yet.</h2>
            <p className="text-xs text-sec max-w-sm mx-auto">
              Use the form above to post your first church announcement.
            </p>
          </div>
        ) : (
          sortedAnnouncements.map((item) => {
            const isExpired = Boolean(item.showUntil && item.showUntil < todayStr);
            const postedLabel = formatPostedDate(item.createdAt);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-surface p-4 sm:p-5 shadow-card space-y-3 transition-colors ${
                  item.pinned
                    ? 'border-accent/40 ring-1 ring-accent/15'
                    : 'border-subtle'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.pinned && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-tint text-accent text-[11px] font-semibold"
                          title="Pinned to top"
                        >
                          <Pin className="w-3 h-3" />
                          <span>Pinned</span>
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold">
                          Expired
                        </span>
                      )}
                      <h2 className="text-base font-bold text-main break-words">
                        {item.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mut">
                      {postedLabel && <span>Posted {postedLabel}</span>}
                      {item.showUntil && (
                        <span>
                          {isExpired
                            ? `Ended ${formatDate(item.showUntil)}`
                            : `Shows through ${formatDate(item.showUntil)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="px-3 py-1.5 min-h-[38px] rounded-xl border border-subtle bg-canvas hover:bg-surface-hover text-xs font-semibold text-main inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sec" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="px-3 py-1.5 min-h-[38px] rounded-xl border border-subtle bg-canvas hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold text-sec inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-sec leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                  {linkifyPlainText(item.message)}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      <AnnouncementEditorModal
        isOpen={Boolean(editingItem)}
        announcement={editingItem}
        onSave={updateAnnouncement}
        onClose={() => setEditingItem(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        title="Delete announcement?"
        message={
          deletingItem
            ? `Are you sure you want to delete "${deletingItem.title}"? This removes it immediately from the public Home page.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};
