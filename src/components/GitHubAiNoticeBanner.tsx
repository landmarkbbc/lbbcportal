import React from 'react';
import { ExternalLink, Info, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';

export function isGithubIoHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.toLowerCase().endsWith('github.io');
}

export function getValidAiStudioHref(rawLink?: string): string {
  const trimmed = (rawLink || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  try {
    const url = new URL(trimmed);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname && url.hostname.includes('.')) {
      return trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

export const GitHubAiNoticeBanner: React.FC = () => {
  const { settings } = useData();
  const aiStudioHref = getValidAiStudioHref(settings.aiStudioLink);

  return (
    <div className="p-3 rounded-xl bg-accent-tint border border-accent/25 text-main text-xs space-y-2.5">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          AI writing is only available in the Google AI Studio version of this app. Open it there, generate the text, then copy it back here.
        </p>
      </div>
      <div>
        {aiStudioHref ? (
          <a
            href={aiStudioHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Google AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="inline-block text-xs font-medium text-sec">
            Add the link in Settings
          </span>
        )}
      </div>
    </div>
  );
};
