import React from 'react';
import { Modal } from './Modal';

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy"
      description="How your data and quiet reflections are handled"
      maxWidthClassName="max-w-lg"
      closeLabel="Close"
      ariaLabel="Privacy Policy"
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans text-sm text-[var(--text-primary)]/85 leading-relaxed">
        <p>
          Reneu is designed as a quiet, local-first sanctuary. By default, your personal verse commentaries, reflections, reading plan progress, and preferences persist directly on your device inside your browser&apos;s IndexedDB. You can read and journal completely offline without sending data to any external server.
        </p>

        <p>
          If you optionally choose to sign in or connect Supabase cloud sync, your notes and settings are transmitted over encrypted HTTPS, strictly isolated to your authenticated account with Row Level Security. We never monetize, sell, or rent your private study reflections.
        </p>

        <p>
          When using Intelligent Summaries with your personal Gemini API key, small batches of notes are sent securely to Google&apos;s API to generate summaries. Your key remains stored locally on your device. The app contains zero advertising networks, third-party analytics, or behavioral trackers.
        </p>

        <div className="pt-3 border-t border-[var(--line-subtle)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
