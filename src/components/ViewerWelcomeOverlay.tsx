import React, { useEffect, useRef, useState } from 'react';
import { normalizeAccentColor } from '../lib/brandingCache';

interface ViewerWelcomeOverlayProps {
  churchName?: string;
  churchLogo?: string;
  accentColor?: string;
  isDataLoading: boolean;
  onDone: () => void;
}

type WelcomePhase = 'intro' | 'revealing' | 'reduced-hold' | 'reduced-fade';

interface ConfettiDot {
  id: number;
  tx: string;
  ty: string;
  size: number;
  delayMs: number;
  opacity: number;
}

const CONFETTI_DOTS: ConfettiDot[] = [
  { id: 1, tx: '-76px', ty: '-54px', size: 6, delayMs: 1200, opacity: 0.85 },
  { id: 2, tx: '-48px', ty: '-74px', size: 5, delayMs: 1240, opacity: 0.65 },
  { id: 3, tx: '-16px', ty: '-82px', size: 7, delayMs: 1280, opacity: 0.9 },
  { id: 4, tx: '22px', ty: '-80px', size: 5, delayMs: 1220, opacity: 0.7 },
  { id: 5, tx: '56px', ty: '-68px', size: 6, delayMs: 1260, opacity: 0.85 },
  { id: 6, tx: '82px', ty: '-46px', size: 5, delayMs: 1310, opacity: 0.65 },
  { id: 7, tx: '-92px', ty: '-18px', size: 5, delayMs: 1300, opacity: 0.6 },
  { id: 8, tx: '92px', ty: '-14px', size: 6, delayMs: 1340, opacity: 0.7 },
  { id: 9, tx: '-64px', ty: '18px', size: 4, delayMs: 1360, opacity: 0.55 },
  { id: 10, tx: '68px', ty: '16px', size: 5, delayMs: 1320, opacity: 0.6 },
  { id: 11, tx: '-34px', ty: '-52px', size: 4, delayMs: 1380, opacity: 0.5 },
  { id: 12, tx: '38px', ty: '-48px', size: 4, delayMs: 1350, opacity: 0.5 },
  { id: 13, tx: '-104px', ty: '-40px', size: 4, delayMs: 1290, opacity: 0.45 },
  { id: 14, tx: '104px', ty: '-36px', size: 4, delayMs: 1270, opacity: 0.45 },
];

const INTRO_HOLD_END_MS = 3000;
const REVEAL_DURATION_MS = 1000;
const SKIP_HINT_DELAY_MS = 1000;
const REDUCED_FADE_MS = 1000;

export const ViewerWelcomeOverlay: React.FC<ViewerWelcomeOverlayProps> = ({
  churchName,
  churchLogo,
  accentColor,
  isDataLoading,
  onDone,
}) => {
  const [prefersReducedMotion] = useState(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      );
    } catch {
      return false;
    }
  });

  const [phase, setPhase] = useState<WelcomePhase>(() =>
    prefersReducedMotion ? 'reduced-hold' : 'intro'
  );
  const [readyForReveal, setReadyForReveal] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const revealStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Reset image error fallback if logo source updates
  useEffect(() => {
    setLogoLoadFailed(false);
  }, [churchLogo]);

  // Block scrolling while welcome animation plays
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Show "Tap to skip" hint after the first second
  useEffect(() => {
    if (prefersReducedMotion) return;
    const hintTimer = setTimeout(() => {
      setShowSkipHint(true);
    }, SKIP_HINT_DELAY_MS);
    return () => clearTimeout(hintTimer);
  }, [prefersReducedMotion]);

  // Auto-advance to reveal at 3.0s (after 2.4s–3.0s calm hold), or start 1s fade under reduced motion
  useEffect(() => {
    if (prefersReducedMotion) {
      let rafId = 0;
      const timer = setTimeout(() => {
        rafId = window.requestAnimationFrame(() => {
          setReadyForReveal(true);
        });
      }, 60);
      return () => {
        clearTimeout(timer);
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }
    const timer = setTimeout(() => {
      setReadyForReveal(true);
    }, INTRO_HOLD_END_MS);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  // Start reveal (or reduced-motion 1s fade) once ready AND Home data underneath is loaded
  useEffect(() => {
    if (!readyForReveal || isDataLoading || revealStartedRef.current) return;
    revealStartedRef.current = true;
    setPhase(prefersReducedMotion ? 'reduced-fade' : 'revealing');
  }, [readyForReveal, isDataLoading, prefersReducedMotion]);

  // Complete after the 1.0s reveal (or 1.0s reduced-motion fade)
  useEffect(() => {
    if (phase !== 'revealing' && phase !== 'reduced-fade') return;
    const duration = phase === 'reduced-fade' ? REDUCED_FADE_MS : REVEAL_DURATION_MS;
    const doneTimer = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onDoneRef.current();
      }
    }, duration);
    return () => clearTimeout(doneTimer);
  }, [phase]);

  // Any key press skips straight to the reveal (or fade under reduced motion)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      setReadyForReveal(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const churchDisplayName = (typeof churchName === 'string' ? churchName.trim() : '') || 'Our Church';
  const safeLogo = typeof churchLogo === 'string' && churchLogo.trim() && !logoLoadFailed ? churchLogo : '';
  const safeAccent = normalizeAccentColor(accentColor, 'red');

  const handleSkip = () => {
    setReadyForReveal(true);
  };

  if (prefersReducedMotion) {
    return (
      <div
        data-color-scheme="light"
        data-accent={safeAccent}
        data-welcome-phase={phase}
        onClick={handleSkip}
        role="status"
        aria-live="polite"
        aria-label={`Welcome to ${churchDisplayName}`}
        className={`viewer-welcome-overlay fixed inset-0 z-[100] bg-white text-slate-900 flex flex-col items-center justify-center px-6 select-none touch-none overscroll-none cursor-pointer transition-opacity duration-1000 ease-out ${
          phase === 'reduced-fade' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-full max-w-lg flex flex-col items-center text-center">
          {safeLogo && (
            <img
              src={safeLogo}
              alt={`${churchDisplayName} Logo`}
              referrerPolicy="no-referrer"
              onError={() => setLogoLoadFailed(true)}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-6"
            />
          )}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Welcome!
          </h1>
          <p className="mt-2.5 text-lg sm:text-2xl font-medium text-slate-600 text-balance">
            {churchDisplayName}
          </p>
          <div
            className="mt-5 h-[2px] w-36 sm:w-48 rounded-full"
            style={{ backgroundColor: 'var(--accent-base)' }}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  const isRevealing = phase === 'revealing';

  return (
    <div
      data-color-scheme="light"
      data-accent={safeAccent}
      data-welcome-phase={phase}
      onClick={handleSkip}
      role="status"
      aria-live="polite"
      aria-label={`Welcome to ${churchDisplayName}`}
      className={`viewer-welcome-overlay fixed inset-0 z-[100] text-slate-900 flex flex-col items-center justify-center px-6 select-none overflow-hidden touch-none overscroll-none cursor-pointer ${
        isRevealing ? 'pointer-events-none' : ''
      }`}
    >
      {/* White backdrop with expanding circular cutout from center (3.0s to 4.0s) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="fixed inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <mask id="viewer-welcome-reveal-mask">
            <rect width="100" height="100" fill="#ffffff" />
            <g transform="translate(50, 50)">
              <circle
                cx="0"
                cy="0"
                r="80"
                fill="#000000"
                className={`viewer-welcome-mask-circle ${
                  isRevealing ? 'viewer-welcome-mask-circle-expand' : ''
                }`}
              />
            </g>
          </mask>
        </defs>
        <rect
          width="100"
          height="100"
          fill="#ffffff"
          mask="url(#viewer-welcome-reveal-mask)"
        />
      </svg>

      {/* Centered Welcome Composition */}
      <div
        className={`relative z-10 w-full max-w-xl flex flex-col items-center text-center transition-opacity duration-300 ease-out ${
          isRevealing ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Subtle confetti dots drifting up & fading around the logo (1.2s to 2.4s) */}
        <div
          className={`pointer-events-none relative flex items-center justify-center ${
            safeLogo ? 'mb-7' : 'mb-1'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            {CONFETTI_DOTS.map((dot) => (
              <span
                key={dot.id}
                className="viewer-welcome-confetti-dot"
                style={{
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  backgroundColor: 'var(--accent-base)',
                  '--confetti-tx': dot.tx,
                  '--confetti-ty': dot.ty,
                  '--confetti-opacity': dot.opacity,
                  animationDelay: `${dot.delayMs}ms`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* 0.0 to 0.8s: Church logo fades & scales in with one outward pulse ring (skip if no logo) */}
          {safeLogo && (
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="viewer-welcome-logo-ring"
              />
              <img
                src={safeLogo}
                alt={`${churchDisplayName} Logo`}
                referrerPolicy="no-referrer"
                onError={() => setLogoLoadFailed(true)}
                className="viewer-welcome-logo-in relative w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </div>
          )}
        </div>

        {/* 0.6 to 1.6s: "Welcome!" rises into place */}
        <h1 className="viewer-welcome-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Welcome!
        </h1>

        {/* 1.2 to 2.4s: Church name appears + thin accent line draws outward from center */}
        <p className="viewer-welcome-church text-lg sm:text-2xl font-medium text-slate-600 mt-2.5 leading-snug text-balance max-w-md">
          {churchDisplayName}
        </p>

        <div
          className="viewer-welcome-center-line mt-5 h-[2px] w-36 sm:w-48 rounded-full"
          style={{ backgroundColor: 'var(--accent-base)' }}
          aria-hidden="true"
        />
      </div>

      {/* Small "Tap to skip" hint after the first second */}
      <p
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-10 text-xs font-medium tracking-wide text-slate-400 transition-opacity duration-300 ${
          showSkipHint && !isRevealing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Tap to skip
      </p>
    </div>
  );
};
