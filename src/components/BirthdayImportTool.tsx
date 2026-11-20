import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Cake,
  CheckCircle2,
  Eye,
  HelpCircle,
  RotateCw,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Person } from '../types';
import { Spinner } from './LoadingIndicator';

interface ImportSeedEntry {
  id: string;
  firstName: string;
  lastName: string;
  month: number;
  day: number;
  mmdd: string;
}

type ImportAction = 'Add' | 'Add birthday' | 'Skip' | 'Conflict' | 'Check';

interface PreviewRow {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  month: number;
  day: number;
  mmdd: string;
  action: ImportAction;
  matchedPerson?: Person;
  nearMatches?: Person[];
  detailText?: string;
}

interface FailedRowResult {
  row: PreviewRow;
  error: string;
}

interface ImportReport {
  addedCount: number;
  addedBirthdayCount: number;
  skippedCount: number;
  conflictCount: number;
  checkCount: number;
  failed: FailedRowResult[];
}

const RAW_BIRTHDAY_ROWS: readonly [string, string, string][] = [
  ['Janet', 'Gabriel', '01-01'],
  ['Gregory', 'Gayob', '01-05'],
  ['Jhermaigne Dallas', 'Masiong', '01-07'],
  ['Hilario', 'Ba-a', '01-13'],
  ['Maris', 'Sabidra', '01-13'],
  ['Dalton', 'Teliao', '01-25'],
  ['Alfa', 'Bugtong', '01-25'],
  ['Hans', 'Degay', '01-27'],
  ['John Ernest', 'Balajadia', '01-29'],
  ['Leonard John', 'Dela Cruz', '01-31'],
  ['Josiah Dale', 'Teliao', '02-14'],
  ['Euri Vaness', 'Tamo-oy', '02-14'],
  ['Jeniza', 'Gabriel', '02-16'],
  ['Claus', 'Esden', '02-21'],
  ['Randolf', 'Dao-ines', '03-01'],
  ['Kej', 'Gabriel', '03-11'],
  ['Edmar', 'Lid-ayan', '03-14'],
  ['Aurelio', 'Esden Sr.', '03-15'],
  ['Jadon Zach', 'Tamo-oy', '03-15'],
  ['Kesler', 'Gabriel', '03-24'],
  ['Jessica', 'Villalon', '03-28'],
  ['Raziel Rio', 'Tamo-oy', '04-02'],
  ['Jhaedrick Dyllan', 'Masiong', '04-08'],
  ['Ithamar', 'Angway', '04-11'],
  ['Chloe Cassandra', 'Esden', '04-15'],
  ['Rechel', 'Dao-ines', '04-16'],
  ['Zenaida', 'King', '04-22'],
  ['Annie', 'Gayob', '04-30'],
  ['Shaira', 'Wacat', '05-02'],
  ['Shirlyn', 'Angway', '05-06'],
  ['Raidon', 'Angway', '05-11'],
  ['Lourdes', 'Villalon', '05-16'],
  ['Eva', 'Mayos', '05-18'],
  ['Jocelyn', 'Abad', '05-20'],
  ['Jessel', 'Cosning', '05-22'],
  ['Agnes Anne', 'Tamo-oy', '05-22'],
  ['Mayo', 'Carias', '05-25'],
  ['Tom Jones', 'Laban', '05-26'],
  ['Jericho', 'Lid-ayan', '06-06'],
  ['Imee', 'Teliao', '06-15'],
  ['Almo', 'Almendres', '06-17'],
  ['Thessa', 'Austria', '06-17'],
  ['Easan Sondel', 'Paayas', '06-20'],
  ['Robelyn', 'Baliked', '06-27'],
  ['Jovelle', 'Mayos', '06-28'],
  ['Hardy', 'Gayob', '07-09'],
  ['Claus David', 'Esden', '07-26'],
  ['Salvador', 'Salaver', '08-01'],
  ['Aldrin', 'Legueb', '08-08'],
  ['Genevie', 'Wacat', '08-19'],
  ['Hannah Grail', 'Lagasi', '08-20'],
  ['Jimmy', 'Balintag', '08-21'],
  ['Janette', 'Ba-a', '08-27'],
  ['Hazel', 'Albis', '09-03'],
  ['Bess', 'Lid-ayan', '09-03'],
  ['Kjay', 'Ba-a', '09-09'],
  ['Leah', 'Kidao', '09-10'],
  ['Jea', 'Gabriel', '09-13'],
  ['John Danver', 'Masiong', '09-16'],
  ['Shinar', 'Esden', '09-17'],
  ['Domingo', 'Cosning', '09-19'],
  ['Christine', 'Laban', '09-22'],
  ['Hyesen', 'Lid-ayan', '09-24'],
  ['Daniel Kurt', 'Teliao', '09-30'],
  ['Helen', 'Beniasan', '10-04'],
  ['Mercedes', 'Cosning', '10-06'],
  ['Genevieve', 'Degay', '10-10'],
  ['Crish Lavigne', 'Angway', '10-16'],
  ['Hannah Grace', 'Teliao', '10-17'],
  ['Kurt Andy', 'Ba-a', '10-18'],
  ['Janice', 'Balolang', '10-27'],
  ['Aleyah Lavelle', 'Angway', '10-28'],
  ['Jocelyn', 'Laruan', '11-01'],
  ['Eduard', 'Tomlayen Sr.', '11-06'],
  ['Helen', 'As-il', '11-11'],
  ['Cynthia', 'Mayos', '11-14'],
  ['Joyce', 'Amgao', '11-17'],
  ['Louie', 'Cawaing', '11-17'],
  ['Maylen', 'Cawaing', '11-19'],
  ['Mckeenia', 'Casionan', '11-19'],
  ['Annicka Avi', 'Liongson', '11-21'],
  ['Shawn Wayne', 'Bassit', '11-27'],
  ['Victoria', 'Liongson', '12-01'],
  ['Joy', 'Masiong', '12-04'],
  ['Margie', 'Balolang', '12-04'],
  ['Dixon', 'Lid-ayan', '12-05'],
  ['Velanie', 'Dao-ines', '12-05'],
  ['Menia', 'Lid-ayan', '12-12'],
  ['Michael', 'Wacay', '12-22'],
];

const BIRTHDAY_IMPORT_LIST: ImportSeedEntry[] = RAW_BIRTHDAY_ROWS.map(([firstName, lastName, mmdd], idx) => {
  const [mStr, dStr] = mmdd.split('-');
  return {
    id: `bday_import_${idx}`,
    firstName,
    lastName,
    month: parseInt(mStr, 10),
    day: parseInt(dStr, 10),
    mmdd,
  };
});

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TITLE_REGEX = /^(bro|sis|ptr|pr)\.?\s+/i;
const SUFFIX_SET = new Set(['sr', 'jr', 'ii', 'iii', 'iv']);

function formatMonthDay(month?: number, day?: number): string {
  if (!month || !day) return '';
  const m = SHORT_MONTHS[month - 1] || '';
  return `${m} ${day}`;
}

function stripLeadingTitles(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  while (TITLE_REGEX.test(s)) {
    s = s.replace(TITLE_REGEX, '').trim();
  }
  return s;
}

interface ParsedName {
  rawTokens: string[];
  tokensNoInitials: string[];
  tokensNoSuffix: string[];
  suffix: string;
  canonicalKey: string;
}

function parseComparableName(rawName: string): ParsedName {
  const withoutTitle = stripLeadingTitles(rawName).toLowerCase();
  const rawTokens = withoutTitle
    .split(/\s+/)
    .map(t => t.replace(/\.+$/, '').trim())
    .filter(Boolean);

  let suffix = '';
  let coreTokens = [...rawTokens];
  if (coreTokens.length >= 2 && SUFFIX_SET.has(coreTokens[coreTokens.length - 1])) {
    suffix = coreTokens.pop()!;
  }

  // Drop single-letter middle initials (keep first token and last token(s))
  const noInitialsCore = coreTokens.filter((tok, idx) => {
    if (idx === 0 || idx === coreTokens.length - 1) return true;
    return !/^[a-z]$/.test(tok);
  });

  const tokensNoInitials = suffix ? [...noInitialsCore, suffix] : [...noInitialsCore];
  return {
    rawTokens,
    tokensNoInitials,
    tokensNoSuffix: noInitialsCore,
    suffix,
    canonicalKey: tokensNoInitials.join(' '),
  };
}

function collapsePunctuation(str: string): string {
  return str.toLowerCase().replace(/[\s\-.'’]+/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function isVerySimilarFirstName(
  importFirstRaw: string,
  dbRawTokens: string[],
  dbFirstTokens: string[],
  importSuffix: string,
  dbSuffix: string
): boolean {
  const impFirst = importFirstRaw.toLowerCase().replace(/\./g, '').trim();
  const dbFirst = dbFirstTokens.join(' ').toLowerCase().trim();
  if (!impFirst || !dbFirst) return false;

  // Same first and last name, differing only by suffix (e.g. "Aurelio Esden" vs "Aurelio Esden Sr.")
  if (impFirst === dbFirst && importSuffix !== dbSuffix) {
    return true;
  }

  // Collapsed spacing/hyphen difference (e.g. "Tom Jones" vs "Tomjones", "Kjay" vs "K-Jay")
  const impCol = collapsePunctuation(impFirst);
  const dbCol = collapsePunctuation(dbFirst);
  if (impCol === dbCol) return true;

  // Multi-word first name where DB has first name + initial of second name (e.g. "John E." vs "John Ernest")
  const impWords = impFirst.split(/\s+/).filter(Boolean);
  if (impWords.length >= 2 && dbRawTokens.length >= 3) {
    const dbCoreFirst = dbRawTokens[0];
    const dbMaybeInit = dbRawTokens[1];
    if (dbCoreFirst === impWords[0] && /^[a-z]$/.test(dbMaybeInit) && impWords[1].startsWith(dbMaybeInit)) {
      return true;
    }
  }

  // Edit distance check for close spelling variants on full first name
  const dist = levenshtein(impCol, dbCol);
  const maxLen = Math.max(impCol.length, dbCol.length);
  if (maxLen <= 4) return dist <= 1;
  if (maxLen <= 8) return dist <= 2;
  return dist <= 3;
}

function splitDbFirstForImportLast(dbTokensNoSuffix: string[], importLastStr: string): string[] | null {
  const impLastParsed = parseComparableName(importLastStr);
  const impLastTokens = impLastParsed.tokensNoSuffix;
  if (impLastTokens.length === 0 || dbTokensNoSuffix.length <= impLastTokens.length) {
    // Also support collapsed multi-word last name like "Delacruz" vs "Dela Cruz"
    if (impLastTokens.length > 1 && dbTokensNoSuffix.length >= 2) {
      const dbLastCol = collapsePunctuation(dbTokensNoSuffix[dbTokensNoSuffix.length - 1]);
      const impLastCol = collapsePunctuation(impLastTokens.join(' '));
      if (dbLastCol === impLastCol) {
        return dbTokensNoSuffix.slice(0, -1);
      }
    }
    return null;
  }

  const candidateLast = dbTokensNoSuffix.slice(dbTokensNoSuffix.length - impLastTokens.length);
  const matchesLast = candidateLast.every((tok, idx) => collapsePunctuation(tok) === collapsePunctuation(impLastTokens[idx]));
  if (matchesLast) {
    return dbTokensNoSuffix.slice(0, dbTokensNoSuffix.length - impLastTokens.length);
  }

  return null;
}

function buildPreviewRows(people: Person[]): PreviewRow[] {
  const parsedPeople = people.map(person => ({
    person,
    parsed: parseComparableName(person.name || ''),
  }));

  return BIRTHDAY_IMPORT_LIST.map((entry) => {
    const fullName = `${entry.firstName} ${entry.lastName}`;
    const importParsed = parseComparableName(fullName);

    // 1. Exact match (case-insensitive, ignoring extra spaces, titles, middle initials)
    const exactMatch = parsedPeople.find(p => p.parsed.canonicalKey === importParsed.canonicalKey);

    if (exactMatch) {
      const person = exactMatch.person;
      const hasExistingBirthday =
        typeof person.birthdayMonth === 'number' &&
        person.birthdayMonth >= 1 &&
        person.birthdayMonth <= 12 &&
        typeof person.birthdayDay === 'number' &&
        person.birthdayDay >= 1 &&
        person.birthdayDay <= 31;

      if (!hasExistingBirthday) {
        return {
          ...entry,
          fullName,
          action: 'Add birthday',
          matchedPerson: person,
          detailText: `Matched: ${person.name}`,
        };
      }

      if (person.birthdayMonth === entry.month && person.birthdayDay === entry.day) {
        return {
          ...entry,
          fullName,
          action: 'Skip',
          matchedPerson: person,
          detailText: `Matched: ${person.name} (same birthday)`,
        };
      }

      return {
        ...entry,
        fullName,
        action: 'Conflict',
        matchedPerson: person,
        detailText: `Matched: ${person.name} (existing: ${formatMonthDay(person.birthdayMonth, person.birthdayDay)})`,
      };
    }

    // 2. Possible near-match (same last name & very similar first name)
    const nearMatches = parsedPeople
      .filter(({ parsed }) => {
        const dbFirstTokens = splitDbFirstForImportLast(parsed.tokensNoSuffix, entry.lastName);
        if (!dbFirstTokens) return false;
        return isVerySimilarFirstName(
          entry.firstName,
          parsed.rawTokens,
          dbFirstTokens,
          importParsed.suffix,
          parsed.suffix
        );
      })
      .map(p => p.person);

    if (nearMatches.length > 0) {
      return {
        ...entry,
        fullName,
        action: 'Check',
        nearMatches,
        detailText: `Possible match: ${nearMatches
          .map(p =>
            p.birthdayMonth && p.birthdayDay
              ? `${p.name} (${formatMonthDay(p.birthdayMonth, p.birthdayDay)})`
              : p.name
          )
          .join(', ')}`,
      };
    }

    // 3. No match -> Add new member
    return {
      ...entry,
      fullName,
      action: 'Add',
      detailText: 'New member (name & birthday only)',
    };
  });
}

function ActionBadge({ action }: { action: ImportAction }) {
  switch (action) {
    case 'Add':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
          Add
        </span>
      );
    case 'Add birthday':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
          Add birthday
        </span>
      );
    case 'Skip':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-subtle text-sec border border-subtle">
          Skip
        </span>
      );
    case 'Conflict':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25">
          Conflict
        </span>
      );
    case 'Check':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
          Check
        </span>
      );
  }
}

export const BirthdayImportTool: React.FC = () => {
  const { isViewer } = useAuth();
  const { people, addPerson, updatePerson } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [filterAction, setFilterAction] = useState<'ALL' | ImportAction>('ALL');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<ImportReport | null>(null);

  const peopleRef = useRef<Person[]>(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  if (isViewer) return null;

  const openModal = () => {
    setIsOpen(true);
    setPreviewRows(null);
    setFilterAction('ALL');
    setProgress(null);
    setSavedIds({});
    setReport(null);
  };

  const closeModal = () => {
    if (isImporting) return;
    setIsOpen(false);
  };

  const handleGeneratePreview = () => {
    if (isImporting) return;
    const rows = buildPreviewRows(peopleRef.current);
    setPreviewRows(rows);
    setFilterAction('ALL');
    setProgress(null);
    setSavedIds({});
    setReport(null);
  };

  const executeWriteBatch = async (
    rowsToProcess: PreviewRow[],
    allRows: PreviewRow[],
    priorAdded: number,
    priorAddedBirthday: number
  ) => {
    setIsImporting(true);
    setProgress({ done: 0, total: rowsToProcess.length });

    let addedCount = priorAdded;
    let addedBirthdayCount = priorAddedBirthday;
    const failed: FailedRowResult[] = [];

    // Keep track of canonical names created in this run to prevent duplicates even across rapid retries
    const existingKeys = new Set(
      peopleRef.current.map(p => parseComparableName(p.name || '').canonicalKey)
    );

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      try {
        if (row.action === 'Add') {
          const rowKey = parseComparableName(row.fullName).canonicalKey;
          if (!existingKeys.has(rowKey)) {
            await addPerson(row.fullName, {
              birthdayMonth: row.month,
              birthdayDay: row.day,
            });
            existingKeys.add(rowKey);
          }
          addedCount++;
          setSavedIds(prev => ({ ...prev, [row.id]: true }));
        } else if (row.action === 'Add birthday' && row.matchedPerson) {
          await updatePerson(row.matchedPerson.id, {
            birthdayMonth: row.month,
            birthdayDay: row.day,
          });
          addedBirthdayCount++;
          setSavedIds(prev => ({ ...prev, [row.id]: true }));
        }
      } catch (err: any) {
        failed.push({
          row,
          error: err?.message || 'Failed to save to Firestore.',
        });
      }
      setProgress({ done: i + 1, total: rowsToProcess.length });
    }

    setReport({
      addedCount,
      addedBirthdayCount,
      skippedCount: allRows.filter(r => r.action === 'Skip').length,
      conflictCount: allRows.filter(r => r.action === 'Conflict').length,
      checkCount: allRows.filter(r => r.action === 'Check').length,
      failed,
    });
    setIsImporting(false);
  };

  const handleConfirmImport = async () => {
    if (!previewRows || isImporting) return;
    const actionable = previewRows.filter(
      r => (r.action === 'Add' || r.action === 'Add birthday') && !savedIds[r.id]
    );
    if (actionable.length === 0) return;

    await executeWriteBatch(
      actionable,
      previewRows,
      report?.addedCount || 0,
      report?.addedBirthdayCount || 0
    );
  };

  const handleRetryFailed = async () => {
    if (!previewRows || !report || report.failed.length === 0 || isImporting) return;
    const failedRows = report.failed.map(f => f.row);
    await executeWriteBatch(
      failedRows,
      previewRows,
      report.addedCount,
      report.addedBirthdayCount
    );
  };

  const counts = previewRows
    ? {
        Add: previewRows.filter(r => r.action === 'Add').length,
        'Add birthday': previewRows.filter(r => r.action === 'Add birthday').length,
        Skip: previewRows.filter(r => r.action === 'Skip').length,
        Conflict: previewRows.filter(r => r.action === 'Conflict').length,
        Check: previewRows.filter(r => r.action === 'Check').length,
      }
    : null;

  const pendingActionableCount = previewRows
    ? previewRows.filter(
        r => (r.action === 'Add' || r.action === 'Add birthday') && !savedIds[r.id]
      ).length
    : 0;

  const visibleRows = previewRows
    ? filterAction === 'ALL'
      ? previewRows
      : previewRows.filter(r => r.action === filterAction)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <Cake className="w-4 h-4 text-accent" />
        <span>Import birthdays</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-surface border border-subtle shadow-xl text-main overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-subtle flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent-tint text-accent flex items-center justify-center shrink-0">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-main">Import birthdays</h3>
                  <p className="text-xs text-sec">
                    {BIRTHDAY_IMPORT_LIST.length} members prepared · Adds missing members &amp; fills missing birthdays only
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={closeModal}
                className="p-1.5 rounded-lg text-mut hover:text-main hover:bg-subtle transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {!previewRows && (
                <div className="rounded-xl bg-subtle/60 border border-subtle p-5 text-center space-y-3">
                  <p className="text-sm text-main font-medium">
                    Ready to compare the {BIRTHDAY_IMPORT_LIST.length} names and birthdays against your {people.length} current members.
                  </p>
                  <p className="text-xs text-sec max-w-lg mx-auto leading-relaxed">
                    Press <strong>Preview</strong> first to inspect every match, conflict, and near-match. Nothing is saved to Firestore until you press <strong>Confirm import</strong>.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleGeneratePreview}
                      className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Final Report Banner */}
              {report && (
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    report.failed.length > 0
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {report.failed.length > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <h4 className="text-sm font-bold text-main">
                        {report.failed.length > 0
                          ? 'Import completed with some failures'
                          : 'Import Saved & Confirmed by Firestore'}
                      </h4>
                    </div>
                    {report.failed.length > 0 && (
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={handleRetryFailed}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                        <span>Retry failed ({report.failed.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Added (Saved)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{report.addedCount}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Birthdays (Saved)</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{report.addedBirthdayCount}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Skipped</span>
                      <span className="font-bold text-main">{report.skippedCount}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Conflicts</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{report.conflictCount}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Checks</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{report.checkCount}</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-subtle">
                      <span className="text-mut block text-[11px]">Failed</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{report.failed.length}</span>
                    </div>
                  </div>

                  {report.failed.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                        Failed items:
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {report.failed.map((item) => (
                          <div
                            key={item.row.id}
                            className="px-3 py-1.5 rounded-lg bg-surface border border-red-500/30 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-main">
                              {item.row.fullName} ({item.row.mmdd}) — {item.row.action}
                            </span>
                            <span className="text-red-600 dark:text-red-400 truncate max-w-[260px]" title={item.error}>
                              {item.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Counts + Filter + Table */}
              {previewRows && counts && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterAction('ALL')}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        filterAction === 'ALL'
                          ? 'border-accent bg-accent-tint text-accent'
                          : 'border-subtle bg-subtle/50 text-main hover:bg-subtle'
                      }`}
                    >
                      <span className="block text-[11px] opacity-80">All</span>
                      <span className="text-base font-bold tabular-nums">{previewRows.length}</span>
                    </button>

                    {(
                      [
                        { key: 'Add' as ImportAction, color: 'text-emerald-600 dark:text-emerald-400' },
                        { key: 'Add birthday' as ImportAction, color: 'text-blue-600 dark:text-blue-400' },
                        { key: 'Skip' as ImportAction, color: 'text-sec' },
                        { key: 'Conflict' as ImportAction, color: 'text-red-600 dark:text-red-400' },
                        { key: 'Check' as ImportAction, color: 'text-amber-600 dark:text-amber-400' },
                      ] as const
                    ).map(({ key, color }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilterAction(filterAction === key ? 'ALL' : key)}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          filterAction === key
                            ? 'border-accent bg-accent-tint'
                            : 'border-subtle bg-subtle/50 hover:bg-subtle'
                        }`}
                      >
                        <span className="block text-[11px] text-sec truncate">{key}</span>
                        <span className={`text-base font-bold tabular-nums ${color}`}>
                          {counts[key]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="rounded-xl border border-subtle overflow-hidden">
                    <div className="max-h-[45vh] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-subtle border-b border-subtle z-10">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold text-sec">Name</th>
                            <th className="py-2.5 px-3 font-semibold text-sec whitespace-nowrap">Birthday</th>
                            <th className="py-2.5 px-3 font-semibold text-sec text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle bg-surface">
                          {visibleRows.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-mut italic">
                                No rows match "{filterAction}".
                              </td>
                            </tr>
                          ) : (
                            visibleRows.map((row) => {
                              const isRowSaved = Boolean(savedIds[row.id]);
                              const failedEntry = report?.failed.find(f => f.row.id === row.id);
                              return (
                                <tr key={row.id} className="hover:bg-subtle/40 transition-colors">
                                  <td className="py-2 px-3 align-top">
                                    <div className="font-semibold text-main">{row.fullName}</div>
                                    {row.detailText && (
                                      <div className="text-[11px] text-sec mt-0.5 flex items-start gap-1">
                                        {row.action === 'Check' && <HelpCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />}
                                        {row.action === 'Conflict' && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />}
                                        <span>{row.detailText}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 align-top whitespace-nowrap">
                                    <span className="font-medium text-main">
                                      {formatMonthDay(row.month, row.day)}
                                    </span>
                                    <span className="ml-1.5 text-[11px] text-mut font-mono">
                                      ({row.mmdd})
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 align-top text-right whitespace-nowrap">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <ActionBadge action={row.action} />
                                      {isRowSaved && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Saved
                                        </span>
                                      )}
                                      {!isRowSaved && failedEntry && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300">
                                          <XCircle className="w-3 h-3" />
                                          Failed
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-subtle bg-subtle/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-sec">
                {isImporting && progress ? (
                  <span className="inline-flex items-center gap-2 font-medium text-main">
                    <Spinner size="xs" variant="accent" />
                    <span>Saving {progress.done} of {progress.total} to Firestore...</span>
                  </span>
                ) : previewRows ? (
                  <span>
                    {pendingActionableCount > 0
                      ? `${pendingActionableCount} change${pendingActionableCount === 1 ? '' : 's'} ready to save (Conflicts, Checks & Skips will not be changed)`
                      : 'No remaining changes to save.'}
                  </span>
                ) : (
                  <span>Read-only until you confirm.</span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {previewRows && (
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleGeneratePreview}
                    className="px-3.5 py-2 rounded-xl border border-subtle bg-surface hover:bg-subtle text-sec hover:text-main text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Refresh preview
                  </button>
                )}

                <button
                  type="button"
                  disabled={isImporting}
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-subtle bg-surface hover:bg-subtle text-sec hover:text-main text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Close
                </button>

                {previewRows && (
                  <button
                    type="button"
                    disabled={isImporting || pendingActionableCount === 0}
                    onClick={handleConfirmImport}
                    className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <Spinner size="xs" variant="contrast" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Confirm import ({pendingActionableCount})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
