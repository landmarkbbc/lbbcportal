import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  FolderOpen,
  Search,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { clampHeroBrightness } from '../lib/brandingCache';
import { formatDate } from '../lib/dateTime';
import {
  getGoogleDriveDownloadUrl,
  sanitizeLessonBodyHtml,
  validateLessonsDriveFolderUrl,
} from '../lib/portalLessons';
import { PortalLesson } from '../types';
import { SanitizedLessonBody } from '../components/SanitizedLessonBody';
import { Spinner } from '../components/LoadingIndicator';

const PAST_PAGE_SIZE = 12;
const LESSON_TEXT_SIZE_STORAGE_KEY = 'sunday_school_lesson_text_size';

type LessonTextSize = 'sm' | 'md' | 'lg';

const LESSON_TEXT_SIZE_OPTIONS: { id: LessonTextSize; label: string; ariaLabel: string }[] = [
  { id: 'sm', label: 'A-', ariaLabel: 'Smaller lesson text' },
  { id: 'md', label: 'A', ariaLabel: 'Default lesson text size' },
  { id: 'lg', label: 'A+', ariaLabel: 'Larger lesson text' },
];

const LESSON_TEXT_SIZE_CLASSES: Record<LessonTextSize, string> = {
  sm: 'text-[14.5px] sm:text-[15px] leading-[1.72]',
  md: 'text-[16px] sm:text-[17px] leading-[1.78]',
  lg: 'text-[18px] sm:text-[19.5px] leading-[1.82]',
};

function loadStoredLessonTextSize(): LessonTextSize {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LESSON_TEXT_SIZE_STORAGE_KEY);
      if (saved === 'sm' || saved === 'md' || saved === 'lg') {
        return saved;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return 'md';
}

function getSafeHttpsUrl(rawUrl?: string): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

function getLessonSearchText(lesson: PortalLesson): string {
  const shortDate = formatDate(lesson.sundayDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const longDate = formatDate(lesson.sundayDate, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${lesson.title} ${lesson.sundayDate} ${shortDate} ${longDate}`.toLowerCase();
}

export const LessonsPage: React.FC = () => {
  const {
    settings,
    lessonsBannerImage,
    portalLessons,
    dataLoading,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAST_PAGE_SIZE);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedReadIds, setExpandedReadIds] = useState<Record<string, boolean>>({});
  const [textSize, setTextSize] = useState<LessonTextSize>(loadStoredLessonTextSize);

  const effectiveBrightness = clampHeroBrightness(settings.lessonsHeroBrightness);

  const browseFolderUrl = useMemo(() => {
    const check = validateLessonsDriveFolderUrl(settings.lessonsDriveFolderLink || '');
    return check.valid && check.normalized ? getSafeHttpsUrl(check.normalized) || '' : '';
  }, [settings.lessonsDriveFolderLink]);

  const sortedLessons = useMemo(() => {
    return [...portalLessons].sort((a, b) => {
      const dateCmp = (b.sundayDate || '').localeCompare(a.sundayDate || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [portalLessons]);

  const latestLesson = sortedLessons[0] || null;
  const pastLessons = useMemo(() => sortedLessons.slice(1), [sortedLessons]);

  const latestSanitizedHtml = useMemo(
    () => (latestLesson?.bodyHtml ? sanitizeLessonBodyHtml(latestLesson.bodyHtml) : ''),
    [latestLesson?.bodyHtml]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPastLessons = useMemo(() => {
    if (!normalizedQuery) return pastLessons;
    return pastLessons.filter(lesson => getLessonSearchText(lesson).includes(normalizedQuery));
  }, [pastLessons, normalizedQuery]);

  const visiblePastLessons = useMemo(
    () => filteredPastLessons.slice(0, visibleCount),
    [filteredPastLessons, visibleCount]
  );

  const groupedPastByYear = useMemo(() => {
    const groups: { year: string; items: PortalLesson[] }[] = [];
    const byYear = new Map<string, PortalLesson[]>();

    for (const lesson of visiblePastLessons) {
      const year = (lesson.sundayDate || '').slice(0, 4) || 'Other';
      let bucket = byYear.get(year);
      if (!bucket) {
        bucket = [];
        byYear.set(year, bucket);
        groups.push({ year, items: bucket });
      }
      bucket.push(lesson);
    }

    return groups;
  }, [visiblePastLessons]);

  const newestPastYear = groupedPastByYear[0]?.year || '';
  const hasMorePast = filteredPastLessons.length > visiblePastLessons.length;

  const isYearExpanded = (year: string): boolean => {
    if (normalizedQuery) {
      return expandedYears[year] ?? true;
    }
    if (expandedYears[year] !== undefined) {
      return expandedYears[year];
    }
    return year === newestPastYear;
  };

  const toggleYear = (year: string) => {
    const currentlyOpen = isYearExpanded(year);
    setExpandedYears(prev => ({
      ...prev,
      [year]: !currentlyOpen,
    }));
  };

  const toggleReadLesson = (lessonId: string) => {
    setExpandedReadIds(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const handleChangeTextSize = (nextSize: LessonTextSize) => {
    setTextSize(nextSize);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LESSON_TEXT_SIZE_STORAGE_KEY, nextSize);
      }
    } catch {
      // Ignore storage access errors
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(PAST_PAGE_SIZE);
  };

  const renderBrowseDriveButton = () => {
    if (!browseFolderUrl) return null;
    return (
      <div className="flex justify-center">
        <a
          href={browseFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg text-sm font-semibold shadow-sm transition-colors"
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span>Browse all lessons in Google Drive</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-85" />
        </a>
      </div>
    );
  };

  return (
    <div className="motion-page-enter">
      {/* Full-width edge-to-edge hero directly below header (no dark overlay) */}
      <section
        aria-label="Sunday School Corner"
        className="relative w-full min-h-[40svh] md:min-h-[48svh] flex flex-col items-center justify-center overflow-hidden select-none"
      >
        {lessonsBannerImage ? (
          <img
            src={lessonsBannerImage}
            alt="Sunday School Corner"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ filter: `brightness(${effectiveBrightness}%)` }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-gradient-start) 0%, var(--accent-gradient-end) 100%)',
            }}
          />
        )}

        <div className="relative z-10 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 text-center space-y-3">
          <h1
            className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight leading-[1.1] text-white text-balance"
            style={{
              textShadow: '0 2px 18px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.45)',
            }}
          >
            Sunday School Corner
          </h1>
          <p
            className="text-base sm:text-xl font-normal text-white/95 max-w-2xl mx-auto leading-relaxed text-pretty"
            style={{
              textShadow: '0 1px 12px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.45)',
            }}
          >
            Lessons to read, study, and download.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {browseFolderUrl && renderBrowseDriveButton()}

        {dataLoading.portalLessons && sortedLessons.length === 0 ? (
          <div className="viewer-card p-10 flex flex-col items-center justify-center gap-3 text-sec">
            <Spinner size="md" variant="accent" />
            <span className="text-sm font-medium">Loading lessons...</span>
          </div>
        ) : sortedLessons.length === 0 ? (
          <div className="viewer-card p-8 sm:p-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-accent-tint border border-accent/20 text-accent flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-base font-medium text-sec">No lessons yet.</p>
          </div>
        ) : (
          <>
            {/* Latest Lesson */}
            {latestLesson && (() => {
              const safeLatestDriveUrl = getSafeHttpsUrl(latestLesson.driveUrl);
              const latestDownloadUrl = getGoogleDriveDownloadUrl(safeLatestDriveUrl || undefined);
              const hasLatestBody = latestSanitizedHtml.length > 0;

              return (
                <section aria-label="Latest lesson">
                  <div className="viewer-card p-6 sm:p-8 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent bg-accent-tint px-2.5 py-1 rounded-md">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Latest lesson</span>
                        </span>
                        <span className="text-sm font-medium text-sec">
                          {formatDate(latestLesson.sundayDate, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {hasLatestBody && (
                        <div
                          className="inline-flex items-center rounded-lg border border-subtle bg-canvas p-0.5"
                          role="group"
                          aria-label="Lesson text size"
                        >
                          {LESSON_TEXT_SIZE_OPTIONS.map((option) => {
                            const isActive = textSize === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleChangeTextSize(option.id)}
                                aria-pressed={isActive}
                                aria-label={option.ariaLabel}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-accent text-accent-fg shadow-2xs'
                                    : 'text-sec hover:text-main hover:bg-surface-hover'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-accent text-balance">
                        {latestLesson.title}
                      </h2>
                      {latestLesson.note && (
                        <p className="text-sm sm:text-base text-sec leading-relaxed whitespace-pre-wrap break-words">
                          {latestLesson.note}
                        </p>
                      )}
                    </div>

                    {hasLatestBody && (
                      <div className="pt-5 border-t border-subtle">
                        <SanitizedLessonBody
                          html={latestSanitizedHtml}
                          sizeClassName={LESSON_TEXT_SIZE_CLASSES[textSize]}
                        />
                      </div>
                    )}

                    {(safeLatestDriveUrl || latestDownloadUrl) && (
                      <div className="pt-1 flex flex-wrap items-center gap-3">
                        {hasLatestBody ? (
                          <>
                            {latestDownloadUrl && (
                              <a
                                href={latestDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg text-sm font-semibold shadow-sm transition-colors"
                              >
                                <Download className="w-4 h-4 shrink-0" />
                                <span>Download Word file</span>
                              </a>
                            )}

                            {safeLatestDriveUrl && (
                              <a
                                href={safeLatestDriveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main text-sm font-semibold transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 shrink-0 text-accent" />
                                <span>Open in Google Drive</span>
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {safeLatestDriveUrl && (
                              <a
                                href={safeLatestDriveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg text-sm font-semibold shadow-sm transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 shrink-0" />
                                <span>Open</span>
                              </a>
                            )}

                            {latestDownloadUrl && (
                              <a
                                href={latestDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main text-sm font-semibold transition-colors"
                              >
                                <Download className="w-4 h-4 shrink-0 text-accent" />
                                <span>Download</span>
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Past Lessons */}
            {pastLessons.length > 0 && (
              <section aria-label="Past lessons" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-main">
                    Past lessons
                  </h2>

                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-mut absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by title or date..."
                      aria-label="Search past lessons"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-subtle bg-field text-main text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => handleSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-mut hover:text-main hover:bg-subtle transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredPastLessons.length === 0 ? (
                  <div className="viewer-card p-6 text-center text-sm text-sec">
                    No matching lessons found for &ldquo;{searchQuery.trim()}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedPastByYear.map(({ year, items }) => {
                      const isOpen = isYearExpanded(year);
                      return (
                        <div key={year} className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => toggleYear(year)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-subtle text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-accent shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-mut shrink-0" />
                              )}
                              <span className="text-base font-bold text-main tabular-nums">
                                {year}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-mut tabular-nums">
                              {items.length} {items.length === 1 ? 'lesson' : 'lessons'}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="space-y-2.5">
                              {items.map((lesson) => {
                                const safeDriveUrl = getSafeHttpsUrl(lesson.driveUrl);
                                const downloadUrl = getGoogleDriveDownloadUrl(safeDriveUrl || undefined);
                                const pastSanitizedHtml = lesson.bodyHtml
                                  ? sanitizeLessonBodyHtml(lesson.bodyHtml)
                                  : '';
                                const hasBodyText = pastSanitizedHtml.length > 0;
                                const isReadingExpanded = Boolean(expandedReadIds[lesson.id]);

                                return (
                                  <div
                                    key={lesson.id}
                                    className="viewer-card p-4 sm:p-5 space-y-4"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                      <div className="min-w-0 space-y-1">
                                        <div className="text-xs font-semibold text-mut">
                                          {formatDate(lesson.sundayDate, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold text-main break-words">
                                          {lesson.title}
                                        </h3>
                                        {lesson.note && (
                                          <p className="text-xs sm:text-sm text-sec leading-relaxed whitespace-pre-wrap break-words">
                                            {lesson.note}
                                          </p>
                                        )}
                                      </div>

                                      {(hasBodyText || safeDriveUrl || downloadUrl) && (
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                          {hasBodyText && (
                                            <button
                                              type="button"
                                              onClick={() => toggleReadLesson(lesson.id)}
                                              aria-expanded={isReadingExpanded}
                                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                                isReadingExpanded
                                                  ? 'bg-accent-tint text-accent border border-accent/30'
                                                  : 'bg-accent hover:bg-accent-hover text-accent-fg shadow-2xs'
                                              }`}
                                            >
                                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                              <span>{isReadingExpanded ? 'Hide' : 'Read'}</span>
                                              {isReadingExpanded && (
                                                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                                              )}
                                            </button>
                                          )}

                                          {safeDriveUrl && (
                                            <a
                                              href={safeDriveUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                                                hasBodyText
                                                  ? 'border border-subtle bg-surface hover:bg-surface-hover text-main'
                                                  : 'bg-accent hover:bg-accent-hover text-accent-fg shadow-2xs'
                                              }`}
                                            >
                                              <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${hasBodyText ? 'text-accent' : ''}`} />
                                              <span>Open</span>
                                            </a>
                                          )}

                                          {downloadUrl && (
                                            <a
                                              href={downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main text-xs sm:text-sm font-semibold transition-colors"
                                            >
                                              <Download className="w-3.5 h-3.5 shrink-0 text-accent" />
                                              <span>Download</span>
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {isReadingExpanded && hasBodyText && (
                                      <div className="pt-4 border-t border-subtle">
                                        <SanitizedLessonBody
                                          html={pastSanitizedHtml}
                                          sizeClassName={LESSON_TEXT_SIZE_CLASSES[textSize]}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {hasMorePast && (
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setVisibleCount(prev => prev + PAST_PAGE_SIZE)}
                          className="px-5 py-2.5 rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main text-sm font-semibold transition-colors cursor-pointer"
                        >
                          Show more
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {browseFolderUrl && renderBrowseDriveButton()}
      </div>
    </div>
  );
};
