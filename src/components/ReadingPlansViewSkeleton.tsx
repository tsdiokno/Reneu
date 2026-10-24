import React from 'react';

/**
 * ReadingPlansContentSkeleton renders the main body skeleton placeholder
 * for the reading plan view (progress bar strip, day navigator, reading portions list,
 * and bottom action buttons) strictly matching the layout and design.
 */
export const ReadingPlansContentSkeleton: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-8 animate-pulse select-none"
      role="status"
      aria-label="Loading reading plan..."
    >
      {/* Visual Progress Bar Strip Skeleton */}
      <div className="flex flex-col gap-2 pb-4 border-b border-[var(--line-subtle)]">
        <div className="flex items-center justify-between text-xs font-sans">
          {/* Days complete placeholder */}
          <div className="h-3 w-24 sm:w-28 rounded bg-[var(--text-primary)]/12" />
          {/* Percentage placeholder */}
          <div className="h-3 w-8 sm:w-10 rounded bg-[var(--text-primary)]/12" />
        </div>
        {/* Progress track bar */}
        <div className="w-full h-2.5 rounded-full bg-[var(--bg-active)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--text-primary)]/10 w-0" />
        </div>
      </div>

      {/* Focused Day Navigator Skeleton */}
      <section aria-label="Day selection loading" className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          {/* Backward Arrow placeholder */}
          <div className="p-2 sm:p-2.5 -ml-2 rounded-full text-[var(--text-subtle)]/30 flex items-center gap-1.5 pointer-events-none">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <div className="hidden sm:block h-3 w-8 rounded bg-[var(--text-primary)]/10" />
          </div>

          {/* Central Focused Day Title Skeleton */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 sm:h-8 md:h-9 w-24 sm:w-32 rounded bg-[var(--text-primary)]/15" />
            </div>
            <div className="h-3.5 sm:h-4 w-28 sm:w-36 rounded bg-[var(--text-primary)]/10" />
          </div>

          {/* Forward Arrow placeholder */}
          <div className="p-2 sm:p-2.5 -mr-2 rounded-full text-[var(--text-subtle)]/30 flex items-center gap-1.5 pointer-events-none">
            <div className="hidden sm:block h-3 w-8 rounded bg-[var(--text-primary)]/10" />
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </section>

      {/* Assigned Readings List Skeleton */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col divide-y divide-[var(--line-subtle)]">
          {/* Reading Portion 1 */}
          <div className="py-4 sm:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded border border-[var(--border-subtle)] bg-[var(--text-primary)]/5 shrink-0" />
              <div className="h-6 sm:h-7 w-36 sm:w-48 rounded bg-[var(--text-primary)]/15" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-4 w-12 sm:w-14 rounded bg-[var(--text-primary)]/10" />
            </div>
          </div>

          {/* Reading Portion 2 */}
          <div className="py-4 sm:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded border border-[var(--border-subtle)] bg-[var(--text-primary)]/5 shrink-0" />
              <div className="h-6 sm:h-7 w-28 sm:w-36 rounded bg-[var(--text-primary)]/15" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-4 w-12 sm:w-14 rounded bg-[var(--text-primary)]/10" />
            </div>
          </div>

          {/* Reading Portion 3 */}
          <div className="py-4 sm:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded border border-[var(--border-subtle)] bg-[var(--text-primary)]/5 shrink-0" />
              <div className="h-6 sm:h-7 w-44 sm:w-56 rounded bg-[var(--text-primary)]/15" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-4 w-12 sm:w-14 rounded bg-[var(--text-primary)]/10" />
            </div>
          </div>
        </div>

        {/* Primary Action Section Skeleton */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--line-subtle)]">
          <div className="h-9 sm:h-10 w-40 sm:w-48 rounded-full bg-[var(--text-primary)]/15 shrink-0" />
          <div className="h-4 w-32 sm:w-40 rounded bg-[var(--text-primary)]/10 self-center" />
        </div>
      </section>
    </div>
  );
};

export interface ReadingPlansViewSkeletonProps {
  showHeader?: boolean;
}

/**
 * ReadingPlansViewSkeleton provides the full view skeleton including
 * sticky header and content placeholder, designed for Suspense fallbacks.
 */
export const ReadingPlansViewSkeleton: React.FC<ReadingPlansViewSkeletonProps> = ({
  showHeader = true,
}) => {
  return (
    <div
      className="w-full min-h-screen selection:bg-[var(--text-selection)] pb-36 font-sans select-none"
      role="status"
      aria-label="Loading reading plans..."
    >
      {showHeader && (
        <header className="sticky top-0 z-30 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 border-b border-[var(--line-subtle)] transition-colors animate-pulse">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            {/* Plan Title Skeleton */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="h-7 sm:h-8 md:h-9 w-48 sm:w-64 rounded bg-[var(--text-primary)]/15" />
              <div className="w-4 h-4 rounded bg-[var(--text-primary)]/10 shrink-0" />
            </div>

            {/* New Plan Button Skeleton */}
            <div className="shrink-0 flex items-center">
              <div className="h-7 w-20 sm:w-24 rounded-full bg-[var(--text-primary)]/8 border border-[var(--line-subtle)]/70" />
            </div>
          </div>
        </header>
      )}

      {/* Main Content Skeleton */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 font-sans select-none">
        <ReadingPlansContentSkeleton />
      </main>
    </div>
  );
};

export default ReadingPlansViewSkeleton;
