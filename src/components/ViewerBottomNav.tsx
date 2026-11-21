import React from 'react';
import { BookOpen, Calendar, Clock, Home, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getAccentSwatchHex, getReadableForegroundForBackground } from '../lib/colorContrast';

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
  const { settings } = useData();
  const accentHex = getAccentSwatchHex(settings.accentColor, settings.colorScheme);
  const fgColor = getReadableForegroundForBackground(accentHex);
  const isLightAccent = fgColor !== '#ffffff';

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,0px)] select-none border-t border-black/10"
      style={{
        backgroundColor: 'var(--accent-base)',
        color: fgColor,
      }}
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
              style={{ color: fgColor }}
              className={`relative flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 px-1 rounded-md transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                isLightAccent ? 'focus-visible:ring-black/40' : 'focus-visible:ring-white/60'
              } ${isActive ? 'opacity-100 font-semibold' : 'opacity-75 hover:opacity-95'}`}
            >
              <span
                className="inline-flex items-center justify-center px-3 py-0.5 rounded-full transition-colors"
                style={
                  isActive
                    ? {
                        backgroundColor: isLightAccent
                          ? 'rgba(17, 24, 39, 0.14)'
                          : 'rgba(255, 255, 255, 0.22)',
                      }
                    : undefined
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              </span>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full">
                {label}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-7 h-[2px] rounded-full"
                  style={{ backgroundColor: fgColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
