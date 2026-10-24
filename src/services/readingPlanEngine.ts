import { CANONICAL_BOOKS, getBookById } from '../data/canonicalBooks';
import type {
  PlanScope,
  PlanDaysPerWeek,
  PlanTrackStyle,
  PlanReadingPortion,
  PlanDaySchedule,
  ReadingPlan,
  PlanPacingSummary,
  PlanAssignedChapter,
} from '../types/readingPlan';

export interface ChapterRef {
  bookId: number;
  bookName: string;
  chapter: number;
}

// Chronological canonical order approximation mapping biblical history
export const CHRONOLOGICAL_BOOK_ORDER: number[] = [
  1,  // Genesis
  18, // Job (Patriarchal era)
  2,  // Exodus
  3,  // Leviticus
  4,  // Numbers
  5,  // Deuteronomy
  6,  // Joshua
  7,  // Judges
  8,  // Ruth
  9,  // 1 Samuel
  10, // 2 Samuel
  13, // 1 Chronicles
  19, // Psalms (Davidic & temple worship)
  11, // 1 Kings
  14, // 2 Chronicles
  20, // Proverbs
  21, // Ecclesiastes
  22, // Song of Songs
  30, // Amos
  28, // Hosea
  32, // Jonah
  33, // Micah
  23, // Isaiah
  34, // Nahum
  36, // Zephaniah
  35, // Habakkuk
  24, // Jeremiah
  25, // Lamentations
  12, // 2 Kings (Exile)
  27, // Daniel
  26, // Ezekiel
  17, // Esther
  15, // Ezra
  37, // Haggai
  38, // Zechariah
  16, // Nehemiah
  39, // Malachi
  40, // Matthew
  41, // Mark
  42, // Luke
  43, // John
  44, // Acts
  48, // Galatians (Early Paul)
  49, // Ephesians
  50, // Philippians
  51, // Colossians
  52, // 1 Thessalonians
  53, // 2 Thessalonians
  45, // Romans
  46, // 1 Corinthians
  47, // 2 Corinthians
  54, // 1 Timothy
  55, // 2 Timothy
  56, // Titus
  57, // Philemon
  58, // Hebrews
  59, // James
  60, // 1 Peter
  61, // 2 Peter
  62, // 1 John
  63, // 2 John
  64, // 3 John
  65, // Jude
  66, // Revelation
];

/**
 * Returns flat list of ChapterRef for a book
 */
function getChaptersForBook(bookId: number): ChapterRef[] {
  const book = getBookById(bookId);
  if (!book) return [];
  const chapters: ChapterRef[] = [];
  for (let c = 1; c <= book.chapterCount; c++) {
    chapters.push({
      bookId: book.id,
      bookName: book.name,
      chapter: c,
    });
  }
  return chapters;
}

/**
 * Builds all ChapterRefs for a given scope
 */
export function getChaptersForScope(scope: PlanScope, customBookIds?: number[]): ChapterRef[] {
  switch (scope) {
    case 'ot-only':
      return CANONICAL_BOOKS.filter((b) => b.testament === 'OT').flatMap((b) => getChaptersForBook(b.id));
    case 'nt-only':
      return CANONICAL_BOOKS.filter((b) => b.testament === 'NT').flatMap((b) => getChaptersForBook(b.id));
    case 'gospels-acts':
      return CANONICAL_BOOKS.filter((b) => b.id >= 40 && b.id <= 44).flatMap((b) => getChaptersForBook(b.id));
    case 'epistles':
      return CANONICAL_BOOKS.filter((b) => b.id >= 45 && b.id <= 66).flatMap((b) => getChaptersForBook(b.id));
    case 'wisdom-poetry':
      return CANONICAL_BOOKS.filter((b) => b.section === 'Poetry').flatMap((b) => getChaptersForBook(b.id));
    case 'custom-books': {
      const bookIds = customBookIds && customBookIds.length > 0 ? customBookIds : [1]; // default Genesis if empty
      const idSet = new Set(bookIds);
      return CANONICAL_BOOKS.filter((b) => idSet.has(b.id)).flatMap((b) => getChaptersForBook(b.id));
    }
    case 'entire-bible':
    default:
      return CANONICAL_BOOKS.flatMap((b) => getChaptersForBook(b.id));
  }
}

export interface TrackStyleOption {
  value: PlanTrackStyle;
  label: string;
  description?: string;
}

/**
 * Returns strictly relevant multi-track style options based on the chosen scope.
 * Eliminates irrelevant combinations (e.g. OT+NT parallel when scope lacks OT or NT).
 */
export function getAvailableTrackStylesForScope(
  scope: PlanScope,
  customBookIds?: number[]
): TrackStyleOption[] {
  let hasOT = false;
  let hasNT = false;

  if (scope === 'entire-bible') {
    hasOT = true;
    hasNT = true;
  } else if (scope === 'ot-only' || scope === 'wisdom-poetry') {
    hasOT = true;
    hasNT = false;
  } else if (scope === 'nt-only' || scope === 'gospels-acts' || scope === 'epistles') {
    hasOT = false;
    hasNT = true;
  } else if (scope === 'custom-books') {
    const ids = customBookIds || [];
    hasOT = ids.some((id) => id <= 39);
    hasNT = ids.some((id) => id >= 40);
  }

  const options: TrackStyleOption[] = [];

  // Multi-track options: ONLY relevant based on previous choices!
  if (hasOT && hasNT) {
    options.push({
      value: 'multi-track',
      label: 'Multi-Track (OT + NT)',
    });
  } else if (!hasOT && hasNT && scope === 'nt-only') {
    options.push({
      value: 'multi-track',
      label: 'Parallel Streams (Gospels + Epistles)',
    });
  } else if (hasOT && !hasNT && scope === 'ot-only') {
    options.push({
      value: 'multi-track',
      label: 'Parallel Streams (History + Poetry/Prophets)',
    });
  }

  // Canonical is universally valid
  options.push({
    value: 'canonical',
    label: 'Canonical (Sequential)',
  });

  // Chronological
  options.push({
    value: 'chronological',
    label: 'Chronological',
  });

  // M'Cheyne 4-Track System: ONLY valid when scope is Entire Bible
  if (scope === 'entire-bible') {
    options.push({
      value: 'mcheyne',
      label: "M'Cheyne (4-Track)",
    });
  }

  return options;
}

/**
 * Splits chapters into parallel multi-tracks
 */
export function buildTracksForPlan(
  scope: PlanScope,
  trackStyle: PlanTrackStyle,
  customBookIds?: number[]
): Array<{ trackName: string; chapters: ChapterRef[] }> {
  if (trackStyle === 'canonical') {
    return [{ trackName: 'Scripture', chapters: getChaptersForScope(scope, customBookIds) }];
  }

  if (trackStyle === 'chronological') {
    const scopeChapters = getChaptersForScope(scope, customBookIds);
    const scopeBookIds = new Set(scopeChapters.map((c) => c.bookId));
    // Order books chronologically, filtered to the active scope
    const chronoOrdered = CHRONOLOGICAL_BOOK_ORDER.filter((id) => scopeBookIds.has(id)).flatMap((id) =>
      getChaptersForBook(id)
    );
    return [{ trackName: 'Chronological Stream', chapters: chronoOrdered }];
  }

  if (trackStyle === 'mcheyne') {
    // Robert Murray M'Cheyne 4-Track System
    if (scope === 'entire-bible') {
      return [
        {
          trackName: 'Family (Law & History)',
          chapters: CANONICAL_BOOKS.filter((b) => b.id >= 1 && b.id <= 17).flatMap((b) =>
            getChaptersForBook(b.id)
          ),
        },
        {
          trackName: 'Family (Gospels & Acts)',
          chapters: CANONICAL_BOOKS.filter((b) => b.id >= 40 && b.id <= 44).flatMap((b) =>
            getChaptersForBook(b.id)
          ),
        },
        {
          trackName: 'Secret (Poetry & Prophets)',
          chapters: CANONICAL_BOOKS.filter((b) => (b.id >= 18 && b.id <= 39)).flatMap((b) =>
            getChaptersForBook(b.id)
          ),
        },
        {
          trackName: 'Secret (Epistles & Revelation)',
          chapters: CANONICAL_BOOKS.filter((b) => b.id >= 45 && b.id <= 66).flatMap((b) =>
            getChaptersForBook(b.id)
          ),
        },
      ];
    }
  }

  // Multi-Track standard (2 or 3 streams)
  if (scope === 'entire-bible') {
    return [
      {
        trackName: 'Old Testament History',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 1 && b.id <= 17).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
      {
        trackName: 'Psalms & Prophets',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 18 && b.id <= 39).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
      {
        trackName: 'New Testament',
        chapters: CANONICAL_BOOKS.filter((b) => b.testament === 'NT').flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
    ];
  }

  if (scope === 'nt-only') {
    return [
      {
        trackName: 'Gospels & Acts',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 40 && b.id <= 44).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
      {
        trackName: 'Epistles & Revelation',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 45 && b.id <= 66).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
    ];
  }

  if (scope === 'ot-only') {
    return [
      {
        trackName: 'Law & History',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 1 && b.id <= 17).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
      {
        trackName: 'Poetry & Prophets',
        chapters: CANONICAL_BOOKS.filter((b) => b.id >= 18 && b.id <= 39).flatMap((b) =>
          getChaptersForBook(b.id)
        ),
      },
    ];
  }

  if (scope === 'custom-books') {
    const chapters = getChaptersForScope(scope, customBookIds);
    const otChapters = chapters.filter((c) => c.bookId <= 39);
    const ntChapters = chapters.filter((c) => c.bookId >= 40);

    if (otChapters.length > 0 && ntChapters.length > 0) {
      return [
        { trackName: 'Old Testament Portion', chapters: otChapters },
        { trackName: 'New Testament Portion', chapters: ntChapters },
      ];
    }
    return [{ trackName: 'Scripture', chapters }];
  }

  // Fallback to single canonical stream
  return [{ trackName: 'Daily Portion', chapters: getChaptersForScope(scope, customBookIds) }];
}

/**
 * Groups contiguous ChapterRefs into clean portions e.g. "Genesis 1–3"
 */
function groupChaptersIntoPortions(trackName: string, chapters: ChapterRef[]): PlanReadingPortion[] {
  if (chapters.length === 0) return [];

  const portions: PlanReadingPortion[] = [];
  let currentBookId = chapters[0].bookId;
  let currentBookName = chapters[0].bookName;
  let startChapter = chapters[0].chapter;
  let prevChapter = chapters[0].chapter;

  for (let i = 1; i < chapters.length; i++) {
    const item = chapters[i];
    if (item.bookId === currentBookId && item.chapter === prevChapter + 1) {
      prevChapter = item.chapter;
    } else {
      // Push segment
      const displayRef =
        startChapter === prevChapter
          ? `${currentBookName} ${startChapter}`
          : `${currentBookName} ${startChapter}–${prevChapter}`;
      portions.push({
        trackName,
        bookId: currentBookId,
        bookName: currentBookName,
        startChapter,
        endChapter: prevChapter,
        displayRef,
      });

      currentBookId = item.bookId;
      currentBookName = item.bookName;
      startChapter = item.chapter;
      prevChapter = item.chapter;
    }
  }

  // Push final segment
  const displayRef =
    startChapter === prevChapter
      ? `${currentBookName} ${startChapter}`
      : `${currentBookName} ${startChapter}–${prevChapter}`;
  portions.push({
    trackName,
    bookId: currentBookId,
    bookName: currentBookName,
    startChapter,
    endChapter: prevChapter,
    displayRef,
  });

  return portions;
}

/**
 * Calculates smart pacing summary for a configuration
 */
export function calculatePlanPacingSummary(
  scope: PlanScope,
  durationDays: number,
  daysPerWeek: PlanDaysPerWeek,
  trackStyle: PlanTrackStyle,
  customBookIds?: number[]
): PlanPacingSummary {
  const tracks = buildTracksForPlan(scope, trackStyle, customBookIds);
  const totalChapters = tracks.reduce((acc, t) => acc + t.chapters.length, 0);

  let activeDaysCount = 0;
  let restDaysCount = 0;

  for (let d = 1; d <= durationDays; d++) {
    const dayOfWeek = ((d - 1) % 7) + 1; // 1 to 7
    if (dayOfWeek <= daysPerWeek) {
      activeDaysCount++;
    } else {
      restDaysCount++;
    }
  }

  const averageChaptersPerDay = activeDaysCount > 0 ? Number((totalChapters / activeDaysCount).toFixed(1)) : 0;

  return {
    totalChapters,
    activeDaysCount,
    restDaysCount,
    averageChaptersPerDay,
    trackCount: tracks.length,
  };
}

/**
 * Generates the full day-by-day reading schedule dynamically on the fly
 */
export function generatePlanSchedule(
  scope: PlanScope,
  durationDays: number,
  daysPerWeek: PlanDaysPerWeek,
  trackStyle: PlanTrackStyle,
  customBookIds?: number[]
): PlanDaySchedule[] {
  const tracks = buildTracksForPlan(scope, trackStyle, customBookIds);

  // Determine active days vs rest days
  const schedule: PlanDaySchedule[] = [];
  const activeDayIndices: number[] = [];

  for (let day = 1; day <= durationDays; day++) {
    const dayOfWeek = ((day - 1) % 7) + 1; // 1 to 7
    const isRest = dayOfWeek > daysPerWeek;
    if (!isRest) {
      activeDayIndices.push(day);
    }
  }

  const totalActiveDays = activeDayIndices.length;
  if (totalActiveDays === 0) return [];

  // For each track, slice chapters across active days proportionally
  const trackSlices: Map<number, PlanReadingPortion[][]> = new Map();

  tracks.forEach((track, trackIdx) => {
    const trackChapters = track.chapters;
    const count = trackChapters.length;
    const slicesForTrack: PlanReadingPortion[][] = [];

    for (let i = 0; i < totalActiveDays; i++) {
      if (count === 0) {
        slicesForTrack.push([]);
        continue;
      }
      const startIndex = Math.floor((i * count) / totalActiveDays);
      const endIndex = Math.min(count, Math.floor(((i + 1) * count) / totalActiveDays));
      const sliceChapters = trackChapters.slice(startIndex, Math.max(startIndex + 1, endIndex));
      const portions = groupChaptersIntoPortions(track.trackName, sliceChapters);
      slicesForTrack.push(portions);
    }

    trackSlices.set(trackIdx, slicesForTrack);
  });

  // Assemble full calendar days
  let activeCursor = 0;

  for (let day = 1; day <= durationDays; day++) {
    const dayOfWeek = ((day - 1) % 7) + 1;
    const isRest = dayOfWeek > daysPerWeek;

    if (isRest) {
      schedule.push({
        dayNumber: day,
        activeDayIndex: activeCursor,
        isRestDay: true,
        readings: [],
      });
    } else {
      const readings: PlanReadingPortion[] = [];
      tracks.forEach((_, trackIdx) => {
        const slices = trackSlices.get(trackIdx);
        if (slices && slices[activeCursor]) {
          readings.push(...slices[activeCursor]);
        }
      });

      schedule.push({
        dayNumber: day,
        activeDayIndex: activeCursor,
        isRestDay: false,
        readings,
      });

      activeCursor++;
    }
  }

  return schedule;
}

/**
 * Classical presets library
 */
export interface PlanPresetDefinition {
  key: NonNullable<ReadingPlan['presetKey']>;
  title: string;
  tagline: string;
  description: string;
  scope: PlanScope;
  durationDays: number;
  daysPerWeek: PlanDaysPerWeek;
  trackStyle: PlanTrackStyle;
  recommendedBadge?: string;
}

export const CLASSICAL_PRESETS: PlanPresetDefinition[] = [
  {
    key: 'mcheyne',
    title: 'Robert Murray M’Cheyne',
    tagline: 'Classical 4-track daily reading system',
    description:
      'Four daily portions across the Old Testament, Psalms, and New Testament. Family and secret devotion streams with rich canonical breadth.',
    scope: 'entire-bible',
    durationDays: 365,
    daysPerWeek: 7,
    trackStyle: 'mcheyne',
    recommendedBadge: 'Classical Standard',
  },
  {
    key: '5day',
    title: '5-Day Bible Reading Plan',
    tagline: 'Whole Bible in 1 Year with weekend rest',
    description:
      'Read Monday through Friday (~4.5 chapters/day) with Saturdays and Sundays reserved for reflection, Lord’s Day gathering, and catch-up.',
    scope: 'entire-bible',
    durationDays: 365,
    daysPerWeek: 5,
    trackStyle: 'multi-track',
    recommendedBadge: 'Popular',
  },
  {
    key: 'chronological',
    title: 'Chronological Plan',
    tagline: 'Read Scripture in historical order',
    description:
      'Experience redemptive history as it unfolded. Job is woven into Genesis, the Prophets alongside the Kings, and the Epistles with Acts.',
    scope: 'entire-bible',
    durationDays: 365,
    daysPerWeek: 7,
    trackStyle: 'chronological',
  },
  {
    key: 'nt90',
    title: 'New Testament in 90 Days',
    tagline: 'Immersive 3-month walk through the Apostles',
    description:
      'Read ~3 chapters per day through the Gospels, Acts, Epistles, and Revelation for an inspiring seasonal immersion in the Covenant of Grace.',
    scope: 'nt-only',
    durationDays: 90,
    daysPerWeek: 7,
    trackStyle: 'multi-track',
  },
  {
    key: 'wisdom60',
    title: 'Psalms & Proverbs in 60 Days',
    tagline: 'Daily wisdom, praise, and covenant prayer',
    description:
      'A two-month spiritual rhythm immersing your morning and evening in the Hebrew Psalter and Solomon’s wisdom for daily life.',
    scope: 'wisdom-poetry',
    durationDays: 60,
    daysPerWeek: 7,
    trackStyle: 'canonical',
  },
  {
    key: 'canonical1yr',
    title: 'Genesis to Revelation',
    tagline: 'Straight-through canonical journey',
    description:
      'A classic sequential journey through all 66 books from Genesis 1 to Revelation 22 (~3.2 chapters per day).',
    scope: 'entire-bible',
    durationDays: 365,
    daysPerWeek: 7,
    trackStyle: 'canonical',
  },
];

/**
 * Extracts all sequential individual chapters assigned for a given day schedule
 */
export function getAssignedChaptersForDay(daySchedule: PlanDaySchedule): PlanAssignedChapter[] {
  const chapters: PlanAssignedChapter[] = [];
  daySchedule.readings.forEach((portion, pIdx) => {
    for (let c = portion.startChapter; c <= portion.endChapter; c++) {
      chapters.push({
        bookId: portion.bookId,
        bookName: portion.bookName,
        chapter: c,
        portionIndex: pIdx,
        displayRef: portion.displayRef,
        trackName: portion.trackName,
      });
    }
  });
  return chapters;
}

