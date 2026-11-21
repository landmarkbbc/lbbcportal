import React, { useEffect, useState } from 'react';
import { AlertCircle, Church, Eye, EyeOff, Lock, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './LoadingIndicator';

interface SecretaryLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecretaryLoginModal: React.FC<SecretaryLoginModalProps> = ({ isOpen, onClose }) => {
  const {
    login,
    createInitialAccount,
    isInitialSetup,
    publicBranding,
    authError,
    clearAuthError,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setLocalError(null);
    clearAuthError();
  }, [isOpen, clearAuthError]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSecretarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!username.trim()) {
      setLocalError('Please enter your username');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    if (isInitialSetup) {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isInitialSetup) {
        await createInitialAccount(username, password);
      } else {
        await login(username, password);
      }
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const secretaryErrorMessage = localError || authError;
  const churchDisplayName = publicBranding.churchName || 'Our Church';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs motion-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secretary-login-modal-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-surface border border-subtle shadow-xl p-6 sm:p-7 space-y-5 text-main motion-popup-in"
      >
        <button
          type="button"
          onClick={() => {
            if (!submitting) onClose();
          }}
          disabled={submitting}
          aria-label="Close secretary login"
          className="absolute top-3.5 right-3.5 w-11 h-11 rounded-lg flex items-center justify-center text-mut hover:text-main hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5 pt-1">
          <div className="mx-auto w-11 h-11 rounded-xl bg-accent-tint border border-accent/20 text-accent flex items-center justify-center mb-2">
            {publicBranding.churchLogo ? (
              <img
                src={publicBranding.churchLogo}
                alt={churchDisplayName}
                className="w-7 h-7 object-contain"
              />
            ) : (
              <Church className="w-5 h-5" />
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mut">
            {churchDisplayName}
          </span>
          <h2 id="secretary-login-modal-title" className="text-lg font-bold text-main">
            {isInitialSetup ? 'Set Up Secretary Account' : 'Secretary Sign In'}
          </h2>
          <p className="text-xs text-sec leading-relaxed">
            {isInitialSetup
              ? 'Create your primary secretary login to begin.'
              : 'Sign in to manage church schedules, members, and records.'}
          </p>
        </div>

        {isInitialSetup && (
          <div className="p-3.5 rounded-xl bg-subtle border border-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-sec">
              <span className="font-semibold text-main block mb-0.5">One-time initial setup</span>
              Create your administrative login. Subsequent launches will directly show the sign-in screen.
            </div>
          </div>
        )}

        {secretaryErrorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{secretaryErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSecretarySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sec uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mut">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="e.g. secretary or yourname"
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-subtle bg-field text-main placeholder:text-mut text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sec uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mut">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={isInitialSetup ? 'At least 6 characters' : 'Enter password'}
                className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl border border-subtle bg-field text-main placeholder:text-mut text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-mut hover:text-main transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isInitialSetup && (
            <div>
              <label className="block text-xs font-semibold text-sec uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mut">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Repeat password"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-subtle bg-field text-main placeholder:text-mut text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] mt-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {submitting ? (
              <>
                <Spinner size="xs" variant="contrast" label="Signing in" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>{isInitialSetup ? 'Create Account & Enter' : 'Sign In'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
