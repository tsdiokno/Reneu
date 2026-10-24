import React, { useState } from 'react';
import { Modal } from './Modal';
import type { DevicePlatform, BeforeInstallPromptEvent } from '../utils/usePWAInstall';

export interface PWAInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'uninstall';
  initialPlatform?: DevicePlatform;
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onPromptInstall?: () => Promise<boolean>;
}

function getPlatformDisplayName(platform: DevicePlatform): string {
  switch (platform) {
    case 'ios':
      return 'iOS / iPadOS';
    case 'android':
      return 'Android';
    case 'mac':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return 'Your Device';
  }
}

export const PWAInstructionsModal: React.FC<PWAInstructionsModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialPlatform = 'ios',
  deferredPrompt,
  onPromptInstall,
}) => {
  const [promptLoading, setPromptLoading] = useState(false);

  if (!isOpen) return null;

  const platform = initialPlatform;
  const platformName = getPlatformDisplayName(platform);
  const isInstall = mode === 'install';

  const handleDirectInstall = async () => {
    if (!onPromptInstall) return;
    setPromptLoading(true);
    try {
      const accepted = await onPromptInstall();
      if (accepted) {
        onClose();
      }
    } finally {
      setPromptLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isInstall ? 'Install Reneu as an App' : 'How to Uninstall Reneu'}
      description={
        isInstall
          ? 'Follow these steps to install Reneu for distraction-free, offline reading.'
          : 'Follow these steps to remove Reneu from your device.'
      }
      maxWidthClassName="max-w-lg"
      closeLabel="Close"
      ariaLabel={isInstall ? 'Install Reneu Instructions' : 'Uninstall Reneu Instructions'}
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans">

        {/* Chromium Direct Prompt Shortcut (if available during install) */}
        {isInstall && deferredPrompt && (platform === 'android' || platform === 'windows' || platform === 'mac' || platform === 'linux') && (
          <div className="p-3.5 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  One-Click Browser Install Ready
                </span>
                <span className="text-[11px] text-[var(--text-subtle)] truncate">
                  Your browser supports instant installation.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleDirectInstall()}
              disabled={promptLoading}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] hover:opacity-90 active:scale-95 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              {promptLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>Install Now</span>
            </button>
          </div>
        )}

        {/* Step-by-Step Instructions Container */}
        <div className="flex flex-col gap-3">
          {/* iOS / iPadOS Instructions */}
          {platform === 'ios' && (
            isInstall ? (
              <div className="flex flex-col gap-3">
                {/* Safari notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="leading-relaxed">
                    <strong>Safari Required:</strong> Apple requires opening Reneu in <strong>Safari</strong> (not in-app browser webviews) to add web apps to your Home Screen.
                  </p>
                </div>

                <ol className="flex flex-col gap-2.5">
                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      Tap the <strong className="font-semibold">Share</strong> button in Safari toolbar:
                      <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--line-subtle)] text-[11px] font-medium text-[var(--text-primary)]">
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        <span>Share icon (square with upward arrow)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                        Located at the bottom of the screen on iPhone, or top-right on iPad.
                      </p>
                    </div>
                  </li>

                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      Scroll down the share sheet and tap <strong className="font-semibold">Add to Home Screen</strong>:
                      <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--line-subtle)] text-[11px] font-medium text-[var(--text-primary)]">
                        <svg className="w-4 h-4 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span>Add to Home Screen</span>
                      </div>
                    </div>
                  </li>

                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      Tap <strong className="font-semibold">Add</strong> in the top-right corner of the confirmation screen.
                      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                        Reneu will immediately appear on your Home Screen as an independent, full-screen app with offline capabilities.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <ol className="flex flex-col gap-2.5">
                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      Go to your iPhone or iPad <strong className="font-semibold">Home Screen</strong> and find the <strong className="font-semibold">Reneu</strong> app icon.
                    </div>
                  </li>

                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      <strong className="font-semibold">Touch and hold (long-press)</strong> the Reneu icon until the quick actions menu appears.
                    </div>
                  </li>

                  <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                      Tap <strong className="text-rose-600 dark:text-rose-400 font-semibold">Delete Bookmark</strong> (or <strong className="font-semibold">Remove App &rarr; Delete App</strong>), then confirm <strong className="font-semibold">Delete</strong>.
                      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                        Your notes and reading preferences stay safely preserved in local storage.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            )
          )}

          {/* Android Instructions */}
          {platform === 'android' && (
            isInstall ? (
              <ol className="flex flex-col gap-2.5">
                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Tap the browser <strong className="font-semibold">menu icon</strong> (three vertical dots <span className="font-mono font-bold">⋮</span>) in the top-right corner of Chrome, Edge, or Samsung Internet.
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Tap <strong className="font-semibold">Install app</strong> (or <strong className="font-semibold">Add to Home screen</strong>).
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--line-subtle)] text-[11px] font-medium text-[var(--text-primary)]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Install app / Add to Home screen</span>
                    </div>
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Confirm by tapping <strong className="font-semibold">Install</strong> in the dialog.
                    <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                      Reneu will install directly to your device and appear in your App Drawer and Home Screen.
                    </p>
                  </div>
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-2.5">
                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Locate the <strong className="font-semibold">Reneu</strong> app icon in your Android App Drawer or on your Home Screen.
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    <strong className="font-semibold">Touch and hold</strong> the Reneu icon.
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Tap the <strong className="text-rose-600 dark:text-rose-400 font-semibold">Uninstall</strong> (trash can) button or drag the icon up to the Uninstall target at the top of the screen.
                    <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                      You can also uninstall via Chrome Settings &rarr; Apps &rarr; Reneu.
                    </p>
                  </div>
                </li>
              </ol>
            )
          )}

          {/* macOS Instructions */}
          {platform === 'mac' && (
            isInstall ? (
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                    <span>In Safari (macOS Sonoma or later)</span>
                  </div>
                  <ol className="text-xs text-[var(--text-subtle)] flex flex-col gap-1.5 pl-5 list-decimal leading-relaxed">
                    <li>Click <strong className="text-[var(--text-primary)]">File</strong> in the top menu bar &rarr; select <strong className="text-[var(--text-primary)]">Add to Dock...</strong> (or click the Share button in Safari toolbar &rarr; Add to Dock).</li>
                    <li>Click <strong className="text-[var(--text-primary)]">Add</strong> in the popup dialog.</li>
                    <li>Reneu will appear in your Dock and Launchpad, opening in its own clean Mac window.</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="4" />
                      <line x1="21.17" y1="8" x2="12" y2="8" />
                      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                    </svg>
                    <span>In Google Chrome / Microsoft Edge / Brave</span>
                  </div>
                  <ol className="text-xs text-[var(--text-subtle)] flex flex-col gap-1.5 pl-5 list-decimal leading-relaxed">
                    <li>Look for the <strong className="text-[var(--text-primary)]">Install</strong> icon (computer with downward arrow or <span className="font-mono">⊕</span>) on the right side of the address bar.</li>
                    <li>Click it &rarr; select <strong className="text-[var(--text-primary)]">Install</strong>.</li>
                    <li>Alternatively, click the menu (<span className="font-mono font-bold">⋮</span>) &rarr; <strong className="text-[var(--text-primary)]">Save and share</strong> &rarr; <strong className="text-[var(--text-primary)]">Install Reneu...</strong></li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    If installed via Safari (Web App in Dock):
                  </span>
                  <ol className="text-xs text-[var(--text-subtle)] flex flex-col gap-1.5 pl-5 list-decimal leading-relaxed">
                    <li>Open <strong className="text-[var(--text-primary)]">Finder</strong> and navigate to your user&apos;s <strong className="text-[var(--text-primary)]">Applications</strong> folder (<code className="font-mono text-[11px]">~/Applications</code>).</li>
                    <li>Right-click <strong className="text-[var(--text-primary)]">Reneu</strong> and select <strong className="text-rose-600 dark:text-rose-400 font-semibold">Move to Trash</strong>.</li>
                    <li>Remove from Dock by right-clicking the Dock icon &rarr; <strong className="text-[var(--text-primary)]">Options &rarr; Remove from Dock</strong>.</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    If installed via Chrome / Edge:
                  </span>
                  <ol className="text-xs text-[var(--text-subtle)] flex flex-col gap-1.5 pl-5 list-decimal leading-relaxed">
                    <li>Open the installed Reneu app window.</li>
                    <li>Click the three dots (<span className="font-mono font-bold">⋮</span>) in the top title bar.</li>
                    <li>Select <strong className="text-rose-600 dark:text-rose-400 font-semibold">Uninstall Reneu...</strong> and click <strong className="text-[var(--text-primary)]">Remove</strong>.</li>
                  </ol>
                </div>
              </div>
            )
          )}

          {/* Windows Instructions */}
          {platform === 'windows' && (
            isInstall ? (
              <ol className="flex flex-col gap-2.5">
                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Look for the <strong className="font-semibold">Install</strong> icon (computer monitor with downward arrow, or <span className="font-mono">⊕</span>) on the right side of the browser address bar in Chrome, Edge, or Brave.
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Click the icon, then click <strong className="font-semibold">Install</strong>.
                    <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                      Alternatively, click the browser menu (<span className="font-mono font-bold">⋮</span>) &rarr; <strong className="font-semibold">Save and share</strong> (or <strong className="font-semibold">Apps</strong>) &rarr; <strong className="font-semibold">Install Reneu...</strong>
                    </p>
                  </div>
                </li>

                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Reneu opens in a dedicated window and can be pinned to your <strong className="font-semibold">Taskbar</strong> or <strong className="font-semibold">Start Menu</strong>.
                  </div>
                </li>
              </ol>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Option A: From the Reneu App Window
                  </span>
                  <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
                    Open the Reneu app window &rarr; click the three dots (<span className="font-mono font-bold">⋮</span> or <span className="font-mono font-bold">⋯</span>) in the title bar &rarr; select <strong className="text-rose-600 dark:text-rose-400 font-semibold">Uninstall Reneu...</strong> &rarr; click <strong className="text-[var(--text-primary)]">Remove</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Option B: From Windows Settings
                  </span>
                  <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
                    Open Windows <strong className="text-[var(--text-primary)]">Settings</strong> &rarr; <strong className="text-[var(--text-primary)]">Apps</strong> &rarr; <strong className="text-[var(--text-primary)]">Installed Apps</strong> &rarr; search for <strong>Reneu</strong> &rarr; click menu (<span className="font-mono font-bold">⋯</span>) &rarr; select <strong className="text-rose-600 dark:text-rose-400 font-semibold">Uninstall</strong>.
                  </p>
                </div>
              </div>
            )
          )}

          {/* Linux Instructions */}
          {platform === 'linux' && (
            isInstall ? (
              <ol className="flex flex-col gap-2.5">
                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    In Chrome, Chromium, Brave, or Edge, click the <strong className="font-semibold">Install</strong> icon in the address bar.
                  </div>
                </li>
                <li className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1 text-xs text-[var(--text-primary)] leading-relaxed">
                    Click <strong className="font-semibold">Install</strong>. Reneu is registered to your desktop launcher (GNOME, KDE, or desktop app menu).
                  </div>
                </li>
              </ol>
            ) : (
              <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-app)]/50 flex flex-col gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Uninstall from Chrome / Chromium:
                </span>
                <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
                  Open the Reneu app window &rarr; click the three dots (<span className="font-mono font-bold">⋮</span>) in the title bar &rarr; select <strong className="text-rose-600 dark:text-rose-400 font-semibold">Uninstall Reneu...</strong> &rarr; confirm <strong className="text-[var(--text-primary)]">Remove</strong>.
                </p>
              </div>
            )
          )}
        </div>

        {/* Reassurance Footer */}
        <div className="p-3 rounded-xl bg-[var(--bg-app)]/70 border border-[var(--line-subtle)]/50 flex items-start gap-2.5 text-[11px] text-[var(--text-subtle)] leading-relaxed">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <div>
            <strong className="text-[var(--text-primary)] font-medium">Your data stays safe:</strong> {isInstall
              ? 'All personal notes, verse reflections, and reading history carry over seamlessly when running as an app.'
              : 'Uninstalling removes the standalone app shortcut. Your personal notes remain stored on this device in browser storage and in your cloud sync account.'}
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PWAInstructionsModal;
