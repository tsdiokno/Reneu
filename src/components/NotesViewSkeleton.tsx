import React from 'react';

export const NotesViewSkeleton: React.FC = () => {
  return (
    <div
      className="w-full min-h-screen selection:bg-[var(--text-selection)] animate-pulse pb-32 font-sans select-none"
      role="status"
      aria-label="Loading notes..."
    >
      {/* Top Sticky Header Skeleton (Search Bar & Filter Controls) */}
      <header className="sticky top-0 z-40 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 py-1">
          {/* Search Row */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[var(--text-primary)]/10 shrink-0" />
            <div className="h-7 sm:h-8 md:h-9 w-44 sm:w-64 rounded bg-[var(--text-primary)]/10 my-1" />
          </div>

          {/* Filter Toggle Button Skeleton */}
          <div className="h-8 w-16 sm:w-20 rounded-full bg-[var(--text-primary)]/8 shrink-0" />
        </div>
      </header>

      {/* Main Content Area matching AllNotesView's max-w-2xl prose stream */}
      <main className="w-full max-w-2xl mx-auto px-6 sm:px-8 pt-8 md:pt-12">
        {/* Section 1: Synthesis Note Skeleton (Directly modeled after design) */}
        <section className="mb-10">
          {/* "SYNTHESIS" uppercase tracking label */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 rounded bg-[var(--text-primary)]/15 uppercase tracking-widest" />
            <div className="h-3 w-16 rounded bg-[var(--text-primary)]/10" />
          </div>

          {/* Blockquote with Left Accent Bar */}
          <div className="pl-5 sm:pl-7 border-l-2 border-[var(--text-primary)]/30 space-y-3 py-1">
            {/* Paragraph lines simulating quotation text */}
            <div className="h-4 w-full rounded bg-[var(--text-primary)]/12" />
            <div className="h-4 w-[98%] rounded bg-[var(--text-primary)]/12" />
            <div className="h-4 w-[94%] rounded bg-[var(--text-primary)]/12" />
            <div className="h-4 w-[96%] rounded bg-[var(--text-primary)]/12" />
            <div className="h-4 w-[65%] rounded bg-[var(--text-primary)]/12" />

            {/* Footnotes row: [1] Genesis 1:3   [2] Romans 8:28 */}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-3.5 w-24 rounded bg-[var(--text-primary)]/10" />
              <div className="h-3.5 w-24 rounded bg-[var(--text-primary)]/10" />
            </div>
          </div>

          {/* "Add commentary..." italic input placeholder */}
          <div className="mt-5 pl-5 sm:pl-7">
            <div className="h-4 w-32 rounded bg-[var(--text-primary)]/8 italic" />
          </div>

          {/* Horizontal separator line */}
          <div className="border-b border-[var(--line-subtle)] my-9" />
        </section>

        {/* Section 2 & 3: Main Scripture Commentary Notes Stream */}
        <div className="flex flex-col gap-12">
          {/* Note Item 1: Romans 8:28 Skeleton */}
          <article className="flex flex-col gap-3">
            {/* Header row: Reference (left) and Date (right) */}
            <div className="flex items-baseline justify-between">
              <div className="h-5 w-28 rounded bg-[var(--text-primary)]/15 font-semibold" />
              <div className="h-3.5 w-20 rounded bg-[var(--text-primary)]/10 uppercase tracking-wider" />
            </div>
            {/* 2 lines of commentary body */}
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-[var(--text-primary)]/12" />
              <div className="h-4 w-[85%] rounded bg-[var(--text-primary)]/12" />
            </div>
          </article>

          {/* Note Item 2: Genesis 1:3 Skeleton */}
          <article className="flex flex-col gap-3">
            {/* Header row: Reference (left) and Date (right) */}
            <div className="flex items-baseline justify-between">
              <div className="h-5 w-24 rounded bg-[var(--text-primary)]/15 font-semibold" />
              <div className="h-3.5 w-20 rounded bg-[var(--text-primary)]/10 uppercase tracking-wider" />
            </div>
            {/* 2 lines of commentary body */}
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-[var(--text-primary)]/12" />
              <div className="h-4 w-[75%] rounded bg-[var(--text-primary)]/12" />
            </div>
          </article>

          {/* Note Item 3: Additional note skeleton for full viewport balance */}
          <article className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="h-5 w-24 rounded bg-[var(--text-primary)]/15 font-semibold" />
              <div className="h-3.5 w-20 rounded bg-[var(--text-primary)]/10 uppercase tracking-wider" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-[var(--text-primary)]/12" />
              <div className="h-4 w-[80%] rounded bg-[var(--text-primary)]/12" />
            </div>
          </article>
        </div>
      </main>
    </div>
  );
};

export default NotesViewSkeleton;
