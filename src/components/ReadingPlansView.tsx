import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ReadingPlan,
  PlanScope,
  PlanDaysPerWeek,
  PlanTrackStyle,
  PlanDaySchedule,
} from '../types/readingPlan';
import {
  generatePlanSchedule,
  calculatePlanPacingSummary,
  getAvailableTrackStylesForScope,
  CLASSICAL_PRESETS,
  type PlanPresetDefinition,
} from '../services/readingPlanEngine';
import { CANONICAL_BOOKS } from '../data/canonicalBooks';
import { DropdownSelect, type DropdownSelectOption } from './DropdownSelect';
import {
  getAllReadingPlans,
  getActiveReadingPlan,
  setActiveReadingPlan,
  deleteReadingPlan,
  createPlanFromPreset,
  createCustomPlan,
  toggleDayCompleted,
  togglePortionCompleted,
  setDayCompletionState,
  resetPlanProgress,
} from '../services/readingPlanStorage';
import { Modal } from './Modal';
import { ReadingPlansContentSkeleton } from './ReadingPlansViewSkeleton';
import type { FontFamily } from '../types/bible';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  getAppearanceSettings,
} from '../services/bibleStorage';

interface ReadingPlansViewProps {
  onNavigate: (bookId: number, chapter: number, verse: number) => void;
  onStartPlanReading?: (
    plan: ReadingPlan,
    daySchedule: PlanDaySchedule,
    targetPortionIndex?: number
  ) => void;
  onPlanProgressChange?: (plan: ReadingPlan) => void;
  initialDayNumber?: number;
  fontFamily?: FontFamily;
}

export const ReadingPlansView: React.FC<ReadingPlansViewProps> = ({
  onNavigate,
  onStartPlanReading,
  onPlanProgressChange,
  initialDayNumber,
  fontFamily: propFontFamily,
}) => {
  // Accent font dynamically synchronized with active settings (serif | sans | mono)
  const [activeFontFamily, setActiveFontFamily] = useState<FontFamily>(() => {
    if (propFontFamily) return propFontFamily;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.fontFamily) return parsed.fontFamily;
        }
      } catch {}
    }
    return DEFAULT_APPEARANCE.fontFamily;
  });

  useEffect(() => {
    if (propFontFamily) {
      setActiveFontFamily(propFontFamily);
    } else {
      void getAppearanceSettings().then((app) => {
        if (app?.fontFamily) {
          setActiveFontFamily(app.fontFamily);
        }
      });
    }
  }, [propFontFamily]);

  const accentFontClass =
    activeFontFamily === 'sans'
      ? 'font-sans'
      : activeFontFamily === 'mono'
      ? 'font-mono'
      : 'font-serif';

  const [activePlan, setActivePlanState] = useState<ReadingPlan | null>(null);
  const [allPlans, setAllPlansState] = useState<ReadingPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Focused day navigation state (Previous, Today, Tomorrow via arrows)
  const [focusedDayNumber, setFocusedDayNumber] = useState<number>(initialDayNumber || 1);

  // Progressive Disclosure Modals
  const [isPlanSwitcherOpen, setIsPlanSwitcherOpen] = useState<boolean>(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState<boolean>(false);
  const [selectedPlanOption, setSelectedPlanOption] = useState<string>('mcheyne');

  // Plan Configuration State (4 Core Variables + Custom user-definable options)
  const [customTitle, setCustomTitle] = useState<string>('My Reading Plan');
  const [customScope, setCustomScope] = useState<PlanScope>('entire-bible');
  const [customBookIds, setCustomBookIds] = useState<number[]>([40, 41, 42, 43]); // Default 4 Gospels when custom scope is first picked
  const [customDurationChoice, setCustomDurationChoice] = useState<string>('365');
  const [customDurationInput, setCustomDurationInput] = useState<number>(365);
  const [customDaysPerWeek, setCustomDaysPerWeek] = useState<PlanDaysPerWeek>(7);
  const [customTrackStyle, setCustomTrackStyle] = useState<PlanTrackStyle>('mcheyne');

  // Effective duration in days based on presets or custom numeric input
  const effectiveCustomDuration = useMemo(() => {
    if (customDurationChoice === 'custom') {
      return Math.max(1, Math.min(1000, Number(customDurationInput) || 1));
    }
    return Number(customDurationChoice) || 365;
  }, [customDurationChoice, customDurationInput]);

  // Dynamically filter multi-track options based on scope/book choices
  // Eliminates irrelevant combinations (e.g. OT+NT parallel when scope lacks OT or NT)
  const availableTrackStyles = useMemo(() => {
    return getAvailableTrackStylesForScope(customScope, customBookIds);
  }, [customScope, customBookIds]);

  // Ensure selected trackStyle remains valid whenever scope or custom books change
  useEffect(() => {
    const isCurrentValid = availableTrackStyles.some((opt) => opt.value === customTrackStyle);
    if (!isCurrentValid && availableTrackStyles.length > 0) {
      setCustomTrackStyle(availableTrackStyles[0].value);
    }
  }, [availableTrackStyles, customTrackStyle]);

  // Load plans on mount
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const active = await getActiveReadingPlan();
      const all = await getAllReadingPlans();
      setActivePlanState(active);
      setAllPlansState(all);

      if (active) {
        // Calculate current elapsed day based on plan start date
        const now = Date.now();
        const start = active.startDate || now;
        const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        const currentElapsed = Math.max(1, Math.min(active.durationDays, diffDays));

        if (
          typeof initialDayNumber === 'number' &&
          initialDayNumber >= 1 &&
          initialDayNumber <= active.durationDays
        ) {
          setFocusedDayNumber(initialDayNumber);
        } else {
          setFocusedDayNumber(currentElapsed);
        }
      }
    } catch (err) {
      console.warn('Error loading reading plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Synchronize focused day if initialDayNumber prop changes from Reader mode
  useEffect(() => {
    if (typeof initialDayNumber === 'number' && initialDayNumber >= 1) {
      setFocusedDayNumber(initialDayNumber);
    }
  }, [initialDayNumber]);

  // Generate day-by-day itinerary on the fly from active plan variables
  const fullSchedule = useMemo<PlanDaySchedule[]>(() => {
    if (!activePlan) return [];
    return generatePlanSchedule(
      activePlan.scope,
      activePlan.durationDays,
      activePlan.daysPerWeek,
      activePlan.trackStyle,
      activePlan.customBookIds
    );
  }, [activePlan]);

  // Live preview for the Custom Plan Builder
  const customPacingPreview = useMemo(() => {
    return calculatePlanPacingSummary(
      customScope,
      effectiveCustomDuration,
      customDaysPerWeek,
      customTrackStyle,
      customBookIds
    );
  }, [customScope, effectiveCustomDuration, customDaysPerWeek, customTrackStyle, customBookIds]);

  // Calendar elapsed day
  const currentElapsedDay = useMemo(() => {
    if (!activePlan) return 1;
    const now = Date.now();
    const start = activePlan.startDate || now;
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(activePlan.durationDays, diffDays));
  }, [activePlan]);

  // Focused Day Schedule
  const currentSchedule = useMemo<PlanDaySchedule | null>(() => {
    if (!fullSchedule.length) return null;
    return (
      fullSchedule.find((s) => s.dayNumber === focusedDayNumber) ||
      fullSchedule[0] ||
      null
    );
  }, [fullSchedule, focusedDayNumber]);

  // Previous and Next day schedules for quiet adjacent day context (at most previous, today, tomorrow)
  const prevSchedule = useMemo<PlanDaySchedule | null>(() => {
    if (focusedDayNumber <= 1 || !fullSchedule.length) return null;
    return fullSchedule.find((s) => s.dayNumber === focusedDayNumber - 1) || null;
  }, [fullSchedule, focusedDayNumber]);

  const nextSchedule = useMemo<PlanDaySchedule | null>(() => {
    if (!activePlan || focusedDayNumber >= activePlan.durationDays || !fullSchedule.length)
      return null;
    return fullSchedule.find((s) => s.dayNumber === focusedDayNumber + 1) || null;
  }, [fullSchedule, activePlan, focusedDayNumber]);

  // Progress metrics: Calculate across both days and portion completions for instant reactivity
  const completedDaysCount = activePlan?.completedDays?.length || 0;
  const totalPortionsCount = useMemo(() => {
    return fullSchedule.reduce((acc, day) => acc + (day.isRestDay ? 0 : day.readings.length), 0);
  }, [fullSchedule]);
  const completedPortionsCount = useMemo(() => {
    if (!activePlan?.completedPortions) return 0;
    return Object.values(activePlan.completedPortions).filter(Boolean).length;
  }, [activePlan]);
  const progressPercent = useMemo(() => {
    if (!activePlan) return 0;
    if (totalPortionsCount > 0) {
      return Math.min(100, Math.round((completedPortionsCount / totalPortionsCount) * 100));
    }
    return Math.min(100, Math.round((completedDaysCount / activePlan.durationDays) * 100));
  }, [activePlan, completedPortionsCount, totalPortionsCount, completedDaysCount]);
  const isCurrentDayDone = Boolean(activePlan?.completedDays?.includes(focusedDayNumber));

  // Toggle Day Completion
  const handleToggleCurrentDay = async () => {
    if (!activePlan || !currentSchedule) return;
    const allPortionKeys = currentSchedule.readings.map(
      (_, idx) => `${focusedDayNumber}-${idx}`
    );
    const updated = await setDayCompletionState(
      activePlan.id,
      focusedDayNumber,
      !isCurrentDayDone,
      allPortionKeys
    );
    if (updated) {
      setActivePlanState(updated);
      setAllPlansState((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      onPlanProgressChange?.(updated);
    }
  };

  // Toggle Portion Completion
  const handleTogglePortion = async (portionIdx: number) => {
    if (!activePlan || !currentSchedule) return;
    const key = `${focusedDayNumber}-${portionIdx}`;
    const allPortionKeys = Array.from(
      { length: currentSchedule.readings.length },
      (_, idx) => `${focusedDayNumber}-${idx}`
    );
    const updated = await togglePortionCompleted(
      activePlan.id,
      key,
      focusedDayNumber,
      allPortionKeys
    );
    if (updated) {
      setActivePlanState(updated);
      setAllPlansState((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      onPlanProgressChange?.(updated);
    }
  };

  // Launch Reader in Plan Mode
  const handleLaunchPlanReading = (targetPortionIndex: number = 0) => {
    if (!activePlan || !currentSchedule) return;
    if (onStartPlanReading) {
      onStartPlanReading(activePlan, currentSchedule, targetPortionIndex);
    } else {
      const portion = currentSchedule.readings[targetPortionIndex] || currentSchedule.readings[0];
      if (portion) {
        onNavigate(portion.bookId, portion.startChapter, 1);
      }
    }
  };

  // Switch Active Plan
  const handleSelectPlan = async (planId: string) => {
    await setActiveReadingPlan(planId);
    await loadPlans();
    setIsPlanSwitcherOpen(false);
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string) => {
    await deleteReadingPlan(planId);
    await loadPlans();
  };

  // Reset Plan
  const handleResetProgress = async () => {
    if (!activePlan) return;
    if (window.confirm('Reset all reading progress for this plan?')) {
      const updated = await resetPlanProgress(activePlan.id);
      if (updated) {
        setActivePlanState(updated);
        setAllPlansState((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        onPlanProgressChange?.(updated);
      }
    }
  };

  // Start Preset Plan
  const handleStartPreset = async (presetKey: NonNullable<ReadingPlan['presetKey']>) => {
    const newPlan = await createPlanFromPreset(presetKey, true);
    setActivePlanState(newPlan);
    await loadPlans();
    setIsNewPlanModalOpen(false);
  };

  // Create Custom Plan
  const handleCreateCustom = async () => {
    const newPlan = await createCustomPlan({
      title: customTitle.trim() || 'My Reading Plan',
      scope: customScope,
      durationDays: effectiveCustomDuration,
      daysPerWeek: customDaysPerWeek,
      trackStyle: customTrackStyle,
      customBookIds: customScope === 'custom-books' ? customBookIds : undefined,
      setAsActive: true,
    });
    setActivePlanState(newPlan);
    await loadPlans();
    setIsNewPlanModalOpen(false);
  };

  // Formats date string from start date and day offset
  const formatDayDate = (dayNumber: number): string => {
    if (!activePlan) return `Day ${dayNumber}`;
    const start = new Date(activePlan.startDate || Date.now());
    const target = new Date(start.getTime() + (dayNumber - 1) * 86400000);
    return target.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  // Handle selecting a plan preset or custom plan option
  const handleSelectPlanOption = useCallback((key: string) => {
    setSelectedPlanOption(key);
    if (key !== 'custom') {
      const preset = CLASSICAL_PRESETS.find((p) => p.key === key);
      if (preset) {
        setCustomScope(preset.scope);
        setCustomDurationChoice(String(preset.durationDays));
        setCustomDurationInput(preset.durationDays);
        setCustomDaysPerWeek(preset.daysPerWeek);
        setCustomTrackStyle(preset.trackStyle);
      }
    }
  }, []);

  const selectedPresetDef = useMemo(() => {
    return CLASSICAL_PRESETS.find((p) => p.key === selectedPlanOption);
  }, [selectedPlanOption]);

  const planPresetOptions: DropdownSelectOption<string>[] = useMemo(
    () => [
      ...CLASSICAL_PRESETS.map((p) => ({
        value: p.key,
        label: p.title,
      })),
      {
        value: 'custom',
        label: 'Custom Plan',
      },
    ],
    []
  );

  // Scope options for reusable DropdownSelect
  const scopeDropdownOptions: DropdownSelectOption<PlanScope>[] = useMemo(
    () => [
      { value: 'entire-bible', label: 'Entire Bible' },
      { value: 'nt-only', label: 'New Testament' },
      { value: 'ot-only', label: 'Old Testament' },
      { value: 'gospels-acts', label: 'Gospels & Acts' },
      { value: 'epistles', label: 'Epistles & Revelation' },
      { value: 'wisdom-poetry', label: 'Wisdom & Psalms' },
      { value: 'custom-books', label: 'Custom Books Selection…' },
    ],
    []
  );

  // Duration options for reusable DropdownSelect
  const durationDropdownOptions: DropdownSelectOption<string>[] = useMemo(
    () => [
      { value: '365', label: '1 Year (365 days)' },
      { value: '180', label: '6 Months (180 days)' },
      { value: '90', label: '90 Days' },
      { value: '60', label: '60 Days' },
      { value: '40', label: '40 Days' },
      { value: '30', label: '30 Days' },
      { value: '14', label: '2 Weeks (14 days)' },
      { value: 'custom', label: 'Custom Duration…' },
    ],
    []
  );

  // Days per week options for reusable DropdownSelect
  const daysPerWeekDropdownOptions: DropdownSelectOption<PlanDaysPerWeek>[] = useMemo(
    () => [
      { value: 7, label: '7 Days / Week' },
      { value: 6, label: '6 Days / Week' },
      { value: 5, label: '5 Days / Week' },
      { value: 4, label: '4 Days / Week' },
      { value: 3, label: '3 Days / Week' },
      { value: 2, label: '2 Days / Week' },
      { value: 1, label: '1 Day / Week' },
    ],
    []
  );

  // Multi-Track style options for reusable DropdownSelect: dynamically filtered based on scope/books
  const trackStyleDropdownOptions: DropdownSelectOption<PlanTrackStyle>[] = useMemo(
    () =>
      availableTrackStyles.map((t) => ({
        value: t.value,
        label: t.label,
      })),
    [availableTrackStyles]
  );

  // Quick book selection presets for custom scope
  const handleSelectBooksPreset = (preset: 'all' | 'ot' | 'nt' | 'gospels' | 'pentateuch' | 'poetry' | 'clear') => {
    switch (preset) {
      case 'all':
        setCustomBookIds(CANONICAL_BOOKS.map((b) => b.id));
        break;
      case 'ot':
        setCustomBookIds(CANONICAL_BOOKS.filter((b) => b.testament === 'OT').map((b) => b.id));
        break;
      case 'nt':
        setCustomBookIds(CANONICAL_BOOKS.filter((b) => b.testament === 'NT').map((b) => b.id));
        break;
      case 'gospels':
        setCustomBookIds([40, 41, 42, 43]);
        break;
      case 'pentateuch':
        setCustomBookIds([1, 2, 3, 4, 5]);
        break;
      case 'poetry':
        setCustomBookIds(CANONICAL_BOOKS.filter((b) => b.section === 'Poetry').map((b) => b.id));
        break;
      case 'clear':
        setCustomBookIds([1]); // keep at least 1 book
        break;
    }
  };

  const handleToggleBook = (bookId: number) => {
    setCustomBookIds((prev) => {
      if (prev.includes(bookId)) {
        if (prev.length <= 1) return prev; // keep at least 1 book
        return prev.filter((id) => id !== bookId);
      } else {
        return [...prev, bookId].sort((a, b) => a - b);
      }
    });
  };

  return (
    <div className="w-full min-h-screen selection:bg-[var(--text-selection)] animate-fade-in pb-36 font-sans select-none">
      {/* Top Sticky Omnibar Header for Plans View */}
      <header className="sticky top-0 z-40 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex items-center py-1">
            {/* Trigger anchor with current plan title: invokes plan selection modal when clicked */}
            <button
              type="button"
              onClick={() => setIsPlanSwitcherOpen(true)}
              className="group flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer focus:outline-none min-w-0 max-w-full"
              title="Click to change or select reading plan"
              aria-label={`Current plan: ${activePlan?.title || 'Select Reading Plan'}. Click to switch plan.`}
            >
              <h1 className="font-sans text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] m-0 leading-normal select-none truncate group-hover:opacity-80 transition-opacity">
                {isLoading && !activePlan ? (
                  <span className="inline-block h-6 sm:h-7 w-48 sm:w-60 rounded bg-[var(--text-primary)]/15 animate-pulse align-middle" />
                ) : (
                  activePlan ? activePlan.title : 'Bible Reading Plans'
                )}
              </h1>
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-subtle)] group-hover:text-[var(--text-primary)] shrink-0 transition-transform group-hover:translate-y-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* New Plan button beside it at the far right */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => {
                setIsNewPlanModalOpen(true);
              }}
              className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-sans font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/8 border border-[var(--line-subtle)]/70 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Create or configure a new reading plan"
              aria-label="New Plan"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Plan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 font-sans select-none">
        {isLoading ? (
          <ReadingPlansContentSkeleton />
        ) : activePlan && currentSchedule ? (
          <div className="flex flex-col gap-8">
            {/* Visual Progress Bar Strip */}
            <div className="flex flex-col gap-2 pb-4 border-b border-[var(--line-subtle)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-subtle)] font-sans">
                <span>
                  {completedDaysCount} {completedDaysCount === 1 ? 'day' : 'days'} complete
                </span>
                <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                  {progressPercent}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Plan progress: ${completedDaysCount} days complete (${progressPercent}%)`}
                className="w-full h-2.5 rounded-full bg-[var(--bg-active)] border border-[var(--border-subtle)] overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[var(--text-primary)]'
                  }`}
                  style={{
                    width: `${
                      completedDaysCount > 0 || completedPortionsCount > 0
                        ? Math.min(100, Math.max(1, progressPercent))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

          {/* Focused Day Navigator: Forward and backward arrows; at most Previous, Today, Tomorrow */}
          <section
            aria-label="Day selection"
            className="flex flex-col gap-6"
          >
            {/* Primary Date Headline & Arrow Controls */}
            <div className="flex items-center justify-between gap-4">
              {/* Backward Arrow */}
              <button
                type="button"
                onClick={() => setFocusedDayNumber((d) => Math.max(1, d - 1))}
                disabled={focusedDayNumber <= 1}
                className="p-2 sm:p-2.5 -ml-2 rounded-full text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
                title={focusedDayNumber > 1 ? `Previous Day (Day ${focusedDayNumber - 1})` : 'Start of plan'}
                aria-label="Previous day"
              >
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
                <span className="hidden sm:inline text-xs font-medium tracking-tight">
                  {prevSchedule ? `Day ${prevSchedule.dayNumber}` : ''}
                </span>
              </button>

              {/* Central Focused Day Title */}
              <div className="flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xl sm:text-2xl md:text-3xl ${accentFontClass} font-medium text-[var(--text-primary)] tracking-tight`}>
                    Day {focusedDayNumber}
                  </span>
                  {focusedDayNumber === currentElapsedDay && (
                    <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-subtle)] opacity-75">
                      (Today)
                    </span>
                  )}
                  {isCurrentDayDone && (
                    <span
                      className="text-emerald-600 dark:text-emerald-400 text-sm font-sans"
                      title="Completed"
                      aria-label="Completed"
                    >
                      ✓
                    </span>
                  )}
                </div>

                <span className="text-xs sm:text-sm text-[var(--text-subtle)]">
                  {formatDayDate(focusedDayNumber)}
                </span>

                {focusedDayNumber !== currentElapsedDay && (
                  <button
                    type="button"
                    onClick={() => setFocusedDayNumber(currentElapsedDay)}
                    className="text-[11px] text-[var(--text-subtle)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer mt-0.5 transition-colors"
                  >
                    Return to Today (Day {currentElapsedDay})
                  </button>
                )}
              </div>

              {/* Forward Arrow */}
              <button
                type="button"
                onClick={() =>
                  setFocusedDayNumber((d) => Math.min(activePlan.durationDays, d + 1))
                }
                disabled={focusedDayNumber >= activePlan.durationDays}
                className="p-2 sm:p-2.5 -mr-2 rounded-full text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
                title={
                  focusedDayNumber < activePlan.durationDays
                    ? `Next Day (Day ${focusedDayNumber + 1})`
                    : 'End of plan'
                }
                aria-label="Next day"
              >
                <span className="hidden sm:inline text-xs font-medium tracking-tight">
                  {nextSchedule ? `Day ${nextSchedule.dayNumber}` : ''}
                </span>
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
              </button>
            </div>
          </section>

          {/* Assigned Readings: Clean, Unboxed Typographic Layout (No Cards) */}
          <section className="flex flex-col gap-6">
            {currentSchedule.isRestDay ? (
              <div className="py-12 flex flex-col items-center text-center gap-3">
                <p className={`${accentFontClass} italic text-lg sm:text-xl text-[var(--text-primary)] max-w-lg leading-relaxed`}>
                  “Come to me, all you who are weary and burdened, and I will give you rest.”
                </p>
                <span className="text-xs text-[var(--text-subtle)]">
                  Matthew 11:28 · Catch-Up &amp; Reflection Day
                </span>
                <p className="text-xs text-[var(--text-subtle)] max-w-md leading-relaxed mt-1">
                  No new chapters scheduled today. Take unhurried time for reflection, prayer,
                  gathering with your church community, or catching up on previous days.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--line-subtle)]">
                {currentSchedule.readings.map((portion, idx) => {
                  const portionKey = `${focusedDayNumber}-${idx}`;
                  const isPortionDone = Boolean(activePlan.completedPortions?.[portionKey]);

                  return (
                    <div
                      key={idx}
                      className="py-4 sm:py-5 flex items-center justify-between gap-4 group"
                    >
                      {/* Checkbox + Scripture Reference */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isPortionDone}
                          aria-label={`Mark ${portion.displayRef} as ${isPortionDone ? 'incomplete' : 'complete'}`}
                          onClick={() => void handleTogglePortion(idx)}
                          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]/40 ${
                            isPortionDone
                              ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-app)]'
                              : 'border-[var(--text-subtle)]/40 hover:border-[var(--text-primary)] bg-transparent hover:bg-[var(--text-primary)]/5'
                          }`}
                          title={isPortionDone ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {isPortionDone && (
                            <svg
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                          )}
                        </button>

                        {/* Scripture Reference (Strikethrough when finished; clicks into reader) */}
                        <button
                          type="button"
                          onClick={() => handleLaunchPlanReading(idx)}
                          className={`text-xl sm:text-2xl ${accentFontClass} text-left cursor-pointer transition-colors leading-snug truncate ${
                            isPortionDone
                              ? 'text-[var(--text-subtle)] line-through'
                              : 'text-[var(--text-primary)] group-hover:underline underline-offset-4'
                          }`}
                          title={
                            isPortionDone
                              ? `${portion.displayRef} (Completed · click to open in Reader)`
                              : `Read ${portion.displayRef} in Scripture Reader`
                          }
                        >
                          {portion.displayRef}
                        </button>
                      </div>

                      {/* Direct Action: Read */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLaunchPlanReading(idx)}
                          className="text-xs sm:text-sm font-medium text-[var(--text-subtle)] group-hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 py-1 px-2 rounded hover:bg-[var(--text-primary)]/5 flex items-center gap-1 self-center"
                          title={`Read ${portion.displayRef}`}
                        >
                          <span>{isPortionDone ? 'Read again' : 'Read'}</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Primary Action Section */}
            {!currentSchedule.isRestDay && currentSchedule.readings.length > 0 && (
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--line-subtle)]">
                <button
                  type="button"
                  onClick={() => handleLaunchPlanReading(0)}
                  className="px-6 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-app)] text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Read Day’s Portions</span>
                  <span aria-hidden="true">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleCurrentDay()}
                  className="text-xs sm:text-sm text-[var(--text-subtle)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer transition-colors self-center"
                >
                  {isCurrentDayDone ? 'Mark Day as Incomplete' : 'Mark All Today Complete'}
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Empty State */
        <div className="py-24 flex flex-col items-center text-center gap-4">
          <p className={`text-base ${accentFontClass} text-[var(--text-subtle)]`}>
            No active Bible reading plan selected.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsNewPlanModalOpen(true);
            }}
            className="px-5 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold cursor-pointer"
          >
            Choose a Reading Plan
          </button>
        </div>
      )}
      </main>

      {/* Plan Switcher Modal (Progressive Disclosure) */}
      <Modal
        isOpen={isPlanSwitcherOpen}
        onClose={() => setIsPlanSwitcherOpen(false)}
        title="Saved Bible Reading Plans"
        maxWidthClassName="max-w-md"
      >
        <div className="p-6 flex flex-col gap-4 font-sans text-xs sm:text-sm">
          <p className="text-xs text-[var(--text-subtle)]">
            Select an active plan or create a new schedule. All plans and progress are stored safely on your device.
          </p>

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto divide-y divide-[var(--line-subtle)]">
            {allPlans.map((plan) => {
              const isActive = plan.id === activePlan?.id;
              const completedCount = plan.completedDays?.length || 0;
              const pct = Math.round((completedCount / plan.durationDays) * 100);

              return (
                <div
                  key={plan.id}
                  className={`pt-3 pb-2 flex items-center justify-between gap-3 ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handleSelectPlan(plan.id)}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[var(--text-primary)] truncate ${accentFontClass} text-base`}>
                        {plan.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-subtle)] truncate block font-sans font-normal mt-0.5">
                      {plan.durationDays} days · {plan.daysPerWeek}d/wk · {completedCount}/{plan.durationDays} complete ({pct}%)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeletePlan(plan.id)}
                    className="p-1.5 text-[var(--text-subtle)] hover:text-rose-500 transition-colors cursor-pointer"
                    title="Delete Plan"
                    aria-label="Delete Plan"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--line-subtle)] flex items-center justify-between gap-3">
            {activePlan && (
              <button
                type="button"
                onClick={handleResetProgress}
                className="text-xs text-[var(--text-subtle)] hover:text-rose-500 underline cursor-pointer"
              >
                Reset Progress
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsPlanSwitcherOpen(false);
                setIsNewPlanModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer ml-auto"
            >
              + Create Plan
            </button>
          </div>
        </div>
      </Modal>

      {/* New Reading Plan Generator Modal (Classical Presets & Custom 4-Variable Engine) */}
      <Modal
        isOpen={isNewPlanModalOpen}
        onClose={() => setIsNewPlanModalOpen(false)}
        title="Configure Bible Reading Plan"
        maxWidthClassName="max-w-xl"
      >
        <div className="p-6 sm:p-7 pt-4 flex flex-col gap-4 font-sans text-xs sm:text-sm">
          {/* Plan Preset / Template Selector */}
          <DropdownSelect
            label="Plan Preset"
            value={selectedPlanOption}
            options={planPresetOptions}
            onChange={(val) => handleSelectPlanOption(String(val))}
            isActive={selectedPlanOption !== 'mcheyne'}
            title="Select Reading Plan Preset"
          />

          {/* Preset Description / Info Card when a Classical Preset is selected */}
          {selectedPresetDef && selectedPlanOption !== 'custom' && (
            <div className="p-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-surface)]/70 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className={`${accentFontClass} text-sm text-[var(--text-primary)]`}>
                  {selectedPresetDef.title}
                </span>
                {selectedPresetDef.recommendedBadge && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-subtle)] px-1.5 py-0.5 rounded border border-[var(--line-subtle)] bg-[var(--bg-surface)]">
                    {selectedPresetDef.recommendedBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
                {selectedPresetDef.description}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[var(--text-subtle)]">
                <span>{selectedPresetDef.durationDays} days</span>
                <span>•</span>
                <span>{selectedPresetDef.daysPerWeek} days/week</span>
              </div>
            </div>
          )}

          {/* Custom Plan Title: ONLY shown when 'custom' is selected */}
          {selectedPlanOption === 'custom' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Plan Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="px-3 py-2 text-xs rounded border border-[var(--line-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                placeholder="e.g. My 90-Day New Testament Journey"
              />
            </div>
          )}

          {/* 4 Core Variables: Locked for Classical Presets, Unlocked for Custom Plan */}
          <div className="flex flex-col gap-2">
            {selectedPlanOption !== 'custom' && (
              <span className="text-[11px] text-[var(--text-subtle)] font-medium">
                Pacing parameters locked by classical preset:
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Scope Dropdown */}
              <DropdownSelect
                label="1. Scope"
                value={customScope}
                options={scopeDropdownOptions}
                onChange={(val) => setCustomScope(val as PlanScope)}
                disabled={selectedPlanOption !== 'custom'}
                isActive={selectedPlanOption === 'custom' && customScope !== 'entire-bible'}
                title="Reading Plan Scope"
              />

              {/* 2. Duration Dropdown */}
              <div className="flex flex-col gap-1 w-full">
                <DropdownSelect
                  label="2. Duration"
                  value={customDurationChoice}
                  options={durationDropdownOptions}
                  onChange={(val) => setCustomDurationChoice(String(val))}
                  disabled={selectedPlanOption !== 'custom'}
                  isActive={selectedPlanOption === 'custom' && customDurationChoice !== '365'}
                  title="Reading Plan Duration"
                />
                {selectedPlanOption === 'custom' && customDurationChoice === 'custom' && (
                  <div className="flex items-center gap-2 mt-1 px-0.5">
                    <label className="text-xs text-[var(--text-subtle)] shrink-0">
                      Custom Days:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customDurationInput}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
                        setCustomDurationInput(val);
                      }}
                      className="w-20 h-7 px-2 text-xs rounded border border-[var(--line-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--text-primary)]"
                      placeholder="e.g. 45"
                    />
                    <span className="text-xs text-[var(--text-subtle)] font-mono">days</span>
                  </div>
                )}
              </div>

              {/* 3. Days / Week Dropdown */}
              <DropdownSelect
                label="3. Days / Week"
                value={customDaysPerWeek}
                options={daysPerWeekDropdownOptions}
                onChange={(val) => setCustomDaysPerWeek(Number(val) as PlanDaysPerWeek)}
                disabled={selectedPlanOption !== 'custom'}
                isActive={selectedPlanOption === 'custom' && customDaysPerWeek !== 7}
                title="Active Reading Days Per Week"
              />

              {/* 4. Multi-Track Style Dropdown: Dynamically filtered based on scope/books */}
              <DropdownSelect
                label="4. Multi-Track Style"
                value={customTrackStyle}
                options={trackStyleDropdownOptions}
                onChange={(val) => setCustomTrackStyle(val as PlanTrackStyle)}
                disabled={selectedPlanOption !== 'custom'}
                isActive={selectedPlanOption === 'custom' && customTrackStyle !== 'canonical'}
                title="Multi-Track Stream Configuration"
              />
            </div>
          </div>

          {/* Progressive Books Selection Drawer when Scope is 'custom-books' */}
          {selectedPlanOption === 'custom' && customScope === 'custom-books' && (
            <div className="p-3.5 rounded border border-[var(--line-subtle)] bg-[var(--bg-surface)]/60 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line-subtle)] pb-2.5">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">
                    Custom Books Selection
                  </span>
                  <span className="text-[11px] text-[var(--text-subtle)]">
                    {customBookIds.length} of {CANONICAL_BOOKS.length} books selected ({customPacingPreview.totalChapters} chapters)
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('all')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('ot')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    OT (39)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('nt')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    NT (27)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('gospels')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    Gospels (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('pentateuch')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    Torah (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('poetry')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-[var(--text-primary)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  >
                    Poetry (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBooksPreset('clear')}
                    className="px-2 py-0.5 rounded border border-[var(--line-subtle)] hover:border-rose-400 text-[var(--text-subtle)] hover:text-rose-500 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable Book Grid with Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {CANONICAL_BOOKS.map((b) => {
                  const isSelected = customBookIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer select-none transition-colors ${
                        isSelected
                          ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-subtle)] hover:bg-[var(--text-primary)]/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleBook(b.id)}
                        className="rounded border-[var(--line-subtle)] text-[var(--text-primary)] cursor-pointer"
                      />
                      <span className="truncate flex-1">{b.name}</span>
                      <span className="text-[10px] opacity-60 font-mono shrink-0">
                        {b.chapterCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewPlanModalOpen(false)}
              className="px-4 py-2 rounded-full border border-[var(--line-subtle)] text-xs text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedPlanOption === 'custom') {
                  void handleCreateCustom();
                } else {
                  void handleStartPreset(selectedPlanOption as NonNullable<ReadingPlan['presetKey']>);
                }
              }}
              className="px-5 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {selectedPlanOption === 'custom' ? 'Create & Start Plan' : 'Start Plan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReadingPlansView;
