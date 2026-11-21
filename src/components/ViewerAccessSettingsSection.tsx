import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ViewerPasscodeKind } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Spinner } from './LoadingIndicator';

type ViewerAccessCardChoice = 'open' | 'random' | 'custom';

function isEasyToGuessPasscode(code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  // All the same digit (e.g. 000000, 111111, 777777)
  if (/^(\d)\1{5}$/.test(code)) {
    return true;
  }

  // Strictly consecutive ascending (+1 mod 10) or descending (-1 mod 10) sequences (e.g. 123456, 012345, 654321)
  const digits = code.split('').map(Number);
  const isAscending = digits.every((d, i) => i === 0 || (digits[i - 1] + 1) % 10 === d);
  const isDescending = digits.every((d, i) => i === 0 || (digits[i - 1] + 9) % 10 === d);
  if (isAscending || isDescending) {
    return true;
  }

  // Simple repeated 2-digit or 3-digit patterns (e.g. 121212, 123123)
  if (code.slice(0, 2).repeat(3) === code || code.slice(0, 3).repeat(2) === code) {
    return true;
  }

  return false;
}

export const ViewerAccessSettingsSection: React.FC = () => {
  const {
    viewerSettings,
    updateViewerSettings,
    rebuildPeoplePublic,
  } = useData();

  const [showPasscode, setShowPasscode] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [savingViewerSettings, setSavingViewerSettings] = useState(false);
  const [pendingOpenSwitchKind, setPendingOpenSwitchKind] = useState<ViewerPasscodeKind | null>(null);
  const [weakCodePendingConfirm, setWeakCodePendingConfirm] = useState<string | null>(null);

  const [rebuildingViewerCopy, setRebuildingViewerCopy] = useState(false);
  const [rebuildSuccessMsg, setRebuildSuccessMsg] = useState<string | null>(null);

  const hasValidPasscode = /^\d{6}$/.test(viewerSettings.passcode || '');

  const savedChoice: ViewerAccessCardChoice =
    viewerSettings.mode === 'open'
      ? 'open'
      : viewerSettings.passcodeKind === 'custom'
        ? 'custom'
        : 'random';

  const activeChoice: ViewerAccessCardChoice =
    viewerSettings.mode === 'open' && !hasValidPasscode && pendingOpenSwitchKind
      ? pendingOpenSwitchKind
      : savedChoice;

  useEffect(() => {
    if (viewerSettings.mode === 'passcode' || hasValidPasscode) {
      setPendingOpenSwitchKind(null);
    }
  }, [viewerSettings.mode, hasValidPasscode]);

  const handleSelectOpen = async () => {
    if (savingViewerSettings) return;
    setPasscodeError(null);
    setPendingOpenSwitchKind(null);
    if (viewerSettings.mode === 'open') return;
    setSavingViewerSettings(true);
    try {
      await updateViewerSettings({ mode: 'open' });
    } finally {
      setSavingViewerSettings(false);
    }
  };

  const handleSelectCodeKind = async (kind: ViewerPasscodeKind) => {
    if (savingViewerSettings) return;
    setPasscodeError(null);

    // If switching from Open and no 6-digit code exists yet, wait until Generate or Save code completes
    if (viewerSettings.mode === 'open' && !hasValidPasscode) {
      setPendingOpenSwitchKind(kind);
      return;
    }

    setPendingOpenSwitchKind(null);
    if (viewerSettings.mode === 'passcode' && savedChoice === kind) {
      return;
    }

    setSavingViewerSettings(true);
    try {
      await updateViewerSettings({ mode: 'passcode', passcodeKind: kind });
    } finally {
      setSavingViewerSettings(false);
    }
  };

  const handleGeneratePasscode = async () => {
    if (savingViewerSettings) return;
    const arr = new Uint32Array(1);
    let code = '';
    do {
      crypto.getRandomValues(arr);
      code = String(arr[0] % 1000000).padStart(6, '0');
    } while (code === viewerSettings.passcode);

    setPasscodeError(null);
    setSavingViewerSettings(true);
    try {
      await updateViewerSettings({
        mode: 'passcode',
        passcodeKind: 'random',
        passcode: code,
      });
      setShowPasscode(true);
      setPendingOpenSwitchKind(null);
    } finally {
      setSavingViewerSettings(false);
    }
  };

  const commitCustomPasscode = async (code: string) => {
    setPasscodeError(null);
    setSavingViewerSettings(true);
    try {
      await updateViewerSettings({
        mode: 'passcode',
        passcodeKind: 'custom',
        passcode: code,
      });
      setPasscodeDraft('');
      setPendingOpenSwitchKind(null);
    } finally {
      setSavingViewerSettings(false);
    }
  };

  const handleSaveCustomPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingViewerSettings) return;
    const cleaned = passcodeDraft.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleaned)) {
      setPasscodeError('Passcode must be exactly 6 digits (0–9).');
      return;
    }

    if (isEasyToGuessPasscode(cleaned)) {
      setPasscodeError(null);
      setWeakCodePendingConfirm(cleaned);
      return;
    }

    await commitCustomPasscode(cleaned);
  };

  const handleConfirmWeakCode = async () => {
    if (!weakCodePendingConfirm || savingViewerSettings) return;
    const codeToSave = weakCodePendingConfirm;
    setWeakCodePendingConfirm(null);
    await commitCustomPasscode(codeToSave);
  };

  const handleRebuildViewerCopy = async () => {
    if (rebuildingViewerCopy) return;
    setRebuildingViewerCopy(true);
    setRebuildSuccessMsg(null);
    try {
      const count = await rebuildPeoplePublic();
      setRebuildSuccessMsg(`Synced ${count} ${count === 1 ? 'member' : 'members'} to viewer copy.`);
      setTimeout(() => setRebuildSuccessMsg(null), 4000);
    } finally {
      setRebuildingViewerCopy(false);
    }
  };

  return (
    <>
      <div className="bg-surface rounded-2xl border border-subtle shadow-card p-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-main flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>Viewer Access</span>
            </h2>
            <p className="text-xs text-sec mt-1">
              Control how church members view read-only schedules, services, and the calendar when they open the site.
            </p>
          </div>
          {savingViewerSettings && (
            <span className="inline-flex items-center gap-1.5 text-xs text-sec font-medium">
              <Spinner size="xs" variant="accent" />
              <span>Saving...</span>
            </span>
          )}
        </div>

        {/* Access Mode: Three equal cards in a row (stacked on phones) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-main uppercase tracking-wider">
            Access Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={savingViewerSettings}
              onClick={handleSelectOpen}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 flex flex-col justify-start ${
                activeChoice === 'open'
                  ? 'border-accent ring-2 ring-accent/30 bg-accent-tint/30'
                  : 'border-subtle hover:border-strong bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-main">Open (anyone can view)</span>
                {activeChoice === 'open' && <Check className="w-4 h-4 text-accent shrink-0" />}
              </div>
              <p className="text-xs text-mut">
                Visitors can enter read-only viewer mode directly with one tap—no passcode needed.
              </p>
            </button>

            <button
              type="button"
              disabled={savingViewerSettings}
              onClick={() => handleSelectCodeKind('random')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 flex flex-col justify-start ${
                activeChoice === 'random'
                  ? 'border-accent ring-2 ring-accent/30 bg-accent-tint/30'
                  : 'border-subtle hover:border-strong bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-main">Random code</span>
                {activeChoice === 'random' && <Check className="w-4 h-4 text-accent shrink-0" />}
              </div>
              <p className="text-xs text-mut">
                Viewers enter a randomly generated 6-digit church passcode before viewing pages.
              </p>
            </button>

            <button
              type="button"
              disabled={savingViewerSettings}
              onClick={() => handleSelectCodeKind('custom')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 flex flex-col justify-start ${
                activeChoice === 'custom'
                  ? 'border-accent ring-2 ring-accent/30 bg-accent-tint/30'
                  : 'border-subtle hover:border-strong bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-main">Custom code</span>
                {activeChoice === 'custom' && <Check className="w-4 h-4 text-accent shrink-0" />}
              </div>
              <p className="text-xs text-mut">
                Type your own 6-digit church passcode for viewers to enter before viewing pages.
              </p>
            </button>
          </div>
        </div>

        {/* Pending / Missing passcode notice */}
        {activeChoice !== 'open' && !hasValidPasscode && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              {pendingOpenSwitchKind ? (
                activeChoice === 'random' ? (
                  <>
                    <strong>No code set yet:</strong> Press <strong>Generate</strong> below to create a 6-digit code and switch Viewer Access from Open.
                  </>
                ) : (
                  <>
                    <strong>No code set yet:</strong> Enter a 6-digit code and press <strong>Save code</strong> below to switch Viewer Access from Open.
                  </>
                )
              ) : (
                <>
                  <strong>Passcode not set yet:</strong> Viewer mode is set to 6-digit passcode, but no code has been created yet. Generate or enter a 6-digit passcode below so members can sign in.
                </>
              )}
            </span>
          </div>
        )}

        {/* Random code panel */}
        {activeChoice === 'random' && (
          <div className="p-4 rounded-xl bg-subtle/60 border border-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-main uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-accent" />
                  <span>Current Viewer Passcode</span>
                </span>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold tracking-[0.25em] text-main bg-surface px-3 py-1 rounded-lg border border-subtle">
                    {hasValidPasscode
                      ? (showPasscode ? viewerSettings.passcode : '••••••')
                      : 'Not set'}
                  </span>
                  {hasValidPasscode && (
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="px-2.5 py-1.5 rounded-lg border border-subtle bg-surface hover:bg-surface-hover text-xs font-medium text-sec flex items-center gap-1.5 cursor-pointer"
                    >
                      {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPasscode ? 'Hide' : 'Show'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={savingViewerSettings}
                  onClick={handleGeneratePasscode}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom code panel */}
        {activeChoice === 'custom' && (
          <div className="p-4 rounded-xl bg-subtle/60 border border-subtle space-y-4">
            {hasValidPasscode && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-subtle">
                <span className="text-xs font-semibold text-main uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-accent" />
                  <span>Current Code in Effect</span>
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-bold tracking-[0.25em] text-main bg-surface px-3 py-1 rounded-lg border border-subtle">
                    {showPasscode ? viewerSettings.passcode : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="px-2.5 py-1.5 rounded-lg border border-subtle bg-surface hover:bg-surface-hover text-xs font-medium text-sec flex items-center gap-1.5 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPasscode ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCustomPasscode} className="space-y-2.5 max-w-md">
              <label htmlFor="custom-viewer-passcode" className="block text-xs font-semibold text-main">
                Enter custom 6-digit code
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[170px]">
                  <input
                    id="custom-viewer-passcode"
                    type={showCustomInput ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={passcodeDraft}
                    onChange={(e) => {
                      setPasscodeDraft(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (passcodeError) setPasscodeError(null);
                    }}
                    placeholder="6 digits (e.g. 482915)"
                    className="w-full px-3 py-2 min-h-[42px] rounded-xl border border-subtle bg-field text-main font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(prev => !prev)}
                  className="px-3 py-2 min-h-[42px] rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-xs font-medium text-sec flex items-center gap-1.5 cursor-pointer"
                >
                  {showCustomInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCustomInput ? 'Hide' : 'Show'}</span>
                </button>
                <button
                  type="submit"
                  disabled={savingViewerSettings || passcodeDraft.length !== 6}
                  className="px-4 py-2 min-h-[42px] rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save code
                </button>
              </div>
              {passcodeError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passcodeError}</span>
                </p>
              )}
            </form>
          </div>
        )}

        {/* Rebuild viewer-safe member copy */}
        <div className="pt-4 border-t border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-main">Viewer-Safe Member Copy</h3>
            <p className="text-xs text-mut mt-0.5 max-w-xl">
              Syncs member names, departments, and birthday month/day only (never contact numbers, addresses, notes, or Facebook links) for Viewer access.
            </p>
            {rebuildSuccessMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{rebuildSuccessMsg}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={rebuildingViewerCopy}
            onClick={handleRebuildViewerCopy}
            className="px-4 py-2 rounded-xl border border-subtle bg-surface hover:bg-surface-hover text-main text-xs font-semibold transition-colors inline-flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            {rebuildingViewerCopy ? (
              <>
                <Spinner size="xs" variant="accent" />
                <span>Rebuilding...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
                <span>Rebuild viewer copy</span>
              </>
            )}
          </button>
        </div>

        {/* Future Viewer Accounts placeholder */}
        <div className="pt-4 border-t border-subtle flex items-center justify-between opacity-55 cursor-not-allowed select-none">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-mut" />
            <div>
              <div className="text-xs font-semibold text-main">Viewer accounts - coming later</div>
              <div className="text-[11px] text-mut">Individual named member viewer logins will be added in a future stage.</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-subtle border border-subtle text-[10px] font-bold uppercase text-mut">
            Soon
          </span>
        </div>
      </div>

      {/* Confirm easy-to-guess custom code */}
      <ConfirmModal
        isOpen={Boolean(weakCodePendingConfirm)}
        title="Easy-to-guess code"
        message="This code is easy to guess. Use it anyway?"
        confirmLabel="Use anyway"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={handleConfirmWeakCode}
        onCancel={() => setWeakCodePendingConfirm(null)}
      />
    </>
  );
};
