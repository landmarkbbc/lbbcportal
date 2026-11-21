import {
  TimeFormat,
  WeekStartDay,
  RegularService,
  WeekOfMonthPattern,
  WeekOfMonthValue
} from '../types';

/**
 * Format a 24-hour time string ("14:30") into user format ("2:30 PM" or "14:30")
 */
export function formatTime(timeStr?: string, format: TimeFormat = '12h'): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');

  if (isNaN(hours)) return timeStr;

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Format a YYYY-MM-DD string into a localized readable date
 */
export function formatDate(dateStr: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, options);
}

/**
 * Get date string in YYYY-MM-DD for a given Date in local time
 */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today in YYYY-MM-DD local time
 */
export function getTodayString(): string {
  return toDateString(new Date());
}

/**
 * Parse YYYY-MM-DD to a local Date object
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if two time intervals overlap on the same day
 */
export function doTimesOverlap(
  startA: string,
  endA: string | undefined,
  startB: string,
  endB: string | undefined
): boolean {
  if (!startA || !startB) return false;

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const aStart = toMinutes(startA);
  // Default end time to 90 minutes after start if not specified
  const aEnd = endA ? toMinutes(endA) : aStart + 90;

  const bStart = toMinutes(startB);
  const bEnd = endB ? toMinutes(endB) : bStart + 90;

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Shared helper answering: "Does this regular service/activity occur on this date?"
 * Handles optional weekPattern ('every' | 'only' | 'except') and weekNumbers (1 | 2 | 3 | 4 | 'last').
 * Services/activities without weekPattern default to 'every'.
 */
export function doesRegularServiceOccurOnDate(
  service: Pick<RegularService, 'daysOfWeek' | 'weekPattern' | 'weekNumbers'>,
  dateOrStr: Date | string
): boolean {
  const date = typeof dateOrStr === 'string' ? parseDateString(dateOrStr) : dateOrStr;
  if (!service.daysOfWeek || !service.daysOfWeek.includes(date.getDay())) {
    return false;
  }

  const pattern: WeekOfMonthPattern = service.weekPattern || 'every';
  if (pattern === 'every') {
    return true;
  }

  const weekNumbers = service.weekNumbers || [];
  const dayOfMonth = date.getDate();
  const occurrenceNum = Math.ceil(dayOfMonth / 7);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const isLast = dayOfMonth + 7 > daysInMonth;

  const matchesWeek =
    weekNumbers.includes(occurrenceNum as WeekOfMonthValue) ||
    (isLast && weekNumbers.includes('last'));

  if (pattern === 'only') {
    return matchesWeek;
  }

  // pattern === 'except'
  return !matchesWeek;
}

/**
 * Get all dates between start and end (inclusive) matching given days of week (0=Sun, 6=Sat)
 */
export function getRecurringDates(
  startDateStr: string,
  endDateStr: string,
  daysOfWeek: number[]
): string[] {
  const result: string[] = [];
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);

  const curr = new Date(start);
  while (curr <= end) {
    if (daysOfWeek.includes(curr.getDay())) {
      result.push(toDateString(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

/**
 * Get all dates between start and end (inclusive) where a RegularService/Activity occurs,
 * applying both daysOfWeek and optional week-of-month pattern via doesRegularServiceOccurOnDate.
 */
export function getServiceRecurringDates(
  startDateStr: string,
  endDateStr: string,
  service: Pick<RegularService, 'daysOfWeek' | 'weekPattern' | 'weekNumbers'>
): string[] {
  const result: string[] = [];
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);

  const curr = new Date(start);
  while (curr <= end) {
    if (doesRegularServiceOccurOnDate(service, curr)) {
      result.push(toDateString(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

/**
 * Return the next `count` matching YYYY-MM-DD dates for a RegularService/Activity starting from `fromDate`.
 */
export function getNextServiceDates(
  service: Pick<RegularService, 'daysOfWeek' | 'weekPattern' | 'weekNumbers'>,
  count = 3,
  fromDate: Date = new Date()
): string[] {
  const result: string[] = [];
  if (!service.daysOfWeek || service.daysOfWeek.length === 0) return result;
  if (service.weekPattern === 'only' && (!service.weekNumbers || service.weekNumbers.length === 0)) {
    return result;
  }

  const curr = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 400 && result.length < count; i++) {
    if (doesRegularServiceOccurOnDate(service, curr)) {
      result.push(toDateString(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

const FULL_WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_ORDER: WeekOfMonthValue[] = [1, 2, 3, 4, 'last'];

function sortWeekValues(weeks: WeekOfMonthValue[]): WeekOfMonthValue[] {
  return [...new Set(weeks)].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
}

function weekValueToWord(w: WeekOfMonthValue, lowercaseLast = true): string {
  if (w === 'last') return lowercaseLast ? 'last' : 'Last';
  if (w === 1) return '1st';
  if (w === 2) return '2nd';
  if (w === 3) return '3rd';
  return '4th';
}

function joinWithConjunction(items: string[], conjunction: string): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

/**
 * Plain-language summary for the Activity editor modal (e.g., "Occurs: every Friday except the last Friday of the month").
 */
export function formatWeekPatternSummary(
  daysOfWeek: number[],
  weekPattern: WeekOfMonthPattern = 'every',
  weekNumbers: WeekOfMonthValue[] = []
): string {
  const sortedDays = [...new Set(daysOfWeek)].sort((a, b) => a - b);
  const dayNames = sortedDays.map(d => FULL_WEEKDAY_NAMES[d]).filter(Boolean);
  if (dayNames.length === 0) return '';

  const daysText = joinWithConjunction(dayNames, 'and');

  if (weekPattern === 'every') {
    return `Occurs: every ${daysText}`;
  }

  const sortedWeeks = sortWeekValues(weekNumbers);
  if (sortedWeeks.length === 0) {
    return '';
  }

  const weekWords = sortedWeeks.map(w => weekValueToWord(w, true));
  const weeksText = joinWithConjunction(weekWords, 'and');

  if (weekPattern === 'only') {
    return `Occurs: the ${weeksText} ${daysText} of the month`;
  }

  // 'except'
  if (sortedDays.length === 1) {
    return `Occurs: every ${daysText} except the ${weeksText} ${daysText} of the month`;
  }
  return `Occurs: every ${daysText} except the ${weeksText} of the month`;
}

/**
 * Compact badge/label shown wherever activity details are displayed (e.g., "Last Friday of the month", "Every Friday except the last").
 * Returns empty string for 'every' (or unset) so standard weekly services/activities show nothing extra.
 */
export function formatWeekPatternBadge(
  service: Pick<RegularService, 'daysOfWeek' | 'weekPattern' | 'weekNumbers'>
): string {
  const pattern = service.weekPattern || 'every';
  if (pattern === 'every') return '';

  const sortedWeeks = sortWeekValues(service.weekNumbers || []);
  if (sortedWeeks.length === 0) return '';

  const sortedDays = [...new Set(service.daysOfWeek || [])].sort((a, b) => a - b);
  const dayNames = sortedDays.length === 1
    ? [FULL_WEEKDAY_NAMES[sortedDays[0]]]
    : sortedDays.map(d => SHORT_WEEKDAY_NAMES[d]).filter(Boolean);
  if (dayNames.length === 0) return '';

  const daysText = joinWithConjunction(dayNames, '&');

  if (pattern === 'only') {
    if (sortedWeeks.length === 1 && sortedWeeks[0] === 'last') {
      return `Last ${daysText} of the month`;
    }
    const weeksText = joinWithConjunction(sortedWeeks.map(w => weekValueToWord(w, true)), '&');
    return `${weeksText} ${daysText} of the month`;
  }

  // 'except'
  if (sortedWeeks.length === 1 && sortedWeeks[0] === 'last') {
    return `Every ${daysText} except the last`;
  }
  const hasOnlyOrdinal = !sortedWeeks.includes('last') && sortedWeeks.length === 1;
  const weeksText = joinWithConjunction(sortedWeeks.map(w => weekValueToWord(w, true)), '&');
  return hasOnlyOrdinal
    ? `Every ${daysText} except the ${weeksText}`
    : `Every ${daysText} except ${weeksText}`;
}

/**
 * Get 7 days for a week view starting from weekStartDay
 */
export function getDaysOfWeekRange(referenceDate: Date, weekStart: WeekStartDay = 'sunday'): Date[] {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday

  const targetStart = weekStart === 'sunday' ? 0 : 1;
  const diff = (day - targetStart + 7) % 7;
  d.setDate(d.getDate() - diff);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    week.push(next);
  }
  return week;
}

/**
 * Get calendar grid cells for a month view
 */
export function getMonthGrid(year: number, month: number, weekStart: WeekStartDay = 'sunday'): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const startDayIdx = firstDay.getDay();

  const targetStart = weekStart === 'sunday' ? 0 : 1;
  const leadingDays = (startDayIdx - targetStart + 7) % 7;

  const grid: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = leadingDays; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    grid.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  for (let i = 1; i <= totalDays; i++) {
    grid.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month leading days to complete full 7-day rows (up to 35 or 42 cells)
  const remaining = 7 - (grid.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      grid.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }

  return grid;
}

/**
 * Returns date range { start: "YYYY-MM-01", end: "YYYY-MM-last" } for a month relative to now.
 * offsetMonths = 0 is "This month", 1 is "Next month"
 */
export function getMonthDateRange(offsetMonths: number = 0): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offsetMonths;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    start: toDateString(firstDay),
    end: toDateString(lastDay)
  };
}

/**
 * Calculates the next period date range based on an existing start and end date.
 * If the period spans a month (e.g. 1st to last of month), rolls to the next full month.
 * Otherwise, advances by the same duration.
 */
export function getNextPeriodDateRange(startDateStr: string, endDateStr: string): { start: string; end: string } {
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);

  const isStartOfMonth = start.getDate() === 1;
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  const isEndOfMonth = nextDay.getDate() === 1;

  if (isStartOfMonth && isEndOfMonth) {
    const monthsSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const newStart = new Date(start.getFullYear(), start.getMonth() + monthsSpan, 1);
    const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + monthsSpan, 0);
    return {
      start: toDateString(newStart),
      end: toDateString(newEnd)
    };
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const nextStart = new Date(end);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + (diffDays - 1));

  return {
    start: toDateString(nextStart),
    end: toDateString(nextEnd)
  };
}

/**
 * Format "YYYY-MM" to a short month chip label, e.g. "Nov 2026"
 */
export function formatMonthChip(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * Format "YYYY-MM" to a full month label, e.g. "November 2026"
 */
export function formatMonthLong(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Get start date (first day) of "YYYY-MM", e.g. "2026-11-01"
 */
export function getMonthStartDate(ym: string): string {
  return `${ym}-01`;
}

/**
 * Get end date (last day) of "YYYY-MM", e.g. "2026-11-30"
 */
export function getMonthEndDate(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const lastDay = new Date(y, m, 0).getDate();
  return `${ym}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Format a list of "YYYY-MM" months into a clean summary, e.g. "Nov 2026 – Jan 2027"
 */
export function formatMonthsSummary(months: string[]): string {
  if (!months || months.length === 0) return 'No months';
  const sorted = [...months].sort();
  if (sorted.length === 1) {
    return formatMonthChip(sorted[0]);
  }
  const first = formatMonthChip(sorted[0]);
  const last = formatMonthChip(sorted[sorted.length - 1]);
  return `${first} – ${last}`;
}

/**
 * Returns all "YYYY-MM" strings spanning between two dates
 */
export function getMonthsBetweenDates(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr) return [];
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  const result: string[] = [];
  const curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (curr <= endMonth) {
    const ym = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
    if (!result.includes(ym)) {
      result.push(ym);
    }
    curr.setMonth(curr.getMonth() + 1);
  }
  return result;
}

/**
 * Format ISO timestamp into a readable date and 12-hour time (e.g. "Nov 8, 2026 at 6:05 PM")
 */
export function formatNoteDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;

  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${datePart} at ${timePart}`;
}


