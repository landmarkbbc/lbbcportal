/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { RegularServicesPage } from './pages/RegularServicesPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { PeopleMinistriesPage } from './pages/PeopleMinistriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { MessageTemplatesPage } from './pages/MessageTemplatesPage';
import { TasksPage } from './pages/TasksPage';
import { QuickNotesPage } from './pages/QuickNotesPage';
import { ForerunnerStudioPage } from './pages/ForerunnerStudioPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { ViewerNotesPage } from './pages/ViewerNotesPage';
import { PrayerWallPage } from './pages/PrayerWallPage';
import { LessonsPage } from './pages/LessonsPage';
import { PortalLessonsPage } from './pages/PortalLessonsPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { VisitorFollowUpStatus } from './types';
import { SaveStatusPill } from './components/SaveStatusPill';
import { FloatingQuickNoteButton } from './components/FloatingQuickNoteButton';
import { FloatingViewerNoteButton } from './components/FloatingViewerNoteButton';
import { ViewerNoteModal } from './components/ViewerNoteModal';
import { IdleLogoutController } from './components/IdleLogoutController';
import { PageLoading } from './components/LoadingIndicator';
import { ViewerWelcomeOverlay } from './components/ViewerWelcomeOverlay';
import { DocumentTitleSync } from './components/DocumentTitleSync';
import { BackToTop } from './components/BackToTop';
import { ScrollToTop } from './components/ScrollToTop';
import { ViewerBottomNav } from './components/ViewerBottomNav';
import { ViewerFooterAndLogin } from './components/ViewerFooterAndLogin';
import { ViewerSwipeContainer } from './components/ViewerSwipeContainer';
import { ViewerPasscodeScreen } from './components/ViewerPasscodeScreen';
import { SecretSecretaryLoginController } from './components/SecretSecretaryLoginController';

const VIEWER_ALLOWED_TABS = new Set([
  'home',
  'calendar',
  'schedules',
  'ministries',
  'lessons',
  'prayer-wall',
]);

function resolveViewerTab(tab: string | null): string | null {
  if (!tab) return null;
  if (tab === 'regular-services') return 'schedules';
  if (tab === 'people-ministries' || tab === 'members') return null;
  return VIEWER_ALLOWED_TABS.has(tab) ? tab : null;
}

const KNOWN_APP_ROUTES = new Set([
  'home',
  'calendar',
  'regular-services',
  'schedules',
  'people-ministries',
  'ministries',
  'members',
  'lessons',
  'prayer-wall',
  'settings',
  'message-templates',
  'tasks',
  'quick-notes',
  'viewer-notes',
  'forerunner-studio',
  'sunday-school',
  'visitors',
  'announcements',
  'portal-lessons',
]);

function getPreservedBasePathname(): string {
  const envBase = import.meta.env.BASE_URL || '/';
  const normalizedEnvBase = envBase.endsWith('/') ? envBase : `${envBase}/`;
  if (typeof window === 'undefined') return normalizedEnvBase;

  const pathname = window.location.pathname || '/';
  if (normalizedEnvBase !== '/' && pathname.startsWith(normalizedEnvBase.replace(/\/$/, ''))) {
    return normalizedEnvBase;
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && KNOWN_APP_ROUTES.has(parts[parts.length - 1].toLowerCase())) {
    const baseParts = parts.slice(0, -1);
    return baseParts.length > 0 ? `/${baseParts.join('/')}/` : '/';
  }
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function buildAppUrl(tab?: string): string {
  const basePath = getPreservedBasePathname();
  if (!tab || tab === 'home') return `${basePath}#/`;
  return `${basePath}#/${tab}`;
}

function readRequestedTabFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab');
    if (queryTab) return queryTab.trim().toLowerCase();

    const hashClean = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (hashClean) return hashClean.split('/')[0].split('?')[0];

    const parts = window.location.pathname.split('/').filter(Boolean);
    const lastSegment = parts.length > 0 ? parts[parts.length - 1].trim().toLowerCase() : '';
    if (lastSegment && KNOWN_APP_ROUTES.has(lastSegment)) return lastSegment;
  } catch {
    return null;
  }
  return null;
}

function AppContent() {
  const {
    currentUser,
    loading,
    role,
    isViewer,
    isSecretaryAccount,
    publicBranding,
    publicBrandingLoading,
    publicBrandingError,
    viewerUnlocked,
    viewerUnlockChecking,
    viewerPasscodeSubmitting,
    viewerWelcomePending,
    dismissViewerWelcome,
    recheckAuth,
    logout,
  } = useAuth();
  const {
    settings,
    cloudError,
    clearCloudError,
    dataLoading,
    pendingLoadingParts,
    collectionErrors,
    retryDataLoad,
  } = useData();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [visitorInitialFollowUp, setVisitorInitialFollowUp] = useState<VisitorFollowUpStatus | undefined>(undefined);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [timeoutCycle, setTimeoutCycle] = useState(0);
  const [retryingLoad, setRetryingLoad] = useState(false);
  const [viewerNoteModalOpen, setViewerNoteModalOpen] = useState(false);

  const handleNavigate = useCallback((tab: string) => {
    if (isViewer) {
      const targetTab = resolveViewerTab(tab) || 'home';
      setCurrentTab(targetTab);
      if (typeof window !== 'undefined') {
        const targetUrl = buildAppUrl(targetTab);
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentUrl !== targetUrl) {
          window.history.pushState(null, '', targetUrl);
        }
      }
      return;
    }
    setCurrentTab(tab);
  }, [isViewer]);

  // Sync tab on role change while honoring Viewer hash URLs on direct open/refresh
  useEffect(() => {
    setViewerNoteModalOpen(false);
    if (!isViewer) {
      setCurrentTab('home');
      return;
    }
    const urlTab = readRequestedTabFromUrl();
    const resolved = resolveViewerTab(urlTab);
    setCurrentTab(resolved || 'home');
    if (urlTab && !resolved && urlTab !== 'secretary-login' && typeof window !== 'undefined') {
      window.history.replaceState(null, '', buildAppUrl('home'));
    }
  }, [role, isViewer]);

  useEffect(() => {
    if (!isViewer) return;

    const syncFromUrl = () => {
      const urlTab = readRequestedTabFromUrl();
      if (urlTab) {
        const resolved = resolveViewerTab(urlTab);
        if (resolved) {
          setCurrentTab(resolved);
          if (urlTab === 'regular-services') {
            window.history.replaceState(null, '', buildAppUrl('schedules'));
          }
        } else {
          setCurrentTab('home');
          if (urlTab !== 'secretary-login') {
            window.history.replaceState(null, '', buildAppUrl('home'));
          }
        }
      } else {
        setCurrentTab('home');
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, [isViewer]);

  useEffect(() => {
    if (isViewer && !VIEWER_ALLOWED_TABS.has(currentTab)) {
      const fallback = currentTab === 'regular-services' ? 'schedules' : 'home';
      setCurrentTab(fallback);
      if (typeof window !== 'undefined') {
        const targetUrl = buildAppUrl(fallback);
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentUrl !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
        }
      }
    }
  }, [isViewer, currentTab]);

  const checkingPasscodeUnlock = Boolean(
    isViewer &&
    !isSecretaryAccount &&
    !publicBrandingLoading &&
    publicBranding.viewerMode === 'passcode' &&
    !viewerPasscodeSubmitting &&
    viewerUnlockChecking
  );

  const isAppLoading =
    loading ||
    publicBrandingLoading ||
    checkingPasscodeUnlock ||
    (Boolean(currentUser) && (!isViewer || viewerUnlocked) && dataLoading.initial);

  useEffect(() => {
    if (!isAppLoading) {
      setLoadingTimedOut(false);
      setRetryingLoad(false);
      return;
    }

    setLoadingTimedOut(false);
    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 12000);

    return () => clearTimeout(timer);
  }, [isAppLoading, timeoutCycle]);

  const diagnosticParts: string[] = [];
  if (loading) diagnosticParts.push('auth session');
  if (publicBrandingLoading) diagnosticParts.push('public_branding/app');
  if (checkingPasscodeUnlock) diagnosticParts.push('viewer unlock status');
  if (publicBrandingError) diagnosticParts.push(`public_branding/app (${publicBrandingError})`);
  if (pendingLoadingParts.length > 0) {
    diagnosticParts.push(`waiting: ${pendingLoadingParts.join(', ')}`);
  }
  const errEntries = Object.entries(collectionErrors);
  if (errEntries.length > 0) {
    diagnosticParts.push(`errors: ${errEntries.map(([k, v]) => `${k} [${v}]`).join('; ')}`);
  }

  const handleRetryLoading = async () => {
    setRetryingLoad(true);
    setLoadingTimedOut(false);
    setTimeoutCycle(c => c + 1);
    try {
      await recheckAuth();
      retryDataLoad();
    } finally {
      setRetryingLoad(false);
    }
  };

  const handleBackToLogin = async () => {
    setLoadingTimedOut(false);
    setTimeoutCycle(c => c + 1);
    await logout();
  };

  const showViewerWelcome = Boolean(
    isViewer &&
    viewerWelcomePending &&
    !loadingTimedOut
  );

  if (isAppLoading && !showViewerWelcome) {
    if (loadingTimedOut) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-canvas text-main">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-subtle shadow-card p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-main">Taking longer than expected</h2>
              <p className="text-sm text-sec leading-relaxed">
                We couldn&apos;t finish loading the church data right away. You can try again or reset your session.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                disabled={retryingLoad}
                onClick={handleRetryLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${retryingLoad ? 'animate-spin' : ''}`} />
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex-1 py-2.5 px-4 rounded-xl border border-subtle bg-canvas hover:bg-surface text-main font-semibold text-sm transition-colors cursor-pointer"
              >
                Reset session
              </button>
            </div>
            <p className="text-[11px] text-mut leading-relaxed break-words pt-1">
              {diagnosticParts.length > 0
                ? `Stopped at: ${diagnosticParts.join(' · ')}`
                : 'Stopped at: initial data loading'}
            </p>
          </div>
        </div>
      );
    }

    if (isViewer || loading || publicBrandingLoading) {
      return (
        <div
          className="min-h-[100dvh] w-full bg-white"
          aria-busy="true"
          aria-label="Loading"
        />
      );
    }

    return <PageLoading fullScreen label="Loading..." />;
  }

  if (isViewer && !viewerUnlocked) {
    return (
      <>
        <ViewerPasscodeScreen />
        <SecretSecretaryLoginController />
      </>
    );
  }

  const effectiveTab = isViewer && !VIEWER_ALLOWED_TABS.has(currentTab)
    ? (currentTab === 'regular-services' ? 'schedules' : 'home')
    : currentTab;

  return (
    <div className={`min-h-screen flex flex-col bg-canvas text-main font-sans selection:bg-accent-tint selection:text-accent${isViewer ? ' viewer-motion' : ''}`}>
      {showViewerWelcome && (
        <ViewerWelcomeOverlay
          churchName={settings.churchName || publicBranding.churchName}
          churchLogo={settings.churchLogo || publicBranding.churchLogo}
          accentColor={publicBranding.accentColor}
          isDataLoading={isAppLoading}
          onDone={dismissViewerWelcome}
        />
      )}

      {!isAppLoading && (
        <>
          <Header
            currentTab={effectiveTab}
            onNavigate={handleNavigate}
            onOpenViewerNote={() => setViewerNoteModalOpen(true)}
          />

          {/* Persistent Cloud Save Failure Banner */}
          {cloudError && !isViewer && (
            <div className="sticky top-16 z-50 w-full bg-red-600 dark:bg-red-700 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-white" />
                <span>
                  <strong>Not saved to the cloud:</strong> [{cloudError.code}] {cloudError.message}
                </span>
                {cloudError.path && (
                  <span className="opacity-80 text-xs hidden md:inline">
                    ({cloudError.path})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {cloudError.retryFn && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await cloudError.retryFn!();
                      } catch (e) {
                        // Handled inside retryFn
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white text-red-700 font-bold text-xs hover:bg-zinc-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearCloudError}
                  className="p-1 rounded-lg hover:bg-red-700 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isViewer ? (
            <ViewerSwipeContainer
              currentTab={effectiveTab}
              onNavigate={handleNavigate}
              disabled={viewerNoteModalOpen || isAppLoading || showViewerWelcome}
            >
              <main className="flex-1 pb-6 md:pb-12">
                {effectiveTab === 'home' && (
                  <HomePage
                    onNavigate={handleNavigate}
                    onOpenVisitorsToFollowUp={() => {}}
                  />
                )}
                {effectiveTab === 'calendar' && <CalendarPage />}
                {effectiveTab === 'schedules' && <SchedulesPage onNavigate={handleNavigate} />}
                {effectiveTab === 'ministries' && <PeopleMinistriesPage />}
                {effectiveTab === 'lessons' && <LessonsPage />}
                {effectiveTab === 'prayer-wall' && <PrayerWallPage />}
              </main>
            </ViewerSwipeContainer>
          ) : (
            <main className="flex-1 pb-16">
              {effectiveTab === 'home' && (
                <HomePage
                  onNavigate={handleNavigate}
                  onOpenVisitorsToFollowUp={() => {
                    setVisitorInitialFollowUp('To follow up');
                    setCurrentTab('visitors');
                  }}
                />
              )}
              {effectiveTab === 'calendar' && <CalendarPage />}
              {effectiveTab === 'regular-services' && <RegularServicesPage />}
              {effectiveTab === 'schedules' && <SchedulesPage onNavigate={handleNavigate} />}
              {effectiveTab === 'announcements' && <AnnouncementsPage />}
              {effectiveTab === 'portal-lessons' && <PortalLessonsPage />}
              {effectiveTab === 'people-ministries' && <PeopleMinistriesPage />}
              {effectiveTab === 'settings' && <SettingsPage />}
              {effectiveTab === 'message-templates' && <MessageTemplatesPage onNavigate={handleNavigate} />}
              {effectiveTab === 'tasks' && <TasksPage />}
              {effectiveTab === 'quick-notes' && <QuickNotesPage onNavigate={handleNavigate} />}
              {effectiveTab === 'viewer-notes' && <ViewerNotesPage />}
              {(effectiveTab === 'forerunner-studio' || effectiveTab === 'sunday-school') && (
                <ForerunnerStudioPage onNavigate={handleNavigate} />
              )}
              {effectiveTab === 'visitors' && (
                <VisitorsPage
                  initialFollowUpFilter={visitorInitialFollowUp}
                  onConsumeInitialFilter={() => setVisitorInitialFollowUp(undefined)}
                />
              )}
            </main>
          )}
        </>
      )}

      {/* Floating round Quick Note button on Secretary pages other than Home and Quick Notes */}
      {!isViewer && effectiveTab !== 'home' && effectiveTab !== 'quick-notes' && (
        <FloatingQuickNoteButton />
      )}

      {/* Floating Note to Secretary button on phones for Viewers */}
      {isViewer && !isAppLoading && (
        <FloatingViewerNoteButton onClick={() => setViewerNoteModalOpen(true)} />
      )}

      {/* Mobile bottom navigation bar for Viewers */}
      {isViewer && !isAppLoading && (
        <ViewerBottomNav currentTab={effectiveTab} onNavigate={handleNavigate} />
      )}

      {/* Viewer Note to Secretary modal */}
      {isViewer && (
        <ViewerNoteModal
          isOpen={viewerNoteModalOpen}
          onClose={() => setViewerNoteModalOpen(false)}
        />
      )}

      {/* Automatic Idle Logout Controller */}
      <IdleLogoutController />

      {/* Scroll to top when navigating between pages */}
      <ScrollToTop pageKey={effectiveTab} />

      {/* Back to top pill for long pages */}
      <BackToTop hidden={isAppLoading || showViewerWelcome} />

      {/* Quiet, calm church footer */}
      {isViewer ? (
        <ViewerFooterAndLogin onNavigate={handleNavigate} />
      ) : (
        <footer className="border-t border-subtle bg-surface text-xs text-mut viewer-scroll-section py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-main">{settings.churchName || publicBranding.churchName || 'Our Church'}</span>
              <span>·</span>
              <span>Secretary Companion</span>
            </div>
            <div className="flex items-center gap-4 text-sec">
              <span>Local Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              <span>·</span>
              <span>All Data Encrypted & Authenticated</span>
            </div>
          </div>
        </footer>
      )}

      {/* Hidden #/secretary-login route modal trigger */}
      {isViewer && <SecretSecretaryLoginController />}

      {/* Global Bottom-Center Save Status Pill */}
      {!isViewer && <SaveStatusPill />}
    </div>
  );
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred while loading the app.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught app error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-canvas text-main">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-subtle shadow-card p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-main">Unable to load the page</h2>
              <p className="text-sm text-sec leading-relaxed">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Reload page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <DocumentTitleSync />
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
