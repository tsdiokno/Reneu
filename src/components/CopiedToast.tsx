import React, { useState, useEffect, useRef } from 'react';

interface CopiedToastProps {
  toast: { reference: string } | null;
  onDismiss?: () => void;
  duration?: number;
}

export const CopiedToast: React.FC<CopiedToastProps> = ({
  toast,
  onDismiss,
  duration = 2400,
}) => {
  // Pre-loaded in DOM: stores active reference so it never blanks during transition
  const [displayReference, setDisplayReference] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isBumping, setIsBumping] = useState<boolean>(false);
  const [hasEverOpened, setHasEverOpened] = useState<boolean>(false);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (toast) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);

      setDisplayReference(toast.reference);
      setHasEverOpened(true);

      if (isOpen) {
        // If already open, trigger a tactile bump and reset auto-dismiss timer
        setIsBumping(true);
        if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
        bumpTimerRef.current = setTimeout(() => {
          setIsBumping(false);
        }, 160);

        dismissTimerRef.current = setTimeout(() => {
          setIsOpen(false);
          setTimeout(() => {
            onDismissRef.current?.();
          }, 320);
        }, duration);
      } else {
        // Pre-loaded element: a brief frame delay (25ms) ensures the browser
        // establishes the initial transform/opacity state before transitioning
        openTimerRef.current = setTimeout(() => {
          setIsOpen(true);
        }, 25);

        dismissTimerRef.current = setTimeout(() => {
          setIsOpen(false);
          setTimeout(() => {
            onDismissRef.current?.();
          }, 320);
        }, duration + 25);
      }
    } else {
      // Externally dismissed (e.g. Escape key pressed)
      if (isOpen) {
        setIsOpen(false);
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
      }
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    };
  }, [toast, duration, isOpen]);

  // Preloaded in DOM: persists across renders so browser never drops transition frames
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isOpen}
      className="fixed bottom-24 sm:bottom-28 left-1/2 z-50 select-none max-w-[90vw]"
      style={{
        transform: `translate(-50%, ${isOpen ? (isBumping ? '-4px' : '0px') : '16px'}) scale(${
          isOpen ? (isBumping ? '1.04' : '1') : '0.90'
        })`,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        visibility: hasEverOpened ? 'visible' : 'hidden',
        transition:
          'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full font-sans text-xs tracking-normal backdrop-blur-md"
        style={{
          backgroundColor: 'var(--toast-bg)',
          color: 'var(--toast-text)',
          border: '1px solid var(--toast-border)',
        }}
      >
        {/* Animated Checkmark Icon */}
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
          style={{ color: 'var(--toast-icon)' }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <span className="truncate" style={{ color: 'var(--toast-subtext)' }}>
          Copied{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--toast-highlight)' }}
          >
            {displayReference || 'Verse'}
          </span>{' '}
          to clipboard
        </span>
      </div>
    </div>
  );
};

export default CopiedToast;
