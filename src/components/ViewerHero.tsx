import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clampHeroBrightness } from '../lib/brandingCache';

interface ViewerHeroProps {
  churchName: string;
  welcomeLine: string;
  bannerUrl?: string;
  heroBrightness?: number;
}

export const ViewerHero: React.FC<ViewerHeroProps> = ({
  churchName,
  welcomeLine,
  bannerUrl,
  heroBrightness,
}) => {
  const effectiveBrightness = clampHeroBrightness(heroBrightness);

  return (
    <section
      aria-label={churchName}
      className="relative w-full min-h-[60svh] md:min-h-[70svh] flex flex-col items-center justify-center overflow-hidden select-none viewer-home-section viewer-home-s1"
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt={churchName}
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

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center space-y-4">
        <h1
          className="text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold tracking-tight leading-[1.08] text-white text-balance"
          style={{
            textShadow: '0 2px 18px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.45)',
          }}
        >
          {churchName}
        </h1>
        <p
          className="text-base sm:text-xl font-normal text-white/95 max-w-2xl mx-auto leading-relaxed text-pretty"
          style={{
            textShadow: '0 1px 12px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.45)',
          }}
        >
          {welcomeLine}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-white/85 pointer-events-none viewer-hero-cue drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]"
      >
        <ChevronDown className="w-5 h-5" strokeWidth={1.75} />
      </div>
    </section>
  );
};
