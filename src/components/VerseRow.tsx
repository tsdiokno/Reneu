import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { VerseToken } from '../types/bible';
import { NoteField } from './NoteField';
import { sanitizeVerseHtml } from '../utils/sanitizeHtml';

interface VerseRowProps {
  verse: VerseToken;
  bookName: string;
  bookAbbr: string;
  chapter: number;
  noteContent?: string;
  hasNote: boolean;
  isNoteActive: boolean;
  isFocused: boolean;
  isMobile: boolean;
  readerFontSizeClass: string;
  readerLineSpacingClass: string;
  onVerseRowClick: (verseNum: number) => void;
  onVerseNumberClick: (v: VerseToken, e: React.MouseEvent) => void;
  onUpdateContent: (verseNum: number, text: string) => void;
  onDeleteNote: (verseNum: number) => void;
  onTokenClick: (token: string, sourceVerse: number, label?: string) => void;
}

export const VerseRow: React.FC<VerseRowProps> = React.memo(({
  verse,
  bookAbbr,
  chapter,
  noteContent,
  hasNote,
  isNoteActive,
  isFocused,
  isMobile,
  readerFontSizeClass,
  readerLineSpacingClass,
  onVerseRowClick,
  onVerseNumberClick,
  onUpdateContent,
  onDeleteNote,
  onTokenClick,
}) => {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const isTouchingRef = useRef<boolean>(false);

  const [hasMounted, setHasMounted] = useState<boolean>(false);

  // Memoize sanitized HTML for security (XSS prevention) and performance (no re-parsing on unrelated renders)
  const sanitizedHtml = useMemo(
    () => ({ __html: sanitizeVerseHtml(verse.text) }),
    [verse.text]
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Programmatically pre-selects the entire verse text block as an atomic unit
  const selectVerseText = useCallback(() => {
    if (!textRef.current) return;
    try {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {}
  }, []);

  // Intercept any mobile browser attempts to highlight individual words during long-press touch
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!isTouchingRef.current || !textRef.current) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      // If the selection is inside this verse text, enforce whole-verse selection only
      if (textRef.current.contains(range.commonAncestorContainer)) {
        const fullText = textRef.current.textContent?.trim() || '';
        const selectedText = selection.toString().trim();
        // If the browser selected an individual word instead of the whole verse, expand immediately
        if (selectedText.length > 0 && selectedText !== fullText) {
          selectVerseText();
          isLongPressRef.current = true;
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [selectVerseText]);

  const handleMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (e.button === 0) {
      // Normal left click: prevent default text drag/highlight so simple click never highlights text
      e.preventDefault();
      // Clear any prior selection to ensure clean visual appearance
      window.getSelection()?.removeAllRanges();
    } else if (e.button === 2) {
      // Right click: pre-select entire verse text before browser opens context menu
      selectVerseText();
    }
  };

  const handleContextMenu = () => {
    // Pre-select entire verse text block and allow native browser context menu to open with "Copy"
    selectVerseText();
    isLongPressRef.current = true;
    setTimeout(() => {
      isLongPressRef.current = false;
    }, 400);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLSpanElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;
    isTouchingRef.current = true;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    // Early long press trigger (300ms) to preempt mobile browser individual word selection
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      selectVerseText();
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLSpanElement>) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // Cancel long press if user drags or scrolls
    if (dx > 8 || dy > 8) {
      isTouchingRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  const handleTouchEnd = () => {
    isTouchingRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressRef.current) {
      setTimeout(() => {
        isLongPressRef.current = false;
      }, 350);
    }
  };

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Do not toggle note if this was a long-press or right-click
    if (isLongPressRef.current || e.button !== 0) {
      isLongPressRef.current = false;
      return;
    }
    // Clear any transient selection so simple tap leaves zero highlight
    window.getSelection()?.removeAllRanges();
    onVerseRowClick(verse.verse);
  };

  return (
    <div
      id={`verse-${verse.verse}`}
      className="verse-row-container grid grid-cols-1 lg:grid-cols-12 gap-y-0 lg:gap-x-16 items-start group relative py-1.5 md:py-2"
    >
      {/* Verse column (Left column) - aligned to text baseline */}
      <div className="lg:col-span-7 xl:col-span-6 lg:pl-12 max-w-2xl mx-auto lg:mx-0 w-full flex items-baseline">
        {/* Verse number container - sits right on the baseline of the first line of text */}
        <div className="inline-flex items-baseline justify-end gap-1 mr-3 lg:mr-4 shrink-0 select-none w-7 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerseNumberClick(verse, e);
            }}
            title={`Copy reference (${bookAbbr} ${chapter}:${verse.verse})`}
            aria-label={`Copy reference for ${bookAbbr} ${chapter}:${verse.verse}`}
            className="relative text-xs font-sans font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none cursor-pointer select-none leading-none before:absolute before:-inset-2 before:content-['']"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {verse.verse}
          </button>
          {hasNote && (
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shrink-0 ${
                isNoteActive
                  ? 'bg-[var(--text-primary)] opacity-80 scale-100'
                  : 'bg-[var(--text-subtle)] opacity-60'
              }`}
              style={{ transform: 'translateY(-2px)' }}
              title={isNoteActive ? 'Commentary note exposed' : 'Has commentary — click verse text to view'}
              aria-label={isNoteActive ? 'Commentary note exposed' : 'Has commentary — click verse text to view'}
            />
          )}
        </div>

        {/* Clickable verse text ONLY - pre-selects on right-click/long-press for native context menu */}
        <span
          ref={textRef}
          role="button"
          tabIndex={0}
          onClick={handleTextClick}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onVerseRowClick(verse.verse);
            }
          }}
          title={isNoteActive ? 'Click text to hide note' : 'Click text to expose note'}
          className={`${readerFontSizeClass} ${readerLineSpacingClass} text-[var(--text-primary)] cursor-pointer select-all outline-none focus:outline-none active:outline-none [-webkit-tap-highlight-color:transparent]`}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitUserSelect: 'all',
            userSelect: 'all',
            outline: 'none',
          }}
          dangerouslySetInnerHTML={sanitizedHtml}
        />
      </div>

      {/* Note (Right column on desktop, below on mobile) - Hardware-elevated CSS Grid Accordion */}
      <div className="lg:col-span-5 xl:col-span-6 w-full">
        <div
          className={`verse-accordion-grid ${
            isNoteActive ? 'is-open' : 'is-collapsed'
          } ${!hasMounted ? 'no-transition' : ''}`}
          onClick={(e) => e.stopPropagation()}
          aria-hidden={!isNoteActive}
        >
          <div className="verse-accordion-content">
            <div className="pt-2 lg:pt-0">
              <div className="flex gap-4 items-start pl-8 lg:pl-0">
                <div className="hidden lg:block w-7 text-right shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerseNumberClick(verse, e);
                    }}
                    className="text-xs font-sans font-semibold text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:underline select-none focus-visible:outline-none cursor-pointer"
                    title={`Copy reference (${bookAbbr} ${chapter}:${verse.verse})`}
                    aria-label={`Copy reference for ${bookAbbr} ${chapter}:${verse.verse}`}
                  >
                    {verse.verse}
                  </button>
                </div>
                <div className="flex-1 pr-4 lg:pr-8">
                  <NoteField
                    verseNum={verse.verse}
                    content={noteContent || ''}
                    onUpdateContent={(text) => onUpdateContent(verse.verse, text)}
                    onTokenClick={onTokenClick}
                    onDelete={() => onDeleteNote(verse.verse)}
                    autoFocus={isFocused && !hasNote}
                    placeholder="Capture insight..."
                    isMobile={isMobile}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VerseRow.displayName = 'VerseRow';
export default VerseRow;
