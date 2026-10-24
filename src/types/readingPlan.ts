export type PlanScope =
  | 'entire-bible'
  | 'ot-only'
  | 'nt-only'
  | 'gospels-acts'
  | 'epistles'
  | 'wisdom-poetry'
  | 'custom-books';

export type PlanDaysPerWeek = 7 | 6 | 5 | 4 | 3 | 2 | 1;

export type PlanTrackStyle = 'canonical' | 'multi-track' | 'mcheyne' | 'chronological';

export interface PlanReadingPortion {
  trackName: string; // e.g. "Old Testament", "New Testament", "Psalms & Wisdom", "Family", "Secret"
  bookId: number;
  bookName: string;
  startChapter: number;
  endChapter: number;
  displayRef: string; // e.g. "Genesis 1–3" or "Matthew 1"
}

export interface PlanDaySchedule {
  dayNumber: number; // 1, 2, ...
  activeDayIndex: number; // 0, 1, ...
  isRestDay: boolean; // For 5-day / 6-day plans (weekend catch-up and reflection)
  readings: PlanReadingPortion[];
}

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  isPreset: boolean;
  presetKey?: 'mcheyne' | 'chronological' | '5day' | 'nt90' | 'wisdom60' | 'canonical1yr';
  scope: PlanScope;
  durationDays: number; // total calendar days (e.g. 365, 90, 60)
  daysPerWeek: PlanDaysPerWeek;
  trackStyle: PlanTrackStyle;
  customBookIds?: number[]; // when scope is 'custom-books'
  startDate: number; // timestamp
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  // Progress tracking
  completedDays: number[]; // array of completed dayNumbers e.g. [1, 2, 4]
  completedPortions: Record<string, boolean>; // key: `${dayNumber}-${portionIndex}`
}

export interface PlanPacingSummary {
  totalChapters: number;
  activeDaysCount: number;
  restDaysCount: number;
  averageChaptersPerDay: number;
  trackCount: number;
}

export interface PlanAssignedChapter {
  bookId: number;
  bookName: string;
  chapter: number;
  portionIndex: number;
  displayRef: string;
  trackName: string;
}

export interface PlanReadingSession {
  planId: string;
  planTitle: string;
  dayNumber: number;
  totalDays: number;
  assignedChapters: PlanAssignedChapter[];
  currentChapterIndex: number;
  isDayFinished: boolean;
}
