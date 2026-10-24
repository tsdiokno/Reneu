import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClassName?: string; // default: 'max-w-md'
  closeLabel?: string; // default: 'Close'
  ariaLabel?: string;
  hideHeader?: boolean;
}

/**
 * Unified Modal Component
 *
 * Ensures:
 * 1. Portaled to document.body so it is never trapped inside nested containers,
 *    max-width constraints, or animated/transformed elements.
 * 2. Viewport-anchored fixed positioning across the entire screen regardless of scroll position.
 * 3. Background scroll lock (`overflow: hidden` on document.body) while open.
 * 4. Consistent background blur and tint across desktop and mobile devices.
 * 5. Elevated z-index (z-[100]) above the bottom navigation dock and sticky headers.
 * 6. Maximum height clamping (`max-h-[min(90vh,calc(100dvh-2rem))]`) with smooth internal scrolling.
 * 7. Keyboard accessibility (Escape key dismiss, accessible aria-modal).
 * 8. Click outside backdrop to dismiss.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = 'max-w-md',
  closeLabel = 'Close',
  ariaLabel,
  hideHeader = false,
}) => {
  const modalCardRef = useRef<HTMLDivElement>(null);

  // Lock background body scroll whenever the modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscrollBehavior;
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'Modal dialog')}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 dark:bg-black/65 backdrop-blur-md animate-fade-in touch-none"
      onClick={(e) => {
        // Dismiss if clicked on the backdrop overlay itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Card */}
      <div
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClassName} rounded-2xl border border-[var(--line-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden font-sans flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] my-auto transition-all duration-300 touch-auto`}
      >
        {/* Top Dismiss / Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-95 transition-colors cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)]/20"
          title={`${closeLabel} (Esc)`}
          aria-label={closeLabel}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Optional Header */}
        {!hideHeader && (title || description) && (
          <div className="pt-6 sm:pt-7 px-6 sm:px-7 pb-2 flex flex-col gap-1.5 pr-12 shrink-0 border-b border-transparent">
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-[var(--text-subtle)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default Modal;
