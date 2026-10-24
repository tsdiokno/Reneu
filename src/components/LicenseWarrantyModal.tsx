import React from 'react';
import { Modal } from './Modal';

export interface LicenseWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseWarrantyModal: React.FC<LicenseWarrantyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="License & Warranty"
      description="Open-source MIT license, disclaimers, and copyright notices"
      maxWidthClassName="max-w-lg"
      closeLabel="Close"
      ariaLabel="License and Warranty"
    >
      <div className="p-6 sm:p-7 pt-2 flex flex-col gap-4 font-sans text-sm text-[var(--text-primary)]/85 leading-relaxed">
        <p>
          Reneu is open-source software released under the MIT License. Copyright &copy; {new Date().getFullYear()} Reneu Contributors. Permission is granted to use, copy, modify, and distribute this software freely for personal or non-commercial study, subject to retaining copyright notices.
        </p>

        <p>
          The software is provided &quot;as is&quot;, without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and noninfringement.
        </p>

        <p>
          Scripture text is provided by the NET Bible® API (labs.bible.org). Quotations designated (NET) are from the NET Bible® copyright &copy;1996, 2019 by Biblical Studies Press, L.L.C. (netbible.com). All rights reserved. Quoted by permission.
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

export default LicenseWarrantyModal;
