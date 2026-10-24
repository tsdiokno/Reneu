import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { PWAInstructionsModal } from './PWAInstructionsModal';

export const SplashInstallBanner: React.FC = () => {
  const {
    isInstalled,
    isDismissed,
    platform,
    deferredPrompt,
    install,
    dismissInstall,
  } = usePWAInstall();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already installed or user dismissed with "do not show this again", do not render
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleDismiss = () => {
    dismissInstall(true);
  };

  return (
    <>
      <aside
        role="region"
        aria-label="Install Reneu App"
        className="w-full bg-[var(--bg-surface)] border-b border-[var(--line-subtle)] px-4 py-2.5 sm:px-6 transition-all duration-300 relative z-30"
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Install Reneu as an App
              </span>
              <span className="text-[11.5px] text-[var(--text-subtle)] truncate">
                Use Reneu offline with zero browser clutter, fast launching, and full local storage.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install as App</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors cursor-pointer whitespace-nowrap"
              title="Do not show this again"
            >
              Do not show again
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-full text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors cursor-pointer"
              title="Dismiss (Do not show this again)"
              aria-label="Dismiss install banner"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <PWAInstructionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="install"
        initialPlatform={platform}
        deferredPrompt={deferredPrompt}
        onPromptInstall={install}
      />
    </>
  );
};

export default SplashInstallBanner;
