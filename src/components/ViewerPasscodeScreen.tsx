import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { normalizeAccentColor } from '../lib/brandingCache';

const WRONG_CODE_MESSAGE = 'Wrong passcode. Please check the code and try again.';

export const ViewerPasscodeScreen: React.FC = () => {
  const {
    enterViewerWithPasscode,
    publicBranding,
    loginBackground,
    viewerPasscodeSubmitting,
    anonymousAuthDisabled,
    clearAuthError,
  } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [focusFirstPending, setFocusFirstPending] = useState(false);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isChecking = submitting || viewerPasscodeSubmitting;
  const churchDisplayName = (publicBranding.churchName || '').trim() || 'Our Church';
  const accentColor = normalizeAccentColor(publicBranding.accentColor, 'red');
  const hasImage = Boolean(loginBackground.imageData);

  useEffect(() => {
    if (focusFirstPending && !isChecking) {
      digitRefs.current[0]?.focus();
      setFocusFirstPending(false);
    }
  }, [focusFirstPending, isChecking]);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeKey((k) => k + 1);
  };

  const submitCode = async (rawCode: string) => {
    if (isChecking) return;
    setErrorMessage(null);
    clearAuthError();

    if (!/^\d{6}$/.test(rawCode)) {
      const firstEmpty = digits.findIndex((d) => !d);
      if (firstEmpty >= 0) {
        digitRefs.current[firstEmpty]?.focus();
      }
      triggerError('Please enter all 6 digits.');
      return;
    }

    setSubmitting(true);
    try {
      await enterViewerWithPasscode(rawCode);
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      if (
        rawMsg.includes('has not been set yet') ||
        rawMsg.includes('Anonymous sign-in is not enabled')
      ) {
        triggerError(rawMsg);
      } else {
        setDigits(['', '', '', '', '', '']);
        triggerError(WRONG_CODE_MESSAGE);
        setFocusFirstPending(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDigitChange = (idx: number, rawVal: string) => {
    if (errorMessage) setErrorMessage(null);
    const cleaned = rawVal.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[idx] = '';
        return next;
      });
      return;
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      if (cleaned.length >= 6) {
        for (let i = 0; i < 6; i++) {
          next[i] = chars[i] || '';
        }
        setDigits(next);
        digitRefs.current[5]?.focus();
      } else {
        const current = [...digits];
        chars.forEach((ch, offset) => {
          if (idx + offset < 6) {
            current[idx + offset] = ch;
          }
        });
        setDigits(current);
        const nextFocus = Math.min(5, idx + chars.length);
        digitRefs.current[nextFocus]?.focus();
      }
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    if (idx < 5) {
      digitRefs.current[idx + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (errorMessage) setErrorMessage(null);
      if (digits[idx]) {
        setDigits((prev) => {
          const next = [...prev];
          next[idx] = '';
          return next;
        });
      } else if (idx > 0) {
        setDigits((prev) => {
          const next = [...prev];
          next[idx - 1] = '';
          return next;
        });
        digitRefs.current[idx - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      digitRefs.current[idx + 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitCode(digits.join(''));
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    if (errorMessage) setErrorMessage(null);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    const focusIdx = Math.min(5, pasted.length >= 6 ? 5 : pasted.length);
    digitRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(digits.join(''));
  };

  return (
    <div
      data-color-scheme="light"
      data-accent={accentColor}
      className={`min-h-[100dvh] w-full bg-white text-slate-900 ${
        hasImage ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col'
      }`}
    >
      {/* Left column (or centered single column when no image is set) */}
      <div className="min-h-[100dvh] flex flex-col items-center px-5 py-8 sm:px-10 md:px-12 lg:px-16 overflow-y-auto bg-white">
        <div className="my-auto w-full max-w-[380px] flex flex-col items-center text-center">
          {/* 1. Church logo (omit completely when not set) */}
          {publicBranding.churchLogo && (
            <img
              src={publicBranding.churchLogo}
              alt={churchDisplayName}
              className="w-16 h-16 sm:w-[72px] sm:h-[72px] object-contain mb-5 select-none"
            />
          )}

          {/* 2. Welcome! */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Welcome!
          </h1>

          {/* 3. Church name under Welcome! */}
          <p className="mt-1.5 text-base sm:text-lg font-medium text-slate-700">
            {churchDisplayName}
          </p>

          {/* 4. Short explanation */}
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            For security purposes, access to this portal is limited to church members. Please enter the 6-digit code shared with you by the church.
          </p>

          {/* 5 & 6. Six rounded numeric code boxes + Enter pill button */}
          <form onSubmit={handleSubmit} className="mt-7 w-full flex flex-col items-center">
            <div
              key={shakeKey}
              className={`grid grid-cols-6 gap-2 sm:gap-2.5 w-full max-w-[336px] ${
                shakeKey > 0 ? 'login-shake' : ''
              }`}
            >
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    digitRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Passcode digit ${idx + 1} of 6`}
                  value={digit}
                  disabled={isChecking}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={handleDigitPaste}
                  onFocus={(e) => e.currentTarget.select()}
                  className={`h-12 sm:h-14 w-full rounded-xl border bg-white text-slate-900 text-center text-xl font-semibold tabular-nums transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    errorMessage
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-500/25'
                      : 'border-slate-300 focus:border-[var(--accent-base)] focus:ring-[var(--accent-ring)]'
                  }`}
                />
              ))}
            </div>

            {errorMessage && (
              <p
                role="alert"
                aria-live="polite"
                className="mt-3 text-xs sm:text-sm font-medium text-red-600 leading-relaxed"
              >
                {errorMessage}
              </p>
            )}

            {anonymousAuthDisabled && !errorMessage && (
              <p className="mt-3 text-xs text-amber-700 leading-relaxed">
                Anonymous sign-in is currently disabled in Firebase Authentication.
              </p>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className="mt-6 w-full max-w-[336px] min-h-[48px] px-8 py-3 rounded-full bg-[var(--accent-base)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold text-sm tracking-wide transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-base)] focus-visible:ring-offset-white"
            >
              {isChecking ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>

      {/* Right column: plain edge-to-edge image on >= 768px when set */}
      {hasImage && (
        <div className="hidden md:block relative min-h-[100dvh] w-full overflow-hidden">
          <img
            src={loginBackground.imageData}
            alt={churchDisplayName}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
          />
        </div>
      )}
    </div>
  );
};
