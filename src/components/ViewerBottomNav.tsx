import React from 'react';
import { BookOpen, Calendar, Clock, Home, Users } from 'lucide-react';

interface ViewerBottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

const VIEWER_TABS = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'schedules', label: 'Schedules', Icon: Clock },
  { id: 'ministries', label: 'Ministries', Icon: Users },
  { id: 'lessons', label: 'Lessons', Icon: BookOpen },
] as const;

export const ViewerBottomNav: React.FC<ViewerBottomNavProps> = ({ currentTab, onNavigate }) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-subtle bg-surface/85 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] select-none"
    >
      <div className="flex items-stretch justify-around h-14 max-w-[1100px] mx-auto px-1">
        {VIEWER_TABS.map(({ id, label, Icon }) => {
          const isActive = currentTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 ${
                isActive ? 'text-accent font-semibold' : 'text-sec hover:text-main'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent"
                />
              )}
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
