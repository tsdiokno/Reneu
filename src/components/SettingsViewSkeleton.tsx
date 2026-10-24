import React from 'react';

export const SettingsViewSkeleton: React.FC = () => {
  return (
    <div
      className="w-full max-w-2xl mx-auto px-6 sm:px-8 pt-8 md:pt-12 pb-36 md:pb-48 selection:bg-[var(--text-selection)] animate-pulse min-h-screen font-sans select-none"
      role="status"
      aria-label="Loading settings..."
    >
      <div className="flex flex-col gap-10">
        {/* Section 1: Color Themes (Directly modeled after screenshot) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-16 rounded bg-[var(--text-primary)]/15 uppercase tracking-wider" />
            <div className="h-3 w-28 rounded bg-[var(--text-primary)]/10 font-mono" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Parchment Card Skeleton */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-20 rounded bg-[var(--text-primary)]/15" />
                <div className="w-4 h-4 rounded-sm border border-[var(--line-subtle)] bg-[var(--text-primary)]/10 shrink-0" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-4/5 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>

            {/* White Card Skeleton */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-14 rounded bg-[var(--text-primary)]/15" />
                <div className="w-4 h-4 rounded-sm border border-[var(--line-subtle)] bg-[var(--text-primary)]/10 shrink-0" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-3/4 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>

            {/* Obsidian Card Skeleton */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-16 rounded bg-[var(--text-primary)]/15" />
                <div className="w-4 h-4 rounded-sm border border-[var(--line-subtle)] bg-[var(--text-primary)]/20 shrink-0" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-4/5 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Typeface */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-20 rounded bg-[var(--text-primary)]/15 uppercase tracking-wider" />
            <div className="h-3 w-24 rounded bg-[var(--text-primary)]/10 font-mono" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Classical Serif */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="h-5 w-28 rounded bg-[var(--text-primary)]/15 mb-2" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-5/6 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>

            {/* Modern Sans */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="h-5 w-28 rounded bg-[var(--text-primary)]/15 mb-2" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-4/5 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>

            {/* Monospace */}
            <div className="flex flex-col p-4 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02]">
              <div className="h-5 w-24 rounded bg-[var(--text-primary)]/15 mb-2" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded bg-[var(--text-primary)]/10" />
                <div className="h-3 w-3/4 rounded bg-[var(--text-primary)]/10" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Font Size */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-20 rounded bg-[var(--text-primary)]/15 uppercase tracking-wider" />
            <div className="h-3 w-32 rounded bg-[var(--text-primary)]/10 font-mono" />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center py-3 px-2 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02] gap-1.5 text-center"
              >
                <div className="h-3.5 w-14 rounded bg-[var(--text-primary)]/15" />
                <div className="h-3 w-8 rounded bg-[var(--text-primary)]/10" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Line Spacing */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-24 rounded bg-[var(--text-primary)]/15 uppercase tracking-wider" />
            <div className="h-3 w-16 rounded bg-[var(--text-primary)]/10 font-mono" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center py-3 px-2 rounded border border-[var(--line-subtle)] bg-[var(--text-primary)]/[0.02] gap-1.5 text-center"
              >
                <div className="h-3.5 w-16 rounded bg-[var(--text-primary)]/15" />
                <div className="h-3 w-20 rounded bg-[var(--text-primary)]/10" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Live Scripture Preview Skeleton */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="h-3 w-24 rounded bg-[var(--text-primary)]/15 uppercase tracking-wider" />
          <div className="p-6 rounded border border-[var(--line-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-subtle)]">
              <div className="h-3.5 w-16 rounded bg-[var(--text-primary)]/15" />
              <div className="h-3.5 w-20 rounded bg-[var(--text-primary)]/10" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-[var(--text-primary)]/12" />
              <div className="h-4 w-4/5 rounded bg-[var(--text-primary)]/12" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsViewSkeleton;
