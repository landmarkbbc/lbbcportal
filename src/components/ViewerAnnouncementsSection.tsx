import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Announcement } from '../types';
import { getTodayString } from '../lib/dateTime';
import { linkifyPlainText } from '../lib/linkifyText';

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

const ViewerAnnouncementCard: React.FC<{ announcement: Announcement }> = ({ announcement }) => {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      if (!textRef.current) return;
      setIsClamped(textRef.current.scrollHeight > textRef.current.clientHeight + 2);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [announcement.message, expanded]);

  const postedLabel = formatPostedDate(announcement.createdAt);

  return (
    <article
      className={`viewer-card p-4 sm:p-5 space-y-2.5 transition-colors ${
        announcement.pinned ? 'border-accent/35' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {announcement.pinned && (
            <span
              className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-md bg-accent-tint text-accent shrink-0"
              title="Pinned announcement"
              aria-label="Pinned"
            >
              <Pin className="w-3 h-3" />
            </span>
          )}
          <h3 className="text-[15px] sm:text-base font-bold text-main leading-snug break-words">
            {announcement.title}
          </h3>
        </div>
        {postedLabel && (
          <time
            dateTime={announcement.createdAt}
            className="text-xs text-mut whitespace-nowrap shrink-0 tabular-nums pt-0.5"
          >
            {postedLabel}
          </time>
        )}
      </div>

      <div className="space-y-1.5">
        <p
          ref={textRef}
          className={`text-sm text-sec leading-relaxed whitespace-pre-wrap break-words ${
            expanded ? '' : 'line-clamp-4'
          }`}
        >
          {linkifyPlainText(announcement.message)}
        </p>

        {(isClamped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="text-xs font-semibold text-accent hover:underline py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    </article>
  );
};

export const ViewerAnnouncementsSection: React.FC = () => {
  const { announcements } = useData();
  const todayStr = getTodayString();

  const activeAnnouncements = useMemo(() => {
    return announcements
      .filter((item) => !item.showUntil || item.showUntil >= todayStr)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [announcements, todayStr]);

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 viewer-home-section viewer-home-s4" aria-label="Church announcements">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-tint text-accent flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-main tracking-tight">
              Announcements
            </h2>
            <p className="text-xs text-sec mt-0.5">
              Latest updates and notices from church leadership
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {activeAnnouncements.map((item) => (
          <ViewerAnnouncementCard key={item.id} announcement={item} />
        ))}
      </div>
    </section>
  );
};
