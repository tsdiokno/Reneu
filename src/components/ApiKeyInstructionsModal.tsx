import React from 'react';
import { Modal } from './Modal';

export interface ApiKeyInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyInstructionsModal: React.FC<ApiKeyInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Get a Free Gemini API Key"
      description="Google provides a generous free tier for personal use. It takes less than 2 minutes and no credit card is required."
      maxWidthClassName="max-w-lg"
      closeLabel="Close guide"
      ariaLabel="How to get a free Gemini API key guide"
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans text-sm text-[var(--text-primary)]/85 leading-relaxed">
        <ol className="list-decimal list-inside flex flex-col gap-3">
          <li>
            Visit{' '}
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-75 transition-opacity"
            >
              aistudio.google.com
            </a>{' '}
            and sign in with your Google account.
          </li>
          <li>
            Click the &ldquo;Get API key&rdquo; button in the left navigation.
          </li>
          <li>
            Click &ldquo;Create API key&rdquo; and copy the key string.
          </li>
          <li>
            Paste the key into the Gemini API Key input in Settings and click Test Key.
          </li>
        </ol>

        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          Google&apos;s free tier includes ample daily queries for personal study. Your key is stored locally on this device and never shared.
        </p>

        <div className="pt-3 border-t border-[var(--line-subtle)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer text-center"
          >
            Close
          </button>

          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3.5 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium hover:opacity-90 transition-opacity text-center cursor-pointer"
          >
            Open Google AI Studio
          </a>
        </div>
      </div>
    </Modal>
  );
};

export default ApiKeyInstructionsModal;
