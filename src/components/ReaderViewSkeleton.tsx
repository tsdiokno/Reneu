import React from 'react';

interface ReaderViewSkeletonProps {
  verseCount?: number;
  readerFontSizeClass?: string;
  readerLineSpacingClass?: string;
}

// Proportional skeleton lines modeled directly after natural scripture verse cadence
const SKELETON_VERSES_TEMPLATE = [
  // Verse 1 (2 lines)
  { lines: [{ w: '94%', bold: false }, { w: '58%', bold: false }] },
  // Verse 2 (4 lines with opening bold quotation cadence)
  {
    lines: [
      { w: '76%', bold: true },
      { w: '66%', bold: true },
      { w: '92%', bold: false },
      { w: '44%', bold: false },
    ],
  },
  // Verse 3 (3 lines)
  {
    lines: [
      { w: '90%', bold: true },
      { w: '82%', bold: true },
      { w: '34%', bold: true },
    ],
  },
  // Verse 4 (4 lines)
  {
    lines: [
      { w: '78%', bold: false },
      { w: '88%', bold: false },
      { w: '64%', bold: false },
      { w: '72%', bold: false },
    ],
  },
  // Verse 5 (3 lines)
  {
    lines: [
      { w: '86%', bold: false },
      { w: '94%', bold: false },
      { w: '56%', bold: false },
    ],
  },
  // Verse 6 (2 lines)
  { lines: [{ w: '92%', bold: false }, { w: '48%', bold: false }] },
  // Verse 7 (4 lines)
  {
    lines: [
      { w: '84%', bold: false },
      { w: '74%', bold: false },
      { w: '90%', bold: false },
      { w: '52%', bold: false },
    ],
  },
  // Verse 8 (3 lines)
  {
    lines: [
      { w: '88%', bold: false },
      { w: '70%', bold: false },
      { w: '40%', bold: false },
    ],
  },
  // Verse 9 (2 lines)
  { lines: [{ w: '95%', bold: false }, { w: '62%', bold: false }] },
  // Verse 10 (3 lines)
  {
    lines: [
      { w: '80%', bold: false },
      { w: '86%', bold: false },
      { w: '46%', bold: false },
    ],
  },
];

export const ReaderViewSkeleton: React.FC<ReaderViewSkeletonProps> = ({
  verseCount = 10,
  readerFontSizeClass = 'text-lg sm:text-xl',
  readerLineSpacingClass = 'leading-relaxed',
}) => {
  const versesToRender = SKELETON_VERSES_TEMPLATE.slice(0, verseCount);

  return (
    <div
      className="flex flex-col w-full pb-32 animate-pulse select-none"
      role="status"
      aria-label="Loading verses..."
    >
      {versesToRender.map((v, idx) => {
        const verseNum = idx + 1;
        return (
          <div
            key={verseNum}
            className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-16 items-start py-1 md:py-1.5"
          >
            {/* Verse column (Left column) - aligned to text baseline */}
            <div className="lg:col-span-7 xl:col-span-6 lg:pl-12 max-w-2xl mx-auto lg:mx-0 w-full flex items-baseline">
              {/* Verse number container - sits right on the baseline of the first line of text */}
              <div className="inline-flex items-baseline justify-end gap-1 mr-3 lg:mr-4 shrink-0 select-none w-7 text-right">
                <span className="text-xs font-mono font-medium text-[var(--text-subtle)] opacity-40 leading-none">
                  {verseNum}
                </span>
              </div>

              {/* Verse text lines container */}
              <div className={`flex-1 flex flex-col gap-2.5 pt-0.5 pb-1 ${readerFontSizeClass} ${readerLineSpacingClass}`}>
                {v.lines.map((line, lIdx) => (
                  <div
                    key={lIdx}
                    className={`h-4 sm:h-4.5 rounded-sm ${
                      line.bold
                        ? 'bg-[var(--text-primary)]/15'
                        : 'bg-[var(--text-primary)]/10'
                    }`}
                    style={{ width: line.w }}
                  />
                ))}
              </div>
            </div>

            {/* Right column placeholder matching 12-column grid to prevent horizontal shifts */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-6" />
          </div>
        );
      })}

      {/* Pagination Skeleton Footer */}
      <nav
        aria-label="Loading chapter pagination"
        className="mt-16 pt-8 pb-12 border-t border-[var(--line-subtle)]/40 grid grid-cols-3 items-center max-w-2xl lg:max-w-4xl mx-auto w-full select-none gap-2 sm:gap-4"
      >
        <div className="flex justify-start">
          <div className="h-4 w-24 rounded bg-[var(--text-primary)]/10" />
        </div>
        <div className="flex justify-center">
          <div className="h-4 w-28 rounded bg-[var(--text-primary)]/12" />
        </div>
        <div className="flex justify-end">
          <div className="h-4 w-24 rounded bg-[var(--text-primary)]/10" />
        </div>
      </nav>
    </div>
  );
};

export default ReaderViewSkeleton;
