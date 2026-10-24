import React from 'react';
import { Modal } from './Modal';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About Reneu"
      maxWidthClassName="max-w-lg"
      closeLabel="Close"
      ariaLabel="About Reneu"
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans text-sm text-[var(--text-primary)]/85 leading-relaxed">
        {/* Paragraph 1: Purpose & Romans 12:2 */}
        <p>
          Reneu is a quiet, distraction-free canvas for reading Scripture and recording verse-by-verse reflections, crafted to help you focus on God&apos;s Word and be transformed by the renewing of your mind (Romans 12:2). Your reading progress, commentaries, and plans remain private and local-first on your device.
        </p>

        {/* Paragraph 2: Assisted Intelligence & Open Source */}
        <p>
          For transparency, this application was developed with the assistance of artificial intelligence tooling for design, architecture, and code generation. It is an open-source project, and developer contributions, feedback, and pull requests are warmly welcomed on{' '}
          <a
            href="https://github.com/your-username/reneu"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-75 transition-opacity"
          >
            GitHub
          </a>
          .
        </p>

        {/* Paragraph 3: Scripture Attribution */}
        <p>
          Scripture quotations are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C.{' '}
          (<a
            href="http://netbible.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-75 transition-opacity"
          >
            netbible.com
          </a>
          ), accessed via the{' '}
          <a
            href="https://labs.bible.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-75 transition-opacity"
          >
            NET Bible API
          </a>
          . Quoted by permission with gratitude to Biblical Studies Press and the translators for making God&apos;s Word accessible.
        </p>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--line-subtle)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AboutModal;
