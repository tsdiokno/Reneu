import React from 'react';
import { Modal } from './Modal';

export interface SynthesisFrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SynthesisFrameworkModal: React.FC<SynthesisFrameworkModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How it Works"
      maxWidthClassName="max-w-lg"
      closeLabel="Close"
      ariaLabel="How it Works"
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans text-sm text-[var(--text-primary)]/85 leading-relaxed">
        <p>
          As you journal your reflections, Intelligent Summaries periodically sample your notes to surface recurring themes across Scripture. Grounded in a baptistic-evangelical framework—Scripture interpreting Scripture, Christ-centered unity, and respect for individual conviction—they weave shared insights into concise summaries with direct verse citations, quietly updating a background profile of your study themes only after a successful synthesis.
        </p>

        <p>
          Intelligent Summaries provide an automated pattern-matching assistant, not an inerrant commentator, pastor, or counselor. Because language models can misread context or make mistakes, always test every observation against the inspired text itself (Acts 17:11; 1 Thess 5:21). Automated summaries are never authoritative doctrine or spiritual guidance.
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

export default SynthesisFrameworkModal;
