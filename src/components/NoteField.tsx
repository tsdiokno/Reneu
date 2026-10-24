import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { extractScriptureTokens } from '../utils/referenceParser';
import { renderHighlightedText } from '../utils/fuzzySearch';

interface NoteFieldProps {
  verseNum: number;
  content: string;
  autoFocus?: boolean;
  placeholder?: string;
  isMobile?: boolean;
  searchQuery?: string;
  onUpdateContent: (value: string) => void;
  onTokenClick?: (token: string, sourceVerse: number, label?: string) => void;
  onDelete?: () => void;
}

interface TextPart {
  type: 'text';
  text: string;
}

interface TokenPart {
  type: 'token';
  label: string;
  tokenTarget: string;
}

type FormattedPart = TextPart | TokenPart;

const NoteFieldComponent: React.FC<NoteFieldProps> = ({
  verseNum,
  content,
  autoFocus = false,
  placeholder = 'Capture insight...',
  isMobile = false,
  searchQuery,
  onUpdateContent,
  onTokenClick,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(() => Boolean(autoFocus));
  const [localText, setLocalText] = useState<string>(content);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const latestLocalTextRef = useRef<string>(content);

  useEffect(() => {
    latestLocalTextRef.current = content;
    setLocalText(content);
  }, [content]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (newVal: string) => {
    setLocalText(newVal);
    latestLocalTextRef.current = newVal;
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      onUpdateContent(newVal);
      debounceTimerRef.current = null;
    }, 250);
  };

  const flushSave = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (latestLocalTextRef.current !== content) {
      onUpdateContent(latestLocalTextRef.current);
    }
  };

  useEffect(() => {
    if (autoFocus) {
      setIsEditing(true);
      // Wait for accordion slide to settle and prevent browser viewport jumping on focus
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus({ preventScroll: true });
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 270);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [isEditing, localText]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleBlur = () => {
    flushSave();
    setIsEditing(false);
  };

  const formattedContent: FormattedPart[] = useMemo(() => {
    if (!content || content.trim() === '') {
      return [];
    }

    const tokens = extractScriptureTokens(content);
    if (tokens.length === 0) {
      return [{ type: 'text', text: content }];
    }

    const parts: FormattedPart[] = [];
    let lastIndex = 0;

    for (const token of tokens) {
      if (token.startIndex > lastIndex) {
        parts.push({ type: 'text', text: content.slice(lastIndex, token.startIndex) });
      }
      parts.push({ type: 'token', label: token.label, tokenTarget: token.tokenTarget });
      lastIndex = token.endIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIndex) });
    }

    return parts;
  }, [content]);

  const handleDeleteAction = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalText('');
    latestLocalTextRef.current = '';
    if (onDelete) {
      onDelete();
    } else {
      onUpdateContent('');
    }
    setIsEditing(false);
  };

  if (!isEditing && content && content.trim().length > 0) {
    return (
      <div className="relative group/note flex items-start justify-between gap-2 w-full">
        <div
          id={`note-${verseNum}`}
          onClick={handleStartEdit}
          className="flex-1 text-[var(--text-secondary)] font-sans text-base leading-relaxed py-1 cursor-text transition-colors select-text"
        >
          {formattedContent.map((part, idx) => {
            if (part.type === 'text') {
              return (
                <React.Fragment key={idx}>
                  {renderHighlightedText(part.text, searchQuery)}
                </React.Fragment>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTokenClick?.(part.tokenTarget, verseNum, part.label);
                }}
                className="inline-flex items-baseline font-mono text-sm font-semibold text-[var(--text-primary)] hover:underline underline-offset-4 decoration-2 cursor-pointer transition-colors select-none mx-1 focus-visible:outline-none"
                title={`Click to view ${part.label}`}
              >
                {renderHighlightedText(part.label, searchQuery)}
              </button>
            );
          })}
        </div>

        {/* Minimalist Action Icons (Touch friendly: visible on mobile without hover) */}
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 sm:opacity-0 sm:group-hover/note:opacity-70 sm:hover:!opacity-100 transition-opacity shrink-0 pt-1">
          <button
            type="button"
            onClick={handleStartEdit}
            className="p-1.5 -m-0.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded flex items-center justify-center"
            title="Edit note"
            aria-label="Edit note"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAction();
              }}
              className="p-1.5 -m-0.5 text-[var(--text-subtle)] hover:text-rose-500 transition-colors cursor-pointer rounded flex items-center justify-center"
              title="Delete note"
              aria-label="Delete note"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }


  const lineCount = (localText.match(/\n/g) || []).length + 1;

  return (
    <div className="relative flex items-start justify-between gap-2 w-full">
      <textarea
        id={`note-${verseNum}`}
        ref={textareaRef}
        value={localText}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setIsEditing(true)}
        placeholder={placeholder}
        aria-label={`Commentary for verse ${verseNum}`}
        className="w-full bg-transparent text-[var(--text-primary)] font-sans text-base leading-relaxed py-1 resize-none outline-none border-none placeholder-[var(--input-placeholder)] focus-visible:outline-none min-h-12"
        rows={Math.max(1, lineCount)}
      />
      <div className="flex items-center gap-0.5 shrink-0 pt-0.5 text-[var(--text-subtle)]">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent blur before click
            handleBlur();
          }}
          className="w-10 h-10 sm:w-8 sm:h-8 p-2 sm:p-1.5 hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded flex items-center justify-center"
          title="Done editing"
          aria-label="Done editing"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        {onDelete && localText && localText.trim().length > 0 && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleDeleteAction();
            }}
            className="w-10 h-10 sm:w-8 sm:h-8 p-2 sm:p-1.5 hover:text-rose-500 transition-colors cursor-pointer rounded flex items-center justify-center"
            title="Delete note"
            aria-label="Delete note"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export const NoteField = React.memo(NoteFieldComponent);
export default NoteField;
