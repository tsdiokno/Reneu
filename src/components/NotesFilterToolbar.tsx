import React, { useRef } from 'react';

export type SortField = 'date' | 'book' | 'length';
export type SortDirection = 'asc' | 'desc';
export type DatePreset = 'all' | '7d' | '30d' | 'custom';
export type NoteTypeFilter = 'all' | 'scripture' | 'plain' | 'synthesis';

export interface NotesFilterState {
  sortField: SortField;
  sortDirection: SortDirection;
  selectedBookIds: number[];
  datePreset: DatePreset;
  customStartDate: string;
  customEndDate: string;
  noteType: NoteTypeFilter;
}

export interface AvailableBookInfo {
  bookId: number;
  name: string;
  count: number;
}

interface NotesFilterToolbarProps {
  filters: NotesFilterState;
  onUpdateFilters: (updater: (prev: NotesFilterState) => NotesFilterState) => void;
  availableBooks: AvailableBookInfo[];
  totalNotesCount: number;
  filteredCount: number;
}

export const NotesFilterToolbar: React.FC<NotesFilterToolbarProps> = ({
  filters,
  onUpdateFilters,
  availableBooks,
  totalNotesCount,
  filteredCount,
}) => {
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // Combined sort value: e.g. "date-desc", "book-asc"
  const currentSortCombined = `${filters.sortField}-${filters.sortDirection}`;

  const handleSortChange = (combinedValue: string) => {
    const [field, direction] = combinedValue.split('-') as [SortField, SortDirection];
    onUpdateFilters((prev) => ({
      ...prev,
      sortField: field,
      sortDirection: direction,
    }));
  };

  const handleFlipDirection = () => {
    onUpdateFilters((prev) => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  };

  const hasActiveFilters =
    filters.selectedBookIds.length > 0 ||
    filters.datePreset !== 'all' ||
    filters.customStartDate !== '' ||
    filters.customEndDate !== '' ||
    filters.noteType !== 'all';

  const handleResetAll = () => {
    onUpdateFilters((prev) => ({
      ...prev,
      selectedBookIds: [],
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
      noteType: 'all',
    }));
  };

  const getBookDropdownLabel = () => {
    if (filters.selectedBookIds.length === 0) return 'All Books';
    if (filters.selectedBookIds.length === 1) {
      const b = availableBooks.find((item) => item.bookId === filters.selectedBookIds[0]);
      return b ? b.name : '1 Book';
    }
    return `${filters.selectedBookIds.length} Books`;
  };

  const getDateLabel = () => {
    if (filters.datePreset === '7d') return 'Past 7d';
    if (filters.datePreset === '30d') return 'Past 30d';
    if (filters.datePreset === 'custom') {
      if (filters.customStartDate && filters.customEndDate) {
        return `${filters.customStartDate} – ${filters.customEndDate}`;
      }
      return 'Custom Date';
    }
    return 'All Dates';
  };

  const getNoteTypeLabel = () => {
    switch (filters.noteType) {
      case 'scripture':
        return 'Verses';
      case 'plain':
        return 'Plain Notes';
      case 'synthesis':
        return 'Intelligent Summaries';
      default:
        return 'All Types';
    }
  };

  const getSortLabel = () => {
    switch (currentSortCombined) {
      case 'date-desc':
        return 'Date (New)';
      case 'date-asc':
        return 'Date (Old)';
      case 'book-asc':
        return 'Book (A-Z)';
      case 'book-desc':
        return 'Book (Z-A)';
      case 'length-desc':
        return 'Length (Long)';
      case 'length-asc':
        return 'Length (Short)';
      default:
        return 'Date';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 font-sans text-xs select-none pt-1">
      {/* Minimal Icon Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Book Filter (Icon triggers native browser combo box) */}
          <div className="relative inline-flex items-center w-[138px] sm:w-[146px]">
            <button
              type="button"
              className={`w-full h-9 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors cursor-pointer text-xs font-medium ${
                filters.selectedBookIds.length > 0
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5'
                  : 'border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
              }`}
              title={`Book filter: ${getBookDropdownLabel()}`}
              aria-label="Filter by book"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="truncate flex-1 text-left">{getBookDropdownLabel()}</span>
              <span className="font-mono text-xs opacity-60 shrink-0">▾</span>
            </button>
            <select
              value={filters.selectedBookIds.length === 1 ? filters.selectedBookIds[0] : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  onUpdateFilters((prev) => ({ ...prev, selectedBookIds: [] }));
                } else {
                  onUpdateFilters((prev) => ({ ...prev, selectedBookIds: [Number(val)] }));
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)]"
              aria-label="Filter by book"
            >
              <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">All Books ({totalNotesCount})</option>
              {availableBooks.map((b) => (
                <option key={b.bookId} value={b.bookId} className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Date Range (Icon triggers native browser combo box & date picker) */}
          <div className="relative inline-flex items-center w-[138px] sm:w-[146px]">
            <button
              type="button"
              className={`w-full h-9 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors cursor-pointer text-xs font-medium ${
                filters.datePreset !== 'all' || filters.customStartDate || filters.customEndDate
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5'
                  : 'border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
              }`}
              title={`Date range: ${getDateLabel()}`}
              aria-label="Filter by date range"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="truncate flex-1 text-left">{getDateLabel()}</span>
              <span className="font-mono text-xs opacity-60 shrink-0">▾</span>
            </button>
            <select
              value={filters.datePreset}
              onChange={(e) => {
                const val = e.target.value as DatePreset;
                onUpdateFilters((prev) => ({ ...prev, datePreset: val }));
                if (val === 'custom') {
                  setTimeout(() => {
                    try {
                      startDateInputRef.current?.showPicker();
                    } catch {
                      startDateInputRef.current?.focus();
                    }
                  }, 50);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)]"
              aria-label="Filter by date range"
            >
              <option value="all" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date: All Time</option>
              <option value="7d" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date: Past 7 Days</option>
              <option value="30d" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date: Past 30 Days</option>
              <option value="custom" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date: Custom Date Range...</option>
            </select>
          </div>

          {/* 3. Note Type Filter (Icon triggers native combo box) */}
          <div className="relative inline-flex items-center w-[138px] sm:w-[146px]">
            <button
              type="button"
              className={`w-full h-9 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors cursor-pointer text-xs font-medium ${
                filters.noteType !== 'all'
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5'
                  : 'border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
              }`}
              title={`Note type: ${getNoteTypeLabel()}`}
              aria-label="Filter by note type"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span className="truncate flex-1 text-left">
                {getNoteTypeLabel()}
              </span>
              <span className="font-mono text-xs opacity-60 shrink-0">▾</span>
            </button>
            <select
              value={filters.noteType}
              onChange={(e) =>
                onUpdateFilters((prev) => ({ ...prev, noteType: e.target.value as NoteTypeFilter }))
              }
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)]"
              aria-label="Filter by note type"
            >
              <option value="all" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Type: All Notes</option>
              <option value="scripture" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Type: Passage Verses</option>
              <option value="plain" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Type: Plain Notes</option>
              <option value="synthesis" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Type: Intelligent Summaries</option>
            </select>
          </div>

          {/* 4. Sort Filter (Icon triggers native combo box) + Direction Flip */}
          <div className="inline-flex items-center gap-1">
            <div className="relative inline-flex items-center w-[138px] sm:w-[146px]">
              <button
                type="button"
                className="w-full h-9 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xs font-medium"
                title={`Sort: ${getSortLabel()}`}
                aria-label="Sort commentary stream"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="14" y2="12" />
                  <line x1="4" y1="18" x2="8" y2="18" />
                </svg>
                <span className="truncate flex-1 text-left">{getSortLabel()}</span>
                <span className="font-mono text-xs opacity-60 shrink-0">▾</span>
              </button>
              <select
                value={currentSortCombined}
                onChange={(e) => handleSortChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)]"
                aria-label="Sort commentary stream"
              >
                <option value="date-desc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date (Newest first)</option>
                <option value="date-asc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Date (Oldest first)</option>
                <option value="book-asc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Book (Genesis → Rev)</option>
                <option value="book-desc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Book (Rev → Genesis)</option>
                <option value="length-desc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Length (Longest first)</option>
                <option value="length-asc" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Length (Shortest first)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleFlipDirection}
              className="w-9 h-9 p-2 border border-[var(--line-subtle)] hover:border-[var(--text-primary)]/40 rounded text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title={`Sort direction: ${filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
              aria-label="Flip sort direction"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-150 ${filters.sortDirection === 'asc' ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Reset Filters Icon Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 h-9 rounded text-xs text-[var(--text-subtle)] hover:text-rose-500 transition-colors cursor-pointer"
              title="Clear all filters"
              aria-label="Clear all filters"
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
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
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Counter */}
        <span className="font-mono text-xs opacity-60 shrink-0">
          {filteredCount} / {totalNotesCount} notes
        </span>
      </div>

      {/* Native Browser Date Picker Inputs (Invoked when Date: Custom Range is active) */}
      {filters.datePreset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs text-[var(--text-subtle)] animate-fade-in">
          <span className="opacity-60">Range:</span>
          <div className="relative inline-flex items-center">
            <input
              ref={startDateInputRef}
              type="date"
              value={filters.customStartDate}
              onChange={(e) =>
                onUpdateFilters((prev) => ({ ...prev, customStartDate: e.target.value }))
              }
              className="bg-transparent border border-[var(--line-subtle)] hover:border-[var(--text-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
              title="Select start date"
              aria-label="Start date"
            />
          </div>
          <span>→</span>
          <div className="relative inline-flex items-center">
            <input
              ref={endDateInputRef}
              type="date"
              value={filters.customEndDate}
              onChange={(e) =>
                onUpdateFilters((prev) => ({ ...prev, customEndDate: e.target.value }))
              }
              className="bg-transparent border border-[var(--line-subtle)] hover:border-[var(--text-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
              title="Select end date"
              aria-label="End date"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesFilterToolbar;
