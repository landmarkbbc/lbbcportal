import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  MapPin,
  Clock,
  CalendarDays
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  toDateString,
  formatDate,
  formatTime,
  getDaysOfWeekRange,
  getServiceRecurringDates,
  formatWeekPatternBadge
} from '../lib/dateTime';
import { renderRoleIcon, isImportantRole } from '../lib/roleIcons';
import { getReadableViewerTitleColor } from '../lib/colorContrast';
import { OutlineNode, RequiredRoleSpec, RoleAssignment } from '../types';
import { PageLoading } from './LoadingIndicator';

type ScheduleFilterType = 'services' | 'activities' | 'events' | 'all';

interface ViewerOccurrenceItem {
  key: string;
  targetType: 'regular_service' | 'event';
  sourceId: string;
  kind: 'service' | 'activity' | 'event';
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  color: string;
  weekPatternBadge?: string;
  requiredRoles: RequiredRoleSpec[];
}

interface ViewerRoleRow {
  key: string;
  roleId: string;
  roleName: string;
  iconKey?: string;
  isImportant: boolean;
  personName: string;
}

function formatWeekRangeLabel(weekDates: Date[], currentYear: number): string {
  if (weekDates.length === 0) return '';
  const start = weekDates[0];
  const end = weekDates[weekDates.length - 1];
  const startStr = toDateString(start);
  const endStr = toDateString(end);

  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDate(startStr, { month: 'short', day: 'numeric', year: 'numeric' })} to ${formatDate(endStr, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  const base = `${formatDate(startStr, { month: 'short', day: 'numeric' })} to ${formatDate(endStr, { month: 'short', day: 'numeric' })}`;
  if (start.getFullYear() !== currentYear) {
    return `${base}, ${start.getFullYear()}`;
  }
  return base;
}

function buildRoleRowsForOccurrence(
  occ: ViewerOccurrenceItem,
  nodeMap: Map<string, OutlineNode>,
  occAssignments: RoleAssignment[]
): ViewerRoleRow[] {
  const importantSpecs: RequiredRoleSpec[] = [];
  const standardSpecs: RequiredRoleSpec[] = [];

  for (const spec of occ.requiredRoles) {
    const node = nodeMap.get(spec.roleId);
    if (node && isImportantRole(node)) {
      importantSpecs.push(spec);
    } else {
      standardSpecs.push(spec);
    }
  }

  const rows: ViewerRoleRow[] = [];
  const coveredRoleIds = new Set<string>();

  for (const spec of [...importantSpecs, ...standardSpecs]) {
    coveredRoleIds.add(spec.roleId);
    const node = nodeMap.get(spec.roleId);
    const important = !!(node && isImportantRole(node));
    const iconKey = node?.icon && node.icon !== 'none' ? node.icon : undefined;
    const count = Math.max(1, spec.count || 1);

    for (let slot = 0; slot < count; slot++) {
      const assignment = occAssignments.find(
        a =>
          a.roleId === spec.roleId &&
          (a.slotIndex === slot ||
            (slot === 0 && (a.slotIndex === undefined || a.slotIndex === null)))
      );

      rows.push({
        key: `${occ.key}_${spec.roleId}_${slot}`,
        roleId: spec.roleId,
        roleName: count > 1 ? `${spec.roleName} (${slot + 1})` : spec.roleName,
        iconKey,
        isImportant: important,
        personName: assignment?.personName?.trim() || ''
      });
    }
  }

  // Include any extra assigned roles saved directly via Schedules not listed in requiredRoles
  const extraAssignments = occAssignments.filter(
    a => !coveredRoleIds.has(a.roleId) && a.personName?.trim()
  );

  if (extraAssignments.length > 0) {
    const extraImportant: ViewerRoleRow[] = [];
    const extraStandard: ViewerRoleRow[] = [];

    for (let idx = 0; idx < extraAssignments.length; idx++) {
      const a = extraAssignments[idx];
      const node = nodeMap.get(a.roleId);
      const important = !!(node && isImportantRole(node));
      const iconKey = node?.icon && node.icon !== 'none' ? node.icon : undefined;
      const row: ViewerRoleRow = {
        key: `${occ.key}_extra_${a.id || `${a.roleId}_${idx}`}`,
        roleId: a.roleId,
        roleName: node?.title || a.roleName,
        iconKey,
        isImportant: important,
        personName: a.personName.trim()
      };
      if (important) {
        extraImportant.push(row);
      } else {
        extraStandard.push(row);
      }
    }

    rows.push(...extraImportant, ...extraStandard);
  }

  return rows;
}

const HighlightedName: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let startIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, startIndex);

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push(text.slice(startIndex, matchIndex));
    }
    const matched = text.slice(matchIndex, matchIndex + q.length);
    parts.push(
      <mark
        key={matchIndex}
        className="bg-accent-tint text-accent font-bold rounded px-0.5"
      >
        {matched}
      </mark>
    );
    startIndex = matchIndex + q.length;
    matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push(text.slice(startIndex));
  }

  return <>{parts}</>;
};

const FILTER_OPTIONS: { value: ScheduleFilterType; label: string }[] = [
  { value: 'services', label: 'Services' },
  { value: 'activities', label: 'Activities' },
  { value: 'events', label: 'Events' },
  { value: 'all', label: 'All' }
];

export const ViewerSchedulesView: React.FC = () => {
  const {
    regularServices,
    assignments,
    nodes,
    settings,
    overrides,
    events,
    dataLoading
  } = useData();

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [filterType, setFilterType] = useState<ScheduleFilterType>('services');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateString(today), [today]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, OutlineNode>();
    for (const n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [nodes]);

  const assignmentsByOccurrence = useMemo(() => {
    const map = new Map<string, RoleAssignment[]>();
    for (const a of assignments) {
      const k = `${a.targetId}_${a.date}`;
      const list = map.get(k);
      if (list) {
        list.push(a);
      } else {
        map.set(k, [a]);
      }
    }
    return map;
  }, [assignments]);

  const resolveTitleColor = useMemo(() => {
    return (rawColor?: string) =>
      getReadableViewerTitleColor(
        rawColor,
        settings.theme,
        settings.colorScheme,
        settings.accentColor
      );
  }, [settings.theme, settings.colorScheme, settings.accentColor]);

  const buildOccurrencesForRange = useMemo(() => {
    return (startStr: string, endStr: string): ViewerOccurrenceItem[] => {
      const items: ViewerOccurrenceItem[] = [];

      // 1. Regular Services & Activities (skipping cancelled overrides)
      for (const s of regularServices) {
        const kind: 'service' | 'activity' = s.kind === 'activity' ? 'activity' : 'service';
        if (filterType === 'services' && kind !== 'service') continue;
        if (filterType === 'activities' && kind !== 'activity') continue;
        if (filterType === 'events') continue;

        const dates = getServiceRecurringDates(startStr, endStr, s);
        const weekBadge = formatWeekPatternBadge(s);

        for (const d of dates) {
          const override = overrides.find(o => o.serviceId === s.id && o.date === d);
          if (override?.isCancelled) continue;

          items.push({
            key: `srv_${s.id}_${d}`,
            targetType: 'regular_service',
            sourceId: s.id,
            kind,
            title: override?.name || s.name,
            date: d,
            startTime: override?.startTime || s.startTime,
            endTime: override?.endTime || s.endTime,
            location: override?.location || s.location,
            color: s.color || '',
            weekPatternBadge: weekBadge || undefined,
            requiredRoles: s.requiredRoles || []
          });
        }
      }

      // 2. Non-template Calendar Events
      if (filterType === 'all' || filterType === 'events') {
        for (const ev of events) {
          if (ev.isTemplate) continue;
          if (ev.startDate < startStr || ev.startDate > endStr) continue;

          items.push({
            key: `ev_${ev.id}_${ev.startDate}`,
            targetType: 'event',
            sourceId: ev.id,
            kind: 'event',
            title: ev.title,
            date: ev.startDate,
            startTime: ev.startTime,
            endTime: ev.endTime,
            location: ev.location,
            color: ev.color || '',
            requiredRoles: ev.requiredRoles || []
          });
        }
      }

      items.sort((a, b) => {
        const dCmp = a.date.localeCompare(b.date);
        if (dCmp !== 0) return dCmp;
        const tCmp = a.startTime.localeCompare(b.startTime);
        if (tCmp !== 0) return tCmp;
        return a.title.localeCompare(b.title);
      });

      return items;
    };
  }, [regularServices, overrides, events, filterType]);

  // Sunday to Saturday dates for active week
  const weekDates = useMemo(() => {
    const ref = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + weekOffset * 7
    );
    return getDaysOfWeekRange(ref, 'sunday');
  }, [today, weekOffset]);

  const weekStartStr = useMemo(() => toDateString(weekDates[0]), [weekDates]);
  const weekEndStr = useMemo(() => toDateString(weekDates[weekDates.length - 1]), [weekDates]);
  const weekRangeLabel = useMemo(
    () => formatWeekRangeLabel(weekDates, today.getFullYear()),
    [weekDates, today]
  );

  // Week view day cards (skip empty days)
  const weekDayCards = useMemo(() => {
    const occs = buildOccurrencesForRange(weekStartStr, weekEndStr);
    const byDate = new Map<string, ViewerOccurrenceItem[]>();

    for (const occ of occs) {
      const arr = byDate.get(occ.date);
      if (arr) {
        arr.push(occ);
      } else {
        byDate.set(occ.date, [occ]);
      }
    }

    const cards: {
      dateStr: string;
      isToday: boolean;
      isPast: boolean;
      dayHeader: string;
      blocks: (ViewerOccurrenceItem & { roles: ViewerRoleRow[] })[];
    }[] = [];

    for (const d of weekDates) {
      const dateStr = toDateString(d);
      const dayOccs = byDate.get(dateStr);
      if (!dayOccs || dayOccs.length === 0) continue;

      cards.push({
        dateStr,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        dayHeader: formatDate(dateStr, { weekday: 'long', month: 'short', day: 'numeric' }),
        blocks: dayOccs.map(occ => ({
          ...occ,
          roles: buildRoleRowsForOccurrence(
            occ,
            nodeMap,
            assignmentsByOccurrence.get(`${occ.sourceId}_${occ.date}`) || []
          )
        }))
      });
    }

    return cards;
  }, [buildOccurrencesForRange, weekStartStr, weekEndStr, weekDates, todayStr, nodeMap, assignmentsByOccurrence]);

  // 8-week "Find my name" search results
  const trimmedSearch = searchQuery.trim();
  const searchResultsByDate = useMemo(() => {
    if (!trimmedSearch) return [];

    const lowerQuery = trimmedSearch.toLowerCase();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 56);
    const endStr = toDateString(endDate);
    const occs = buildOccurrencesForRange(todayStr, endStr);

    interface SearchMatch {
      key: string;
      date: string;
      occTitle: string;
      occColor: string;
      occKind: 'service' | 'activity' | 'event';
      startTime: string;
      endTime?: string;
      roleName: string;
      iconKey?: string;
      isImportant: boolean;
      personName: string;
    }

    const byDate = new Map<string, SearchMatch[]>();

    for (const occ of occs) {
      const occAssignments = assignmentsByOccurrence.get(`${occ.sourceId}_${occ.date}`) || [];
      const roles = buildRoleRowsForOccurrence(occ, nodeMap, occAssignments);

      for (const r of roles) {
        if (!r.personName) continue;
        if (!r.personName.toLowerCase().includes(lowerQuery)) continue;

        const match: SearchMatch = {
          key: `${r.key}_${r.personName}`,
          date: occ.date,
          occTitle: occ.title,
          occColor: occ.color,
          occKind: occ.kind,
          startTime: occ.startTime,
          endTime: occ.endTime,
          roleName: r.roleName,
          iconKey: r.iconKey,
          isImportant: r.isImportant,
          personName: r.personName
        };

        const list = byDate.get(occ.date);
        if (list) {
          list.push(match);
        } else {
          byDate.set(occ.date, [match]);
        }
      }
    }

    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, matches]) => ({
        dateStr,
        isToday: dateStr === todayStr,
        dayHeader: formatDate(dateStr, { weekday: 'long', month: 'short', day: 'numeric' }),
        matches
      }));
  }, [trimmedSearch, today, todayStr, buildOccurrencesForRange, assignmentsByOccurrence, nodeMap]);

  const toggleBlockExpanded = (blockKey: string) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockKey]: !prev[blockKey]
    }));
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 motion-page-enter overflow-x-hidden">
      {/* Page Title */}
      <div className="pb-4 border-b border-subtle">
        <h1 className="text-2xl font-bold tracking-tight text-main">Schedules</h1>
        <p className="text-sm text-sec mt-0.5">
          Weekly ministry rosters across services, activities, and events.
        </p>
      </div>

      {dataLoading.schedules ? (
        <PageLoading />
      ) : (
        <div className="space-y-4">
          {/* Search Box, Filter Chips & Week Navigation Bar */}
          <div className="viewer-card p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              {/* Find My Name Search */}
              <div className="relative flex-1 sm:max-w-sm min-w-0">
                <Search className="w-4 h-4 text-mut absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find my name"
                  aria-label="Find my name"
                  className="w-full min-h-[44px] sm:min-h-[40px] pl-9 pr-10 py-2 rounded-lg border border-subtle bg-field text-sm text-main placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-md text-mut hover:text-main hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Chips: Services, Activities, Events, All */}
              <div
                data-no-swipe
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Filter schedule items"
              >
                {FILTER_OPTIONS.map((opt) => {
                  const isActive = filterType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilterType(opt.value)}
                      className={`min-h-[40px] sm:min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                        isActive
                          ? 'bg-accent text-accent-contrast border-accent'
                          : 'bg-subtle/60 text-sec border-subtle hover:text-main hover:bg-subtle'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Week Navigation Row (hidden while searching across next 8 weeks) */}
            {!trimmedSearch ? (
              <div
                data-no-swipe
                className="pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWeekOffset(w => w - 1)}
                    aria-label="Previous week"
                    title="Previous week"
                    className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] inline-flex items-center justify-center rounded-lg border border-subtle bg-surface hover:bg-subtle text-sec hover:text-main transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className={`min-h-[44px] sm:min-h-[38px] px-3.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                      weekOffset === 0
                        ? 'border-accent/40 bg-accent-tint text-accent'
                        : 'border-subtle bg-surface hover:bg-subtle text-sec hover:text-main'
                    }`}
                  >
                    This week
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeekOffset(w => w + 1)}
                    aria-label="Next week"
                    title="Next week"
                    className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] inline-flex items-center justify-center rounded-lg border border-subtle bg-surface hover:bg-subtle text-sec hover:text-main transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm sm:text-base font-bold text-main tabular-nums">
                  {weekRangeLabel}
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-sec">
                <span>
                  Showing upcoming assignments for <strong className="text-main">"{trimmedSearch}"</strong> over the next 8 weeks
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-accent font-semibold hover:underline cursor-pointer"
                >
                  Back to week view
                </button>
              </div>
            )}
          </div>

          {/* Search Results View (Next 8 Weeks) */}
          {trimmedSearch ? (
            searchResultsByDate.length === 0 ? (
              <div className="viewer-card p-8 sm:p-10 text-center space-y-2">
                <Search className="w-7 h-7 text-mut mx-auto" />
                <p className="text-sm font-semibold text-main">
                  No upcoming schedule found for that name.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-4 min-h-[40px] rounded-lg border border-subtle bg-subtle/60 hover:bg-subtle text-xs font-semibold text-main transition-colors cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {searchResultsByDate.map((group) => (
                  <section
                    key={group.dateStr}
                    className={`viewer-card overflow-hidden ${
                      group.isToday ? 'border-accent/60' : ''
                    }`}
                  >
                    <div className="px-4 py-2.5 bg-subtle/50 border-b border-subtle flex items-center justify-between gap-2">
                      <h2 className="text-sm font-bold text-main">{group.dayHeader}</h2>
                      {group.isToday && (
                        <span className="px-2 py-0.5 rounded-md bg-accent-tint text-accent text-[11px] font-semibold">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-subtle">
                      {group.matches.map((m) => (
                        <div
                          key={m.key}
                          className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div
                              className="text-sm sm:text-base font-bold truncate"
                              style={{ color: resolveTitleColor(m.occColor) }}
                            >
                              {m.occTitle}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-sec tabular-nums flex-wrap">
                              <span>
                                {formatTime(m.startTime, settings.timeFormat)}
                                {m.endTime ? ` – ${formatTime(m.endTime, settings.timeFormat)}` : ''}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                {m.iconKey && (
                                  <span className="text-accent shrink-0">
                                    {renderRoleIcon(m.iconKey, 'w-3.5 h-3.5')}
                                  </span>
                                )}
                                <span className={m.isImportant ? 'font-bold text-main' : 'font-medium text-sec'}>
                                  {m.roleName}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-bold text-main shrink-0">
                            <HighlightedName text={m.personName} query={trimmedSearch} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : weekDayCards.length === 0 ? (
            /* Empty Week State */
            <div className="viewer-card p-8 sm:p-10 text-center space-y-2">
              <CalendarDays className="w-7 h-7 text-mut mx-auto" />
              <p className="text-sm font-semibold text-main">Nothing scheduled this week.</p>
            </div>
          ) : (
            /* Week View Day Cards */
            <div className="space-y-4">
              {weekDayCards.map((day) => (
                <section
                  key={day.dateStr}
                  className={`viewer-card overflow-hidden transition-opacity ${
                    day.isToday
                      ? 'border-accent/60'
                      : day.isPast
                        ? 'opacity-65'
                        : ''
                  }`}
                >
                  {/* Day Header */}
                  <div className="px-4 py-2.5 bg-subtle/50 border-b border-subtle flex items-center justify-between gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-main">
                      {day.dayHeader}
                    </h2>
                    {day.isToday && (
                      <span className="px-2 py-0.5 rounded-md bg-accent-tint text-accent text-[11px] font-semibold shrink-0">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Scheduled Service / Activity / Event Blocks */}
                  <div className="divide-y divide-subtle">
                    {day.blocks.map((block) => {
                      const isExpanded = !!expandedBlocks[block.key];
                      const hasMoreThanSix = block.roles.length > 6;
                      const visibleRoles =
                        hasMoreThanSix && !isExpanded ? block.roles.slice(0, 6) : block.roles;
                      const titleColor = resolveTitleColor(block.color);

                      return (
                        <div key={block.key} className="p-4 sm:p-5 space-y-3 min-w-0">
                          {/* Block Header: Larger, Bolder Colored Title + Time & Location */}
                          <div className="space-y-1 min-w-0">
                            <h3
                              className="text-base sm:text-lg font-bold tracking-tight truncate"
                              style={{ color: titleColor }}
                            >
                              {block.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-sec">
                              {block.startTime && (
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Clock className="w-3.5 h-3.5 text-mut shrink-0" />
                                  <span>
                                    {formatTime(block.startTime, settings.timeFormat)}
                                    {block.endTime
                                      ? ` – ${formatTime(block.endTime, settings.timeFormat)}`
                                      : ''}
                                  </span>
                                </span>
                              )}

                              {block.location && (
                                <span className="inline-flex items-center gap-1 min-w-0">
                                  <MapPin className="w-3.5 h-3.5 text-mut shrink-0" />
                                  <span className="truncate">{block.location}</span>
                                </span>
                              )}

                              {block.weekPatternBadge && (
                                <span className="text-mut">
                                  · {block.weekPatternBadge}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Roles */}
                          {block.roles.length > 0 && (
                            <div className="space-y-2">
                              {/* Phone Layout (< 768px): Single-column list with role on left and name on right */}
                              <div className="md:hidden">
                                {visibleRoles.map((role) => (
                                  <div
                                    key={role.key}
                                    className="flex items-center justify-between gap-3 py-1.5 border-b border-subtle/50 min-w-0"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {role.iconKey && (
                                        <span className="text-accent shrink-0">
                                          {renderRoleIcon(role.iconKey, 'w-3.5 h-3.5')}
                                        </span>
                                      )}
                                      <span
                                        className={`truncate text-xs ${
                                          role.isImportant
                                            ? 'font-bold text-main'
                                            : 'font-normal text-sec'
                                        }`}
                                      >
                                        {role.roleName}
                                      </span>
                                    </div>

                                    <div
                                      className={`text-[13px] text-right truncate max-w-[55%] ${
                                        role.personName
                                          ? role.isImportant
                                            ? 'font-bold text-main'
                                            : 'font-medium text-main'
                                          : 'text-mut'
                                      }`}
                                    >
                                      {role.personName || 'To be assigned'}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Tablet & Desktop Layout (>= 768px): Compact role tiles (2 small tablet, 3 medium, 4 desktop) */}
                              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                {visibleRoles.map((role) => (
                                  <div
                                    key={role.key}
                                    className="rounded-lg border border-subtle/80 bg-subtle/45 px-3 py-2 space-y-0.5 min-w-0"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {role.iconKey && (
                                        <span className="text-accent shrink-0">
                                          {renderRoleIcon(role.iconKey, 'w-3 h-3')}
                                        </span>
                                      )}
                                      <span
                                        className={`truncate text-[11px] leading-tight ${
                                          role.isImportant
                                            ? 'font-bold text-sec'
                                            : 'font-medium text-mut'
                                        }`}
                                      >
                                        {role.roleName}
                                      </span>
                                    </div>

                                    <div
                                      className={`truncate text-sm leading-snug ${
                                        role.personName
                                          ? role.isImportant
                                            ? 'font-bold text-main'
                                            : 'font-semibold text-main'
                                          : 'font-normal text-mut'
                                      }`}
                                    >
                                      {role.personName || 'To be assigned'}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {hasMoreThanSix && (
                                <button
                                  type="button"
                                  onClick={() => toggleBlockExpanded(block.key)}
                                  className="min-h-[36px] text-xs font-semibold text-accent hover:underline cursor-pointer inline-flex items-center"
                                >
                                  {isExpanded ? 'Show fewer' : `Show all (${block.roles.length})`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
