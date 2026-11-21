import React from 'react';
import { Clock, ExternalLink, HeartHandshake } from 'lucide-react';

const PRAYER_WALL_URL = '';

export const PrayerWallPage: React.FC = () => {
  const prayerWallHref = PRAYER_WALL_URL.trim();

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 motion-page-enter">
      <div className="max-w-2xl mx-auto viewer-card p-6 sm:p-10 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-xl bg-accent-tint border border-accent/20 text-accent flex items-center justify-center">
          <HeartHandshake className="w-7 h-7" />
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-main text-balance">
            Prayer Wall
          </h1>
          <p className="text-sm sm:text-base text-sec leading-relaxed max-w-xl mx-auto">
            A place where people can share prayer requests (names are optional), and where anyone can visit to pray for someone else.
          </p>
        </div>

        {prayerWallHref ? (
          <div className="pt-2">
            <a
              href={prayerWallHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-contrast text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <span>Open Prayer Wall</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          </div>
        ) : (
          <div className="pt-1 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-tint border border-accent/25 text-accent text-xs sm:text-sm font-semibold">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Coming Soon</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
