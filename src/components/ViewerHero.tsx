import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ViewerHeroProps {
  churchName: string;
  welcomeLine: string;
  bannerUrl?: string;
}

export const ViewerHero: React.FC<ViewerHeroProps> = ({
  churchName,
  welcomeLine,
  bannerUrl,
}) => {
  return (
    <section
      aria-label={churchName}
      className="relative w-full min-h-[60svh] md:min-h-[70svh] flex flex-col items-center justify-center overflow-hidden select-none viewer-home-section viewer-home-s1"
    >
      {bannerUrl ? (
        <>
          <img
            src={bannerUrl}
            alt={churchName}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-gradient-start) 0%, var(--accent-gradient-end) 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/55"
          />
        </>
      )}

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center space-y-4">
        <h1
          className="text-[clamp(2.25rem,5.5vw,4.25rem)] font-bold tracking-tight leading-[1.08] text-white text-balance"
          style={{ textShadow: '0 2px 18px rgba(0, 0, 0, 0.45)' }}
        >
          {churchName}
        </h1>
        <p
          className="text-base sm:text-xl font-normal text-white/90 max-w-2xl mx-auto leading-relaxed text-pretty"
          style={{ textShadow: '0 1px 10px rgba(0, 0, 0, 0.4)' }}
        >
          {welcomeLine}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-white/75 pointer-events-none viewer-hero-cue"
      >
        <ChevronDown className="w-5 h-5" strokeWidth={1.75} />
      </div>
    </section>
  );
};
