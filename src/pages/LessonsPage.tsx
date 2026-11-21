import React from 'react';
import { BookOpen, Clock } from 'lucide-react';

export const LessonsPage: React.FC = () => {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 motion-page-enter">
      <div className="max-w-2xl mx-auto rounded-xl bg-surface border border-subtle p-6 sm:p-10 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-xl bg-accent-tint border border-accent/20 text-accent flex items-center justify-center">
          <BookOpen className="w-7 h-7" />
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-main text-balance">
            Lessons
          </h1>
          <p className="text-sm sm:text-base text-sec leading-relaxed max-w-xl mx-auto">
            Past Sunday school lessons will be available here to download. Coming Soon.
          </p>
        </div>

        <div className="pt-1 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-tint border border-accent/25 text-accent text-xs sm:text-sm font-semibold">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};
