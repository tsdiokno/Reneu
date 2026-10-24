import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { PWAInstructionsModal } from './PWAInstructionsModal';

export const PWAInstallButton: React.FC = () => {
  const { deferredPrompt, isInstalled, platform, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already installed, hide the button completely
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-sans font-medium text-[var(--text-primary)] hover:underline focus-visible:outline-none transition-colors shrink-0 cursor-pointer h-11 px-2.5 inline-flex items-center gap-1.5"
        title="Install Reneu to your device"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Install as App</span>
      </button>

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

export default PWAInstallButton;
