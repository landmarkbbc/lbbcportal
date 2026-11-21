import React, { useMemo } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { WeekOfMonthPattern, WeekOfMonthValue } from '../types';
import {
  formatDate,
  formatWeekPatternSummary,
  getNextServiceDates
} from '../lib/dateTime';

interface WeekOfMonthSelectorProps {
  selectedDays: number[];
  weekPattern: WeekOfMonthPattern;
  weekNumbers: WeekOfMonthValue[];
  showValidationError?: boolean;
  onChangePattern: (pattern: WeekOfMonthPattern) => void;
  onChangeWeekNumbers: (weeks: WeekOfMonthValue[]) => void;
}

const PATTERN_OPTIONS: { value: WeekOfMonthPattern; label: string }[] = [
  { value: 'every', label: 'Every week' },
  { value: 'only', label: 'Only certain weeks' },
  { value: 'except', label: 'Every week except certain weeks' }
];

const WEEK_CHIPS: { value: WeekOfMonthValue; label: string }[] = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 'last', label: 'Last' }
];

export const WeekOfMonthSelector: React.FC<WeekOfMonthSelectorProps> = ({
  selectedDays,
  weekPattern,
  weekNumbers,
  showValidationError = false,
  onChangePattern,
  onChangeWeekNumbers
}) => {
  const needsWeeks = weekPattern !== 'every';
  const hasMissingWeeks = needsWeeks && weekNumbers.length === 0;

  const toggleWeek = (val: WeekOfMonthValue) => {
    if (weekNumbers.includes(val)) {
      onChangeWeekNumbers(weekNumbers.filter(w => w !== val));
    } else {
      onChangeWeekNumbers([...weekNumbers, val]);
    }
  };

  const summaryText = useMemo(() => {
    if (!needsWeeks || hasMissingWeeks) return '';
    return formatWeekPatternSummary(selectedDays, weekPattern, weekNumbers);
  }, [needsWeeks, hasMissingWeeks, selectedDays, weekPattern, weekNumbers]);

  const nextDates = useMemo(() => {
    if (!needsWeeks || hasMissingWeeks) return [];
    return getNextServiceDates(
      {
        daysOfWeek: selectedDays,
        weekPattern,
        weekNumbers
      },
      3
    );
  }, [needsWeeks, hasMissingWeeks, selectedDays, weekPattern, weekNumbers]);

  return (
    <div className="space-y-2.5">
      <label className="block font-semibold text-main uppercase tracking-wider">
        Which weeks of the month?
      </label>

      {/* Three choices: responsive segmented/radio buttons */}
      <div
        role="radiogroup"
        aria-label="Which weeks of the month"
        className="flex flex-col gap-1.5"
      >
        {PATTERN_OPTIONS.map((opt) => {
          const isSelected = weekPattern === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChangePattern(opt.value)}
              className={`w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                isSelected
                  ? 'bg-accent-tint border-accent text-main shadow-2xs'
                  : 'bg-subtle border-subtle text-sec hover:bg-surface-hover hover:text-main'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent'
                    : 'border-strong bg-surface'
                }`}
              >
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent-contrast" />}
              </span>
              <span className="leading-snug">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Multi-select chips + live summary + next dates when 2nd or 3rd choice is selected */}
      {needsWeeks && (
        <div className="p-3 rounded-xl bg-subtle border border-subtle space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEK_CHIPS.map((chip) => {
              const isSelected = weekNumbers.includes(chip.value);
              return (
                <button
                  key={String(chip.value)}
                  type="button"
                  onClick={() => toggleWeek(chip.value)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-accent-contrast shadow-xs'
                      : 'bg-surface border border-subtle text-sec hover:text-main hover:bg-surface-hover'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-mut">
            &ldquo;Last&rdquo; means the last occurrence of that weekday in the month (4th or 5th).
          </p>

          {hasMissingWeeks ? (
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium ${
                showValidationError
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Please select at least one week (1st, 2nd, 3rd, 4th, or Last).</span>
            </div>
          ) : (
            <div className="pt-2 border-t border-subtle space-y-1.5 text-xs">
              {summaryText && (
                <p className="font-semibold text-main leading-snug">
                  {summaryText}
                </p>
              )}
              {nextDates.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-sec flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span className="font-semibold text-main shrink-0">Next dates:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {nextDates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md bg-surface border border-subtle text-main font-medium tabular-nums"
                      >
                        {formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
