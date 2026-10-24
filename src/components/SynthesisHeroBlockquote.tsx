import React, { useMemo } from 'react';
import type { FootnoteReference } from '../types/bible';
import { NoteField } from './NoteField';
import { cleanNaturalSynthesis } from '../utils/synthesisText';
import { renderHighlightedText } from '../utils/fuzzySearch';

interface SynthesisHeroBlockquoteProps {
  quoteText: string;
  footnotes?: FootnoteReference[];
  userCommentary: string;
  onUpdateCommentary: (newCommentary: string) => void;
  onNavigateReference: (reference: string) => void;
  isMobile?: boolean;
  searchQuery?: string;
  // Optional parameters kept for compatibility
  title?: string;
  timestamp?: number;
  isStreamItem?: boolean;
  onSaveToStream?: () => void;
  isSaved?: boolean;
  onDismiss?: () => void;
  onDelete?: () => void;
}

export const SynthesisHeroBlockquote: React.FC<SynthesisHeroBlockquoteProps> = ({
  quoteText,
  footnotes = [],
  userCommentary,
  onUpdateCommentary,
  onNavigateReference,
  isMobile = false,
  searchQuery,
}) => {
  // Ensure natural composition by stripping awkward introductory meta-language like "Looking across [1] and [2]"
  const naturalQuoteText = useMemo(() => cleanNaturalSynthesis(quoteText), [quoteText]);

  // Parse inline citations e.g. [Psalm 13:1], [Genesis 1:3] from quoteText
  const { renderedQuote, resolvedFootnotes } = useMemo(() => {
    const citationRegex = /\[([^\]]+)\]/g;
    const detectedRefs: string[] = [];

    // First pass: collect unique references in order of appearance
    let match: RegExpExecArray | null;
    while ((match = citationRegex.exec(naturalQuoteText)) !== null) {
      const ref = match[1].trim();
      if (!detectedRefs.includes(ref)) {
        detectedRefs.push(ref);
      }
    }

    // Build footnotes list starting with detected references, then any passed footnotes
    const fnList: FootnoteReference[] = detectedRefs.map((ref) => {
      const matched = footnotes.find((f) => f.ref.toLowerCase() === ref.toLowerCase());
      return {
        ref,
        noteId: matched?.noteId,
      };
    });

    for (const fn of footnotes) {
      if (!fnList.some((existing) => existing.ref.toLowerCase() === fn.ref.toLowerCase())) {
        fnList.push({
          ref: fn.ref,
          noteId: fn.noteId,
        });
      }
    }

    // Second pass: render text with superscript footnote numbers and bold search highlights
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    citationRegex.lastIndex = 0;

    while ((match = citationRegex.exec(naturalQuoteText)) !== null) {
      if (match.index > lastIdx) {
        parts.push(
          <React.Fragment key={`text-${lastIdx}`}>
            {renderHighlightedText(naturalQuoteText.slice(lastIdx, match.index), searchQuery)}
          </React.Fragment>
        );
      }
      const ref = match[1].trim();
      const fnIndex = fnList.findIndex((f) => f.ref.toLowerCase() === ref.toLowerCase());
      const displayNum = fnIndex >= 0 ? fnIndex + 1 : 1;

      parts.push(
        <button
          key={`fn-${match.index}`}
          type="button"
          onClick={() => onNavigateReference(ref)}
          className="relative inline-flex items-center text-xs font-sans font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:underline px-1 py-1 -my-1 cursor-pointer select-none transition-colors"
          title={`Footnote ${displayNum}: ${ref}`}
        >
          <span className="align-super">[{displayNum}]</span>
        </button>
      );
      lastIdx = citationRegex.lastIndex;
    }

    if (lastIdx < naturalQuoteText.length) {
      parts.push(
        <React.Fragment key={`text-tail`}>
          {renderHighlightedText(naturalQuoteText.slice(lastIdx), searchQuery)}
        </React.Fragment>
      );
    }

    return {
      renderedQuote: parts.length > 0 ? parts : renderHighlightedText(naturalQuoteText, searchQuery),
      resolvedFootnotes: fnList,
    };
  }, [naturalQuoteText, footnotes, onNavigateReference, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Blockquote */}
      <blockquote className="pl-5 sm:pl-7 border-l-2 border-[var(--text-primary)]/40">
        <p className="font-sans text-lg text-[var(--text-primary)] leading-relaxed">
          “{renderedQuote}”
        </p>

        {/* Footnotes linking directly to commentary / scripture without excerpt */}
        {resolvedFootnotes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-xs font-sans not-italic">
            {resolvedFootnotes.map((fn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigateReference(fn.ref)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:underline cursor-pointer select-none transition-colors py-2 -my-1 inline-flex items-center"
                title={`Open ${fn.ref}`}
              >
                <span className="font-mono text-xs opacity-60 mr-1">[{idx + 1}]</span>
                <span>{renderHighlightedText(fn.ref, searchQuery)}</span>
              </button>
            ))}
          </div>
        )}
      </blockquote>

      {/* Blank Input with Placeholder */}
      <NoteField
        verseNum={0}
        content={userCommentary}
        isMobile={isMobile}
        searchQuery={searchQuery}
        onUpdateContent={onUpdateCommentary}
        placeholder="Add commentary..."
      />
    </div>
  );
};

export default SynthesisHeroBlockquote;
