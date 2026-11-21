import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SecretaryLoginModal } from './SecretaryLoginModal';

function isSecretaryLoginRoute(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const clean = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    const segment = clean.split('/')[0].split('?')[0];
    return segment === 'secretary-login';
  } catch {
    return false;
  }
}

function clearSecretaryLoginHash(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isSecretaryLoginRoute()) return;
    const pathname = window.location.pathname || '/';
    window.history.replaceState(null, '', `${pathname}${window.location.search}#/`);
  } catch {
    // Ignore history errors cleanly
  }
}

export const SecretSecretaryLoginController: React.FC = () => {
  const { isViewer } = useAuth();
  const [modalOpen, setModalOpen] = useState<boolean>(() => isSecretaryLoginRoute());

  useEffect(() => {
    const syncFromHash = () => {
      if (isViewer && isSecretaryLoginRoute()) {
        setModalOpen(true);
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [isViewer]);

  useEffect(() => {
    if (!isViewer) {
      setModalOpen(false);
      clearSecretaryLoginHash();
    }
  }, [isViewer]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    clearSecretaryLoginHash();
  }, []);

  return <SecretaryLoginModal isOpen={modalOpen} onClose={handleClose} />;
};
