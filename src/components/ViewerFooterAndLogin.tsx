import React, { useState } from 'react';
import { Facebook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { SecretaryLoginModal } from './SecretaryLoginModal';

interface ViewerFooterAndLoginProps {
  onNavigate: (tab: string) => void;
}

export const ViewerFooterAndLogin: React.FC<ViewerFooterAndLoginProps> = ({ onNavigate }) => {
  const { publicBranding, isSecretaryAccount, enterSecretaryWorkspace } = useAuth();
  const { settings } = useData();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const churchName = settings.churchName || publicBranding.churchName || 'Our Church';
  const rawFacebookLink = (settings.facebookLink || '').trim();
  const facebookHref = rawFacebookLink
    ? (/^https?:\/\//i.test(rawFacebookLink) ? rawFacebookLink : `https://${rawFacebookLink}`)
    : '';

  return (
    <>
      <footer className="border-t border-subtle bg-surface text-xs text-mut viewer-scroll-section pt-6 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:py-7">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-main">{churchName}</span>
            <span>·</span>
            <span>Church Portal</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sec">
            {facebookHref && (
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-1 inline-flex items-center gap-1.5 hover:text-accent transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Facebook className="w-3.5 h-3.5 shrink-0" />
                <span>Facebook</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => onNavigate('prayer-wall')}
              className="min-h-[44px] px-1 inline-flex items-center hover:text-accent transition-colors cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Prayer Wall (Coming Soon)
            </button>

            {isSecretaryAccount ? (
              <button
                type="button"
                onClick={() => {
                  enterSecretaryWorkspace();
                  onNavigate('home');
                }}
                className="min-h-[44px] px-1 inline-flex items-center font-semibold text-accent hover:underline cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Go to Secretary Page
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="min-h-[44px] px-1 inline-flex items-center font-medium text-sec hover:text-main hover:underline cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Secretary Login
              </button>
            )}
          </div>
        </div>
      </footer>

      <SecretaryLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
};
