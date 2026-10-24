import React, { useState, useEffect } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  getSupabaseConfig,
  isSupabaseConfigured,
  type SupabaseUserProfile,
} from '../services/supabaseSync';
import { setSimulateLoggedOut } from '../utils/devSimulation';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Modal } from './Modal';
import { PWAInstructionsModal } from './PWAInstructionsModal';

interface LoginSplashProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  onAuthenticated?: (user: SupabaseUserProfile) => void;
}

export const LoginSplash: React.FC<LoginSplashProps> = ({
  isOpen,
  onClose,
  onContinueAsGuest,
  onAuthenticated,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);

  const {
    isInstalled,
    isDismissed,
    platform,
    deferredPrompt,
    install,
    dismissInstall,
  } = usePWAInstall();

  const supabaseConfig = getSupabaseConfig();
  const isConfigured = isSupabaseConfigured();

  // Handle Escape key to dismiss if user wants to continue reading
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinueAsGuest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinueAsGuest]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFeedback({ text: 'Please enter both an email address and password.', isError: true });
      return;
    }

    if (tab === 'signup' && password.length < 6) {
      setFeedback({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      if (tab === 'signup') {
        const res = await signUpWithEmail(email, password);
        if (res.success) {
          setSimulateLoggedOut(false);
          setFeedback({
            text: res.message || 'Registration successful! Check your inbox to verify your email, or sign in.',
            isError: false,
          });
          if (res.user && onAuthenticated) {
            onAuthenticated(res.user);
          }
        } else {
          setFeedback({ text: res.message, isError: true });
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (res.success) {
          setSimulateLoggedOut(false);
          setFeedback({ text: 'Welcome back! Signed in successfully.', isError: false });
          if (res.user && onAuthenticated) {
            onAuthenticated(res.user);
          }
          setTimeout(() => {
            onClose();
          }, 400);
        } else {
          setFeedback({ text: res.message, isError: true });
        }
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Authentication failed. Please try again.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setFeedback(null);
    try {
      const res = await signInWithOAuth('google');
      if (!res.success) {
        setFeedback({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Failed to start Google sign-in.', isError: true });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onContinueAsGuest}
      title="Account & Sync"
      description="A cloud account is required to sync across devices. Please sign in or create an account."
      maxWidthClassName="max-w-md"
      closeLabel="Continue as Guest"
      ariaLabel="Account & Sync"
    >
      {/* Content Body */}
      <div className="p-6 sm:p-7 pt-4 flex flex-col gap-4">
        {/* Social Auth (Google OAuth) */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)] hover:bg-[var(--text-primary)]/5 hover:border-[var(--text-primary)]/30 text-[var(--text-primary)] text-sm font-medium transition-all duration-150 cursor-pointer flex items-center justify-center gap-3 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Log In with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--line-subtle)]" />
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[var(--text-subtle)] select-none">
              or with email
            </span>
            <div className="flex-1 h-px bg-[var(--line-subtle)]" />
          </div>

          {/* Tab Selection */}
          <div className="flex rounded-xl p-1 bg-[var(--bg-app)] border border-[var(--line-subtle)]/70">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setFeedback(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setFeedback(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-subtle)] flex items-center justify-between">
                <span>Email Address</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-subtle)]/40 focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-3 text-[var(--text-subtle)] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-subtle)] flex items-center justify-between">
                <span>Password</span>
                {tab === 'signin' && (
                  <span className="text-[11px] text-[var(--text-subtle)] opacity-70">
                    Min. 6 chars
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pl-9 pr-10 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-subtle)]/40 focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-3 text-[var(--text-subtle)] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 ${
                  feedback.isError
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                }`}
              >
                <span className="font-medium">{feedback.text}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] hover:opacity-90 active:scale-[0.99] text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              <span>{tab === 'signup' ? 'Create Account' : 'Log In'}</span>
            </button>
          </form>

          {/* Privacy & Account Security Assurance */}
          <div className="p-3 rounded-xl bg-[var(--bg-app)]/60 border border-[var(--line-subtle)]/40 flex items-start gap-2.5 text-[11px] text-[var(--text-subtle)] leading-relaxed">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <div>
              <strong className="text-[var(--text-primary)] font-medium">Private &amp; Protected:</strong> Your personal commentary notes, prayers, and reflections are strictly encrypted and isolated to your personal account. Only you can access your notes.
            </div>
          </div>

          {/* Install as App Elicitation (Dismissible; hidden if already installed) */}
          {!isInstalled && !isDismissed && (
            <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)] flex flex-col gap-2.5 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Install as App
                    </span>
                    <span className="text-[11px] text-[var(--text-subtle)] leading-tight">
                      Use Reneu offline like a normal app with zero browser distractions.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissInstall(true)}
                  className="p-1 rounded-md text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors cursor-pointer shrink-0"
                  title="Do not show this again"
                  aria-label="Do not show this again"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)]/60">
                <button
                  type="button"
                  onClick={() => setIsInstructionsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Install as App</span>
                </button>

                <button
                  type="button"
                  onClick={() => dismissInstall(true)}
                  className="text-[11px] text-[var(--text-subtle)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Do not show this again
                </button>
              </div>
            </div>
          )}

          {/* Guest Access Alternative */}
          <div className="pt-1 border-t border-[var(--line-subtle)] flex flex-col items-center gap-1 text-center">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Continue as Guest</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="text-[10px] text-[var(--text-subtle)] opacity-70">
              No account required for reading. Notes remain locally on this device.
            </span>
          </div>
        </div>
      </Modal>

      <PWAInstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={() => setIsInstructionsModalOpen(false)}
        mode="install"
        initialPlatform={platform}
        deferredPrompt={deferredPrompt}
        onPromptInstall={install}
      />
    </>
  );
};

export default LoginSplash;
