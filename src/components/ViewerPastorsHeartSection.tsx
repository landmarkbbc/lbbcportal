import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, HeartHandshake } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatSundayBulletinDate } from '../lib/bulletinHelpers';

export const ViewerPastorsHeartSection: React.FC = () => {
  const { portalPastorsHeart } = useData();
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  const latestEntry = useMemo(() => {
    if (!portalPastorsHeart || portalPastorsHeart.length === 0) return null;
    const sorted = [...portalPastorsHeart].sort((a, b) =>
      (b.sundayDate || b.id || '').localeCompare(a.sundayDate || a.id || '')
    );
    return sorted[0] || null;
  }, [portalPastorsHeart]);

  useEffect(() => {
    setExpanded(false);
  }, [latestEntry?.id]);

  useEffect(() => {
    if (expanded || !latestEntry) return;
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
  }, [latestEntry?.id, latestEntry?.body, expanded]);

  if (!latestEntry) {
    return null;
  }

  const formattedSunday = formatSundayBulletinDate(latestEntry.sundayDate);
  const lessonPassage = (latestEntry.lessonPassage || '').trim();

  return (
    <section
      className="space-y-4 viewer-home-section viewer-home-s5"
      aria-label="From the Pastor's Heart"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-tint text-accent flex items-center justify-center shrink-0">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-main tracking-tight">
              From the Pastor&apos;s Heart
            </h2>
            <p className="text-xs text-sec mt-0.5">
              Weekly Sunday reflection from our pastor
            </p>
          </div>
        </div>
      </div>

      <article className="viewer-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-main">
            <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
            <time dateTime={latestEntry.sundayDate}>{formattedSunday}</time>
          </div>

          {lessonPassage && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent-tint/70 border border-accent/20 text-xs font-semibold text-accent">
              Lesson: {lessonPassage}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <p
            ref={textRef}
            className={`text-sm sm:text-[15px] text-sec leading-relaxed whitespace-pre-wrap break-words ${
              expanded ? '' : 'line-clamp-6'
            }`}
          >
            {latestEntry.body}
          </p>

          {(isClamped || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="text-xs font-semibold text-accent hover:underline py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </article>
    </section>
  );
};
