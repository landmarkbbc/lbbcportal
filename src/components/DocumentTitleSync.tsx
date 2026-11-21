import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const DocumentTitleSync: React.FC = () => {
  const { currentUser, isViewer, publicBranding } = useAuth();
  const { settings } = useData();

  const isAuthenticatedSession = Boolean(currentUser && !isViewer);
  const churchName = (
    (isAuthenticatedSession ? settings.churchName : publicBranding.churchName) ||
    publicBranding.churchName ||
    ''
  ).trim();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const subtitle = isViewer ? 'Church Portal' : 'Secretary Companion';
    document.title = churchName ? `${churchName} - ${subtitle}` : subtitle;
  }, [churchName, isViewer]);

  return null;
};
