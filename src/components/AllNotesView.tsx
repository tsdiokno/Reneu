import React, { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import {
  getAllNotes,
  addOrUpdateNote,
  deleteNote,
  createSynthesisNote,
  createPlainNote,
  seedSampleCommentaries,
  getUserProfile,
  saveUserProfile,
  getSynthesisEngineMode,
  getGeminiApiKey,
  hasNewNoteBeenMadeForSynthesis,
  recordNewNoteMadeForSynthesis,
  clearNewNoteMadeForSynthesis,
  isSynthesisRetained,
  isSynthesisExpired,
  pruneExpiredSyntheses,
  appendToSynthesisProfile,
} from '../services/bibleStorage';
import { checkIsDevMode } from '../utils/devSimulation';
import type { CommentaryNote, SynthesisResult, FootnoteReference } from '../types/bible';
import { getBookById } from '../data/canonicalBooks';
import { NoteField } from './NoteField';
import { SynthesisHeroBlockquote } from './SynthesisHeroBlockquote';
import { parseScriptureReference, getSynthesisReferencedBookIds } from '../utils/referenceParser';
import { formatNoteDate } from '../utils/dateFormatter';
import {
  NotesFilterToolbar,
  NotesFilterState,
  AvailableBookInfo,
} from './NotesFilterToolbar';
import { NotesViewSkeleton } from './NotesViewSkeleton';
import { fuzzyMatchNote, renderHighlightedText } from '../utils/fuzzySearch';

interface AllNotesViewProps {
  onNavigate: (bookId: number, chapter: number, verse: number) => void;
  isComposingPlainNote?: boolean;
  onToggleComposePlainNote?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

interface MultiDiceRollResult {
  die1: { name: 'd20'; roll: number; required: number; passed: boolean };
  die2: { name: 'd12'; roll: number; required: number; passed: boolean };
  die3: { name: 'd6'; roll: number; required: number; passed: boolean };
  allPassed: boolean;
}

// Minimum elapsed time (15 minutes) between automated syntheses to guard API tokens
const MIN_SYNTHESIS_COOLDOWN_MS = 15 * 60 * 1000;

const DeleteIconButton: React.FC<{
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
}> = ({ onClick, title = 'Delete note', ariaLabel = 'Delete note' }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[var(--text-subtle)] opacity-70 hover:opacity-100 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-70 sm:hover:!opacity-100 transition-opacity w-9 h-9 sm:w-8 sm:h-8 p-2 sm:p-1.5 -m-1 cursor-pointer select-none rounded flex items-center justify-center"
    title={title}
    aria-label={ariaLabel}
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
);

const StarIconButton: React.FC<{
  isStarred: boolean;
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
}> = ({
  isStarred,
  onClick,
  title = isStarred ? 'Saved to collection (Starred)' : 'Bookmark synthesis to keep permanently',
  ariaLabel = isStarred ? 'Remove bookmark from synthesis' : 'Bookmark synthesis to keep permanently',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`${
      isStarred
        ? 'text-amber-500 hover:text-amber-600 opacity-100 sm:opacity-90 sm:hover:opacity-100'
        : 'text-[var(--text-subtle)] opacity-70 hover:opacity-100 hover:text-amber-500 sm:opacity-0 sm:group-hover:opacity-70 sm:hover:!opacity-100'
    } transition-opacity w-9 h-9 sm:w-8 sm:h-8 p-2 sm:p-1.5 -m-1 cursor-pointer select-none rounded flex items-center justify-center`}
    title={title}
    aria-label={ariaLabel}
  >
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill={isStarred ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </button>
);

const PlainNoteTitleField: React.FC<{
  title: string;
  searchQuery?: string;
  onUpdateTitle: (newTitle: string) => void;
}> = ({ title, searchQuery, onUpdateTitle }) => {
  const [localTitle, setLocalTitle] = useState<string>(title);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const debounceTimerRef = useRef<number | null>(null);
  const latestTitleRef = useRef<string>(title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalTitle(title);
      latestTitleRef.current = title;
    }
  }, [title, isEditing]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTitle(val);
    latestTitleRef.current = val;
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      if (latestTitleRef.current.trim() !== (title || '').trim()) {
        onUpdateTitle(latestTitleRef.current);
      }
      debounceTimerRef.current = null;
    }, 400);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (latestTitleRef.current.trim() !== (title || '').trim()) {
      onUpdateTitle(latestTitleRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setLocalTitle(title);
      latestTitleRef.current = title;
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      e.currentTarget.blur();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        title="Click to edit note title"
        aria-label="Plain note title"
        className="w-full max-w-sm sm:max-w-md bg-transparent text-base font-sans font-semibold text-[var(--text-primary)] p-0 leading-normal cursor-text truncate select-text"
      >
        {localTitle ? (
          renderHighlightedText(localTitle, searchQuery)
        ) : (
          <span className="text-[var(--input-placeholder)]/60">Note title (optional)...</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={localTitle}
      onChange={handleChange}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
      placeholder="Note title (optional)..."
      title="Click to edit note title"
      aria-label="Plain note title"
      className="w-full max-w-sm sm:max-w-md bg-transparent text-base font-sans font-semibold text-[var(--text-primary)] outline-none border-none placeholder-[var(--input-placeholder)]/60 hover:placeholder-[var(--input-placeholder)] p-0 focus:outline-none focus:ring-0 leading-normal transition-colors cursor-text"
    />
  );
};

export const AllNotesView: React.FC<AllNotesViewProps> = ({
  onNavigate,
  isComposingPlainNote: propIsComposing,
  onToggleComposePlainNote,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allNotes, setAllNotes] = useState<CommentaryNote[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [userProfile, setUserProfile] = useState<string>('');

  // Advanced Filtering and Sorting State
  const [filters, setFilters] = useState<NotesFilterState>({
    sortField: 'date',
    sortDirection: 'desc',
    selectedBookIds: [],
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    noteType: 'all',
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.selectedBookIds.length > 0 ||
      filters.datePreset !== 'all' ||
      filters.customStartDate !== '' ||
      filters.customEndDate !== '' ||
      filters.noteType !== 'all' ||
      filters.sortField !== 'date' ||
      filters.sortDirection !== 'desc'
    );
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.selectedBookIds.length > 0) count++;
    if (filters.datePreset !== 'all' || filters.customStartDate || filters.customEndDate) count++;
    if (filters.noteType !== 'all') count++;
    if (filters.sortField !== 'date' || filters.sortDirection !== 'desc') count++;
    return count;
  }, [filters]);

  const [internalComposing, setInternalComposing] = useState<boolean>(false);
  const isComposingPlainNote = propIsComposing !== undefined ? propIsComposing : internalComposing;
  const setIsComposingPlainNote = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      if (onToggleComposePlainNote) {
        onToggleComposePlainNote(val);
      } else {
        setInternalComposing(val);
      }
    },
    [onToggleComposePlainNote]
  );
  const [newPlainNoteTitle, setNewPlainNoteTitle] = useState<string>('');
  const [newPlainNoteContent, setNewPlainNoteContent] = useState<string>('');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  const isSynthesizingRef = useRef<boolean>(false);
  const diceRolledInSessionRef = useRef<boolean>(false);
  const allNotesRef = useRef<CommentaryNote[]>([]);
  const userProfileRef = useRef<string>('');

  useEffect(() => {
    allNotesRef.current = allNotes;
  }, [allNotes]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // Triple dice roll mechanism (d20, d12, d6) acting as a balanced gatekeeper
  const rollMultiDice = useCallback((hasExistingSynthesis: boolean, newNotesCount: number): MultiDiceRollResult => {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const d12Roll = Math.floor(Math.random() * 12) + 1;
    const d6Roll = Math.floor(Math.random() * 6) + 1;

    // Difficulty Classes calibrated for thoughtful, organic emergence:
    // - Initial synthesis (no synthesis yet): High pass rate (~71%) so users experience synthesis quickly
    // - Substantial reflection (3+ new notes): High pass rate (~71%) matching accumulated insight
    // - Moderate reflection (2 new notes): Balanced pass rate (~50%)
    // - Minimal reflection (1 new note): Selective pass rate (~27%) to gatekeep unnecessary triggers
    let d20Req = 9;  // 12/20 = 60%
    let d12Req = 5;  // 8/12 = 66.7%
    let d6Req = 3;   // 4/6 = 66.7% -> combined ~26.7%

    if (!hasExistingSynthesis || newNotesCount >= 3) {
      d20Req = 4;    // 17/20 = 85%
      d12Req = 3;    // 10/12 = 83.3%
      d6Req = 1;     // 6/6 = 100% -> combined ~70.8%
    } else if (newNotesCount >= 2) {
      d20Req = 5;    // 16/20 = 80%
      d12Req = 4;    // 9/12 = 75%
      d6Req = 2;     // 5/6 = 83.3% -> combined ~50.0%
    }

    const d20Passed = d20Roll >= d20Req;
    const d12Passed = d12Roll >= d12Req;
    const d6Passed = d6Roll >= d6Req;

    return {
      die1: { name: 'd20', roll: d20Roll, required: d20Req, passed: d20Passed },
      die2: { name: 'd12', roll: d12Roll, required: d12Req, passed: d12Passed },
      die3: { name: 'd6', roll: d6Roll, required: d6Req, passed: d6Passed },
      allPassed: d20Passed && d12Passed && d6Passed,
    };
  }, []);

  // Update dynamic user living memory when a synthesis is discarded without comment.
  // The trajectory profile was already formed and preserved during synthesis generation;
  // returning currentProf directly eliminates redundant LLM calls and token waste.
  const notifyDiscardToSkillsEngine = useCallback(async (_discarded: CommentaryNote, currentProf: string) => {
    return currentProf;
  }, []);

  // Discard a synthesis directly from state and storage, notifying skills engine
  const handleDiscardSynthesis = useCallback(
    async (note: CommentaryNote) => {
      await deleteNote(note.id);
      setAllNotes((prev) => prev.filter((n) => n.id !== note.id));
      await notifyDiscardToSkillsEngine(note, userProfileRef.current);
    },
    [notifyDiscardToSkillsEngine]
  );

  // Automatic and randomized synthesis execution
  const executeRandomizedSynthesis = useCallback(async (currentNotes: CommentaryNote[], currentProfile: string) => {
    if (isSynthesizingRef.current) return;

    // Both verse commentary notes and plain notes are valid candidates
    const candidates = currentNotes.filter((n) => !n.isSynthesis && n.content.trim().length > 0);
    if (candidates.length < 2) return;

    const userApiKey = await getGeminiApiKey();
    const isDev = checkIsDevMode();

    // In production mode (dev mode toggled off), the AI synthesis feature does not work at all without a Gemini API key
    if (!isDev && (!userApiKey || userApiKey.trim().length === 0)) {
      console.log('[ScripturePage] Production mode active: AI synthesis skipped because no Gemini API key is configured in Settings.');
      return;
    }

    isSynthesizingRef.current = true;
    setIsSynthesizing(true);

    try {
      const minSamples = 2;
      const maxSamples = Math.min(candidates.length, 5);
      const randomCount = Math.floor(Math.random() * (maxSamples - minSamples + 1)) + minSamples;

      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, randomCount);

      const payloadNotes = sampled.map((n) => {
        let ref = '';
        if (n.isPlainNote || n.bookId === 0) {
          ref = n.title?.trim() || 'Reflection Note';
        } else {
          const book = getBookById(n.bookId);
          ref = `${book?.name || 'Scripture'} ${n.chapter}:${n.startVerse}`;
        }
        return {
          id: n.id,
          reference: ref,
          content: n.content,
          isSynthesis: false,
          isPlainNote: Boolean(n.isPlainNote || n.bookId === 0),
          title: n.title,
          updatedAt: n.updatedAt,
        };
      });

      const engineMode = await getSynthesisEngineMode();

      const response = await fetch('/api/synthesize-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-mode': String(isDev),
          ...(userApiKey ? { 'x-gemini-api-key': userApiKey } : {}),
        },
        body: JSON.stringify({
          notes: payloadNotes,
          sampleCount: randomCount,
          mode: 'random',
          userProfile: currentProfile || undefined,
          engineMode,
          apiKey: userApiKey || undefined,
          devMode: isDev,
        }),
      });

      if (response.ok) {
        const result: SynthesisResult = await response.json();

        // If in production mode and fallback was received, do not create note
        if ((result as any).isFallback && !isDev) {
          return;
        }

        const sourceRefs = result.sampledNotes.map((s) => s.reference);
        const sourceIds = result.sampledNotes.map((s) => s.id);
        const footnotes: FootnoteReference[] = result.sampledNotes.map((s) => ({
          ref: s.reference,
          noteId: s.id,
        }));

        // Replace any previous un-retained synthesis before creating the new one
        // (silently expires or is replaced by new synthesis before 48h)
        const unRetained = allNotesRef.current.filter((n) => n.isSynthesis && !isSynthesisRetained(n));
        for (const old of unRetained) {
          await deleteNote(old.id);
        }

        const newNote = await createSynthesisNote({
          title: result.title,
          synthesisQuote: result.synthesis,
          content: '',
          sourceReferences: sourceRefs,
          sourceNoteIds: sourceIds,
          sourceFootnotes: footnotes,
          keyThemes: result.keyThemes,
          trajectorySummary: result.trajectorySummary,
          practicalApplication: result.practicalApplication,
        });

        // Retain any preserved syntheses (starred or with commentary), plus newNote at the top
        setAllNotes((prev) => [newNote, ...prev.filter((n) => !n.isSynthesis || isSynthesisRetained(n))]);

        // The user profile is updated ONLY after a successful synthesis
        if (result.updatedUserProfile && result.updatedUserProfile.trim().length > 0) {
          await saveUserProfile(result.updatedUserProfile);
          setUserProfile(result.updatedUserProfile);
        } else {
          // Fall back to rolling snapshot entry if no updatedUserProfile was returned by the AI
          const updated = await appendToSynthesisProfile({
            title: result.title,
            keyThemes: result.keyThemes,
            trajectorySummary: result.trajectorySummary,
          });
          setUserProfile(updated);
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn('Synthesis request failed:', errData?.error || response.statusText);
      }
    } catch (err) {
      console.warn('Silent automatic synthesis encountered an error:', err);
    } finally {
      isSynthesizingRef.current = false;
      setIsSynthesizing(false);
    }
  }, []);

  // Multi-dice evaluation gatekeeper (runs silently in background)
  // Strictly checks that a new note was made before attempting a roll
  const evaluateDiceForSynthesis = useCallback(
    async (notesList: CommentaryNote[], profile: string) => {
      // 1. We ONLY ever consider synthesizing if there is a new note!
      const wasNewNoteMade = await hasNewNoteBeenMadeForSynthesis();
      if (!wasNewNoteMade) {
        return;
      }

      // Clear the flag immediately so subsequent view renders or tab navigations do not re-trigger
      await clearNewNoteMadeForSynthesis();

      const candidates = notesList.filter((n) => !n.isSynthesis && n.content.trim().length > 0);
      if (candidates.length < 2) return;

      const syntheses = notesList
        .filter((n) => n.isSynthesis)
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      const latestSynthesis = syntheses[0];

      if (latestSynthesis) {
        const timeSinceLast = Date.now() - (latestSynthesis.updatedAt || latestSynthesis.createdAt);
        if (timeSinceLast < MIN_SYNTHESIS_COOLDOWN_MS) {
          return;
        }

        // Check if ANY candidate note was created/updated after the latest synthesis
        const newNotesSinceSynthesis = candidates.filter(
          (n) => (n.createdAt || n.updatedAt) > latestSynthesis.createdAt
        );

        if (newNotesSinceSynthesis.length === 0) {
          return;
        }
      }

      const hasExistingSynthesis = Boolean(latestSynthesis);
      const newNotesCount = latestSynthesis
        ? candidates.filter((n) => (n.createdAt || n.updatedAt) > latestSynthesis.createdAt).length
        : candidates.length;

      // 2. Even when a new note exists, our dice mechanism runs first to decide if synthesis will even initialize!
      const roll = rollMultiDice(hasExistingSynthesis, newNotesCount);

      if (roll.allPassed) {
        const delayMs = Math.floor(Math.random() * 1500) + 500;
        setTimeout(() => {
          void executeRandomizedSynthesis(notesList, profile);
        }, delayMs);
      } else {
        // Multi-dice check did not pass: synthesis does NOT initialize. AI is not called.
        console.log('[ScripturePage] Multi-dice check rolled: DC threshold not met. AI synthesis not initialized.');
      }
    },
    [rollMultiDice, executeRandomizedSynthesis]
  );

  // Save a new plain note without references (added through notes view only)
  const handleSavePlainNote = useCallback(async () => {
    if (!newPlainNoteContent.trim()) return;

    const note = await createPlainNote({
      title: newPlainNoteTitle.trim() || undefined,
      content: newPlainNoteContent.trim(),
    });

    const updated = [note, ...allNotesRef.current];
    setAllNotes(updated);
    setIsComposingPlainNote(false);
    setNewPlainNoteTitle('');
    setNewPlainNoteContent('');

    // A new note was made! Immediately evaluate dice for synthesis
    void evaluateDiceForSynthesis(updated, userProfileRef.current);
  }, [newPlainNoteTitle, newPlainNoteContent, evaluateDiceForSynthesis]);

  // Fetch initial notes and roll synthesis check on load
  useEffect(() => {
    let mounted = true;

    // Silently prune expired un-retained syntheses (>48h) on load
    pruneExpiredSyntheses().catch(() => {});

    getAllNotes().then(async (notes) => {
      if (!mounted) return;

      // Filter out any expired syntheses
      const unexpiredNotes = notes.filter((n) => !isSynthesisExpired(n));

      let availableNotes = unexpiredNotes;
      if (unexpiredNotes.length === 0) {
        const seeded = await seedSampleCommentaries();
        if (mounted) {
          availableNotes = seeded;
        }
      }

      if (mounted) {
        setAllNotes(availableNotes);
      }

      const initialProfile = await getUserProfile();
      let activeProfile = initialProfile || '';
      if (mounted && activeProfile) {
        setUserProfile(activeProfile);
      }

      // We only ever consider synthesizing if a new note was made (e.g. from Reader view)
      const wasNewNoteMade = await hasNewNoteBeenMadeForSynthesis();
      if (wasNewNoteMade && !diceRolledInSessionRef.current) {
        diceRolledInSessionRef.current = true;
        void evaluateDiceForSynthesis(availableNotes, activeProfile);
      }
    })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    let prevW = typeof window !== 'undefined' ? window.innerWidth : 0;
    const handleResize = () => {
      const w = window.innerWidth;
      if (Math.abs(w - prevW) >= 16) {
        prevW = w;
        setIsMobile(w < 768);
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [evaluateDiceForSynthesis, notifyDiscardToSkillsEngine]);

  // Active synthesis: the latest valid, unexpired synthesis
  // Keeps visible permanently if starred or commented; otherwise expires after 48h or is replaced by new synthesis
  const activeSynthesis = useMemo(() => {
    const validSyntheses = allNotes
      .filter((n) => n.isSynthesis && !isSynthesisExpired(n))
      .sort((a, b) => (b.createdAt || b.updatedAt) - (a.createdAt || a.updatedAt));
    return validSyntheses[0] || null;
  }, [allNotes]);

  // Notes stream: includes all standard notes PLUS any retained syntheses (excluding the currently active hero synthesis)
  const streamNotes = useMemo(() => {
    return allNotes.filter((n) => {
      if (!n.isSynthesis) return true;
      // Retained syntheses only (bookmarked or commented)
      if (!isSynthesisRetained(n)) return false;
      // Do not duplicate the currently active hero synthesis in the stream immediately below
      if (activeSynthesis && n.id === activeSynthesis.id) return false;
      return true;
    });
  }, [allNotes, activeSynthesis]);

  // Active synthesis search match (Fuzzy, typo-tolerant, non-blocking)
  const activeSynthesisMatchesSearch = useMemo(() => {
    if (!activeSynthesis) return false;
    const query = deferredSearchQuery.trim();
    if (!query) return true;
    return fuzzyMatchNote(query, activeSynthesis);
  }, [activeSynthesis, deferredSearchQuery]);

  // Compile available books that currently have notes in the user's stream collection
  const availableBooks = useMemo<AvailableBookInfo[]>(() => {
    const bookCounts: Record<number, number> = {};

    for (const note of streamNotes) {
      if (!note.isSynthesis && note.bookId > 0) {
        bookCounts[note.bookId] = (bookCounts[note.bookId] || 0) + 1;
      } else if (note.isSynthesis) {
        const citedIds = getSynthesisReferencedBookIds(note);
        for (const cid of citedIds) {
          bookCounts[cid] = (bookCounts[cid] || 0) + 1;
        }
      }
    }

    return Object.entries(bookCounts)
      .map(([idStr, count]) => {
        const bookId = Number(idStr);
        const book = getBookById(bookId);
        return {
          bookId,
          name: book ? book.name : `Book ${bookId}`,
          count,
          canonicalOrder: book ? book.canonicalOrder : bookId,
        };
      })
      .sort((a, b) => a.canonicalOrder - b.canonicalOrder);
  }, [streamNotes]);

  // Scoped and filtered notes from streamNotes (using deferredSearchQuery for 120fps typing)
  const filteredAndSortedNotes = useMemo(() => {
    const query = deferredSearchQuery.trim();

    // 1. Filter
    const filtered = streamNotes.filter((note) => {
      // Type Filter
      if (filters.noteType === 'scripture' && (note.isSynthesis || note.isPlainNote || note.bookId === 0)) return false;
      if (filters.noteType === 'synthesis' && !note.isSynthesis) return false;
      if (filters.noteType === 'plain' && (note.isSynthesis || (!note.isPlainNote && note.bookId > 0))) return false;

      // Book Multi-Select Filter
      if (filters.selectedBookIds.length > 0) {
        if (note.isPlainNote || (!note.isSynthesis && note.bookId === 0)) {
          return false;
        } else if (!note.isSynthesis) {
          if (!filters.selectedBookIds.includes(note.bookId)) return false;
        } else {
          // For synthesis notes, check if it cites any of the selected books
          const citedIds = getSynthesisReferencedBookIds(note);
          const hasCitedBook = citedIds.some((id) => filters.selectedBookIds.includes(id));
          if (!hasCitedBook) return false;
        }
      }

      // Date Range Filter
      const noteTime = note.updatedAt || note.createdAt;
      const now = Date.now();

      if (filters.datePreset === '7d') {
        if (noteTime < now - 7 * 86400000) return false;
      } else if (filters.datePreset === '30d') {
        if (noteTime < now - 30 * 86400000) return false;
      } else if (filters.datePreset === 'custom') {
        if (filters.customStartDate) {
          const startTime = new Date(filters.customStartDate + 'T00:00:00').getTime();
          if (!isNaN(startTime) && noteTime < startTime) return false;
        }
        if (filters.customEndDate) {
          const endTime = new Date(filters.customEndDate + 'T23:59:59').getTime();
          if (!isNaN(endTime) && noteTime > endTime) return false;
        }
      }

      // Search Query Scope (Fuzzy + Typo-tolerant + Multi-token without showing in UI)
      if (query) {
        const book = (!note.isSynthesis && note.bookId > 0) ? getBookById(note.bookId) : undefined;
        if (!fuzzyMatchNote(query, note, book?.name)) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort (Flippable)
    return filtered.sort((a, b) => {
      const isAsc = filters.sortDirection === 'asc';

      if (filters.sortField === 'date') {
        const timeA = a.updatedAt || a.createdAt;
        const timeB = b.updatedAt || b.createdAt;
        return isAsc ? timeA - timeB : timeB - timeA;
      }

      if (filters.sortField === 'book') {
        // Compute canonical sort key
        let weightA: number;
        if (a.isPlainNote || (!a.isSynthesis && a.bookId === 0)) {
          weightA = 999999999;
        } else if (!a.isSynthesis) {
          const bookA = getBookById(a.bookId);
          weightA = (bookA ? bookA.canonicalOrder : a.bookId) * 1000000 + a.chapter * 1000 + a.startVerse;
        } else {
          const citedA = getSynthesisReferencedBookIds(a);
          const firstBook = citedA.length > 0 ? getBookById(citedA[0]) : null;
          weightA = firstBook ? firstBook.canonicalOrder * 1000000 : 0;
        }

        let weightB: number;
        if (b.isPlainNote || (!b.isSynthesis && b.bookId === 0)) {
          weightB = 999999999;
        } else if (!b.isSynthesis) {
          const bookB = getBookById(b.bookId);
          weightB = (bookB ? bookB.canonicalOrder : b.bookId) * 1000000 + b.chapter * 1000 + b.startVerse;
        } else {
          const citedB = getSynthesisReferencedBookIds(b);
          const firstBook = citedB.length > 0 ? getBookById(citedB[0]) : null;
          weightB = firstBook ? firstBook.canonicalOrder * 1000000 : 0;
        }

        return isAsc ? weightA - weightB : weightB - weightA;
      }

      if (filters.sortField === 'length') {
        const lenA = a.content.length + (a.synthesisQuote?.length || 0);
        const lenB = b.content.length + (b.synthesisQuote?.length || 0);
        return isAsc ? lenA - lenB : lenB - lenA;
      }

      return 0;
    });
  }, [streamNotes, deferredSearchQuery, filters]);

  // Progressive rendering window to optimize DOM size, memory, and scrolling performance
  const INITIAL_NOTES_PAGE_SIZE = 40;
  const [displayLimit, setDisplayLimit] = useState<number>(INITIAL_NOTES_PAGE_SIZE);

  // Reset display window whenever filter or search query changes
  useEffect(() => {
    setDisplayLimit(INITIAL_NOTES_PAGE_SIZE);
  }, [deferredSearchQuery, filters]);

  const visibleNotes = useMemo(() => {
    return filteredAndSortedNotes.slice(0, displayLimit);
  }, [filteredAndSortedNotes, displayLimit]);

  const handleToggleStarSynthesis = useCallback(async (note: CommentaryNote) => {
    const newStarred = !note.isStarred;
    const updated: CommentaryNote = {
      ...note,
      isStarred: newStarred,
      updatedAt: Date.now(),
    };
    await addOrUpdateNote(updated);
    setAllNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));

    if (newStarred) {
      void appendToSynthesisProfile({
        title: note.title || 'Synthesis Reflection',
        keyThemes: note.keyThemes,
        trajectorySummary: note.trajectorySummary,
        userCommentary: note.content || '[Bookmarked by user]',
      });
    }
  }, []);

  const handleUpdateNote = useCallback(
    async (note: CommentaryNote, newContent: string) => {
      if (note.isSynthesis) {
        const updated: CommentaryNote = {
          ...note,
          content: newContent,
          updatedAt: Date.now(),
        };
        await addOrUpdateNote(updated);
        setAllNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));

        // Keep rolling summary record of what was synthesized and user commentary for future AI background reference
        if (newContent.trim().length > 0) {
          void appendToSynthesisProfile({
            title: note.title || 'Synthesis Reflection',
            keyThemes: note.keyThemes,
            trajectorySummary: note.trajectorySummary,
            userCommentary: newContent,
          });
        }
        return;
      }

      if (newContent.trim() === '') {
        await deleteNote(note.id);
        setAllNotes((prev) => prev.filter((n) => n.id !== note.id));
        return;
      }

      const updated: CommentaryNote = {
        ...note,
        content: newContent,
        updatedAt: Date.now(),
      };
      await addOrUpdateNote(updated);
      setAllNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    },
    []
  );

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId);
    setAllNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const handleUpdatePlainNoteTitle = useCallback(
    async (note: CommentaryNote, newTitle: string) => {
      const trimmed = newTitle.trim();
      const nextTitle = trimmed.length > 0 ? trimmed : undefined;
      if ((note.title || undefined) === nextTitle) return;

      const updated: CommentaryNote = {
        ...note,
        isPlainNote: true,
        title: nextTitle,
        updatedAt: Date.now(),
      };
      await addOrUpdateNote(updated);
      setAllNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    },
    []
  );

  const handleTokenClick = (token: string, _sourceVerse: number, note: CommentaryNote, label?: string) => {
    const refString = label || token;
    const parsed = parseScriptureReference(refString);
    if (parsed) {
      onNavigate(parsed.bookId, parsed.chapter, parsed.verse || 1);
      return;
    }
    if (token.startsWith('@v:')) {
      const target = token.slice(3);
      if (target.includes(':') || target.includes('.')) {
        const parts = target.split(/[:.]/);
        if (parts.length === 3) {
          const bId = parseInt(parts[0], 10);
          const ch = parseInt(parts[1], 10);
          const vs = parseInt(parts[2], 10);
          if (!isNaN(bId) && !isNaN(ch) && !isNaN(vs)) {
            onNavigate(bId, ch, vs);
            return;
          }
        }
      }
      const targetVerse = parseInt(target, 10);
      if (!isNaN(targetVerse)) {
        onNavigate(note.bookId, note.chapter, targetVerse);
      }
    }
  };

  const handleReferenceNavigate = useCallback(
    (refText: string) => {
      const parsed = parseScriptureReference(refText);
      if (parsed) {
        onNavigate(parsed.bookId, parsed.chapter, parsed.verse);
        return;
      }
      // If it's a plain note or non-scripture reference, scroll to the note card if present
      const matchedNote = allNotesRef.current.find(
        (n) =>
          n.id === refText ||
          (n.title && n.title.toLowerCase() === refText.toLowerCase()) ||
          refText.toLowerCase().includes((n.title || '').toLowerCase())
      );
      if (matchedNote) {
        const el = document.getElementById(`note-card-${matchedNote.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [onNavigate]
  );

  if (isLoading) {
    return <NotesViewSkeleton />;
  }

  return (
    <div className="w-full min-h-screen selection:bg-[var(--text-selection)] animate-fade-in pb-32">
      {/* Dynamic Main Top Sticky Header: Notes Search Bar & Toolbar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col">
          {/* Search Row */}
          <div className="flex items-center gap-3 text-[var(--text-subtle)] focus-within:text-[var(--text-primary)] transition-colors py-1">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-60 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-transparent border-none outline-none font-sans text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] placeholder-[var(--input-placeholder)] py-1 leading-normal"
              autoComplete="off"
              spellCheck="false"
              aria-label="Search notes"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center p-2 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-md shrink-0"
                title="Clear search"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Progressive Disclosure Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className={`relative flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full border text-xs sm:text-sm font-sans font-medium cursor-pointer shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95 select-none ${
                isFiltersOpen
                  ? 'bg-[var(--text-primary)] text-[var(--bg-app)] border-[var(--text-primary)] shadow-sm'
                  : hasActiveFilters
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10'
                  : 'border-[var(--line-subtle)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--line-subtle)] hover:bg-[var(--text-primary)]/5'
              }`}
              title={isFiltersOpen ? 'Hide filters' : 'Show filters'}
              aria-expanded={isFiltersOpen}
              aria-label={isFiltersOpen ? 'Hide filters' : 'Show filters'}
            >
              <svg
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isFiltersOpen ? 'rotate-90' : 'rotate-0'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span className="hidden sm:inline font-sans text-xs font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  className={`min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    isFiltersOpen
                      ? 'bg-[var(--bg-app)] text-[var(--text-primary)]'
                      : 'bg-[var(--text-primary)] text-[var(--bg-app)]'
                  }`}
                >
                  {activeFiltersCount}
                </span>
              )}
              {/* Subtle chevron indicator smoothly rotating between collapsed and expanded states */}
              <svg
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isFiltersOpen ? 'rotate-180 opacity-90' : 'rotate-0 opacity-60'
                }`}
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

          {/* Progressively Disclosed Advanced Filter & Sort Toolbar */}
          <div
            className={`accordion-grid ${
              isFiltersOpen
                ? 'is-open pointer-events-auto mt-2.5'
                : 'is-collapsed pointer-events-none mt-0'
            }`}
            aria-hidden={!isFiltersOpen}
          >
            <div className="accordion-grid-content">
              <div
                className={`pt-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isFiltersOpen
                    ? 'transform translate-y-0 opacity-100'
                    : 'transform -translate-y-2 opacity-0'
                }`}
              >
                <NotesFilterToolbar
                  filters={filters}
                  onUpdateFilters={setFilters}
                  availableBooks={availableBooks}
                  totalNotesCount={streamNotes.length}
                  filteredCount={filteredAndSortedNotes.length}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-2xl mx-auto px-6 sm:px-8 py-8 md:py-12 font-sans">

      {/* Active Synthesis or Loading State */}
      {isSynthesizing && (
        <section className="mb-14 pt-2 border-b border-[var(--line-subtle)] pb-10 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              Synthesis
            </span>
            <span className="text-xs font-mono text-[var(--text-subtle)] opacity-70">
              Discerning biblical trajectory...
            </span>
          </div>
          <div className="py-6 px-5 rounded-lg bg-[var(--text-primary)]/5 border border-[var(--line-subtle)]/40 flex items-center justify-center">
            <span className="text-sm font-serif italic text-[var(--text-subtle)]">
              Connecting theological threads across your reflections...
            </span>
          </div>
        </section>
      )}

      {!isSynthesizing && activeSynthesis && filters.noteType !== 'scripture' && activeSynthesisMatchesSearch && (
        <section className="mb-14 pt-2 group relative border-b border-[var(--line-subtle)] pb-12 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Synthesis
              </span>
              {activeSynthesis.isStarred && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Bookmarked
                </span>
              )}
              {!isSynthesisRetained(activeSynthesis) && (
                <span className="text-[10px] font-mono text-[var(--text-subtle)] opacity-60">
                  · Provisional
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-70 sm:hover:!opacity-100 transition-opacity">
              <StarIconButton
                isStarred={Boolean(activeSynthesis.isStarred)}
                onClick={() => void handleToggleStarSynthesis(activeSynthesis)}
                title={activeSynthesis.isStarred ? 'Saved to collection (Starred)' : 'Bookmark Intelligent Summary to keep permanently'}
                ariaLabel={activeSynthesis.isStarred ? 'Remove bookmark from Intelligent Summary' : 'Bookmark Intelligent Summary'}
              />
              <DeleteIconButton
                onClick={() => void handleDiscardSynthesis(activeSynthesis)}
                title="Discard Intelligent Summary"
                ariaLabel="Discard Intelligent Summary"
              />
            </div>
          </div>

          <SynthesisHeroBlockquote
            quoteText={activeSynthesis.synthesisQuote || activeSynthesis.content}
            footnotes={
              activeSynthesis.sourceFootnotes && activeSynthesis.sourceFootnotes.length > 0
                ? activeSynthesis.sourceFootnotes
                : (activeSynthesis.sourceReferences || []).map((r) => ({ ref: r }))
            }
            userCommentary={activeSynthesis.content}
            onUpdateCommentary={(newVal) => void handleUpdateNote(activeSynthesis, newVal)}
            onNavigateReference={handleReferenceNavigate}
            isMobile={isMobile}
            searchQuery={deferredSearchQuery}
          />
        </section>
      )}

      {/* Main Notes Stream */}
      <div className="flex flex-col gap-14">
        {/* Compose Plain Note Form (Exact same format as normal verse note: zero background, zero borders) */}
        {isComposingPlainNote && (
          <div className="flex flex-col gap-3 group animate-fade-in">
            {/* Header row matching normal verse / plain note */}
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={newPlainNoteTitle}
                  onChange={(e) => setNewPlainNoteTitle(e.target.value)}
                  placeholder="Note title (optional)..."
                  className="w-full max-w-sm bg-transparent text-base font-sans font-semibold text-[var(--text-primary)] outline-none border-none placeholder-[var(--input-placeholder)] p-0 focus:outline-none"
                  autoFocus={false}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsComposingPlainNote(false);
                    setNewPlainNoteTitle('');
                    setNewPlainNoteContent('');
                  }}
                  className="text-[var(--text-subtle)] opacity-70 hover:opacity-100 hover:text-rose-500 transition-opacity w-9 h-9 sm:w-8 sm:h-8 p-2 sm:p-1.5 -m-1 cursor-pointer select-none rounded flex items-center justify-center"
                  title="Cancel new note"
                  aria-label="Cancel new note"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Note Content Editor matching NoteField format */}
            <div className="relative flex items-start justify-between gap-2 w-full">
              <textarea
                value={newPlainNoteContent}
                onChange={(e) => setNewPlainNoteContent(e.target.value)}
                placeholder="Capture insight or reflection..."
                autoFocus
                rows={3}
                aria-label="New plain note content"
                className="w-full bg-transparent text-[var(--text-primary)] font-sans text-base resize-none outline-none border-none placeholder-[var(--input-placeholder)] focus-visible:outline-none leading-relaxed py-1 min-h-16"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && newPlainNoteContent.trim()) {
                    e.preventDefault();
                    void handleSavePlainNote();
                  }
                }}
              />
              <div className="flex items-center gap-1 shrink-0 pt-0.5 text-[var(--text-subtle)]">
                {newPlainNoteContent.trim() && (
                  <button
                    type="button"
                    onClick={() => void handleSavePlainNote()}
                    className="h-10 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer rounded flex items-center justify-center font-sans text-xs font-medium gap-1.5"
                    title="Save note (⌘+Enter)"
                    aria-label="Save note"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Save</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {filteredAndSortedNotes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center py-16 text-[var(--text-subtle)] font-sans">
            <p className="text-base sm:text-lg italic">
              {searchQuery ||
              filters.selectedBookIds.length > 0 ||
              filters.datePreset !== 'all' ||
              filters.noteType !== 'all'
                ? 'No notes match your filters or search.'
                : 'No notes in stream yet. Add commentary to Scripture or syntheses to build your study collection.'}
            </p>

            {(searchQuery ||
              filters.selectedBookIds.length > 0 ||
              filters.datePreset !== 'all' ||
              filters.noteType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    sortField: 'date',
                    sortDirection: 'desc',
                    selectedBookIds: [],
                    datePreset: 'all',
                    customStartDate: '',
                    customEndDate: '',
                    noteType: 'all',
                  });
                }}
                className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer"
              >
                Reset filters & search
              </button>
            )}
          </div>
        ) : (
          <>
            {visibleNotes.map((note) => {
              // Render Synthesis Note with Commentary in stream
            if (note.isSynthesis) {
              const quote = note.synthesisQuote || note.content;
              const commentary = note.synthesisQuote ? note.content : '';
              const footnotes: FootnoteReference[] =
                note.sourceFootnotes && note.sourceFootnotes.length > 0
                  ? note.sourceFootnotes
                  : (note.sourceReferences || []).map((r) => ({ ref: r }));

              return (
                <div key={note.id} className="note-stream-card pt-2 group relative">
                  <div className="flex items-center justify-between mb-3 text-xs font-mono text-[var(--text-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className="opacity-60">Synthesis · {formatNoteDate(note.updatedAt || note.createdAt)}</span>
                      {note.isStarred && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Bookmarked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-70 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-70 sm:hover:!opacity-100 transition-opacity">
                      <StarIconButton
                        isStarred={Boolean(note.isStarred)}
                        onClick={() => void handleToggleStarSynthesis(note)}
                        title={note.isStarred ? 'Saved to collection (Starred)' : 'Bookmark Intelligent Summary to keep permanently'}
                        ariaLabel={note.isStarred ? 'Remove bookmark from Intelligent Summary' : 'Bookmark Intelligent Summary'}
                      />
                      <DeleteIconButton
                        onClick={() => void handleDiscardSynthesis(note)}
                        title="Discard Intelligent Summary"
                        ariaLabel="Discard Intelligent Summary"
                      />
                    </div>
                  </div>

                  <SynthesisHeroBlockquote
                    quoteText={quote}
                    footnotes={footnotes}
                    userCommentary={commentary}
                    onUpdateCommentary={(newVal) => void handleUpdateNote(note, newVal)}
                    onNavigateReference={handleReferenceNavigate}
                    isMobile={isMobile}
                    searchQuery={deferredSearchQuery}
                  />
                </div>
              );
            }

            // Render Plain Note (Added through notes view, without references)
            if (note.isPlainNote || (!note.isSynthesis && note.bookId === 0)) {
              return (
                <div key={note.id} id={`note-card-${note.id}`} className="note-stream-card flex flex-col gap-3 group">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2 flex-1 min-w-0">
                      <PlainNoteTitleField
                        title={note.title || ''}
                        searchQuery={deferredSearchQuery}
                        onUpdateTitle={(newTitle) => void handleUpdatePlainNoteTitle(note, newTitle)}
                      />
                      <span className="text-xs font-mono text-[var(--text-subtle)] opacity-50 uppercase select-none shrink-0">
                        Plain Note
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono tracking-wider text-[var(--text-subtle)] opacity-50 uppercase select-none">
                        {formatNoteDate(note.updatedAt || note.createdAt)}
                      </span>
                      <DeleteIconButton
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete note"
                        ariaLabel="Delete note"
                      />
                    </div>
                  </div>

                  {/* Note Content Editor */}
                  <NoteField
                    verseNum={0}
                    content={note.content}
                    isMobile={isMobile}
                    searchQuery={deferredSearchQuery}
                    onUpdateContent={(val) => {
                      void handleUpdateNote(note, val);
                    }}
                    onTokenClick={(token, sourceVerse, label) => handleTokenClick(token, sourceVerse, note, label)}
                  />
                </div>
              );
            }

            // Render Standard Verse Note
            const book = getBookById(note.bookId);
            return (
              <div key={note.id} id={`note-card-${note.id}`} className="note-stream-card flex flex-col gap-3 group">
                {/* Reference Header (Link) */}
                <div className="flex items-baseline justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate(note.bookId, note.chapter, note.startVerse)}
                    className="text-base font-sans font-semibold text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none underline-offset-4 hover:underline cursor-pointer select-none py-1.5 -my-1 inline-flex items-center"
                  >
                    {renderHighlightedText(`${book?.name} ${note.chapter}:${note.startVerse}`, deferredSearchQuery)}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono tracking-wider text-[var(--text-subtle)] opacity-50 uppercase">
                      {formatNoteDate(note.updatedAt || note.createdAt)}
                    </span>
                    <DeleteIconButton
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete note"
                      ariaLabel="Delete note"
                    />
                  </div>
                </div>

                {/* Note Content Editor */}
                <NoteField
                  verseNum={note.startVerse}
                  content={note.content}
                  isMobile={isMobile}
                  searchQuery={deferredSearchQuery}
                  onUpdateContent={(val) => {
                    void handleUpdateNote(note, val);
                  }}
                  onTokenClick={(token, sourceVerse, label) => handleTokenClick(token, sourceVerse, note, label)}
                />
              </div>
            );
          })}

          {filteredAndSortedNotes.length > displayLimit && (
            <div className="pt-8 pb-12 flex flex-col items-center gap-2 select-none">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + INITIAL_NOTES_PAGE_SIZE)}
                className="px-6 py-2.5 rounded-full border border-[var(--line-subtle)] text-xs font-mono tracking-wider uppercase text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/40 hover:bg-[var(--text-primary)]/5 transition-all cursor-pointer shadow-xs"
              >
                Load more notes ({filteredAndSortedNotes.length - displayLimit} remaining)
              </button>
              <span className="text-[11px] font-mono text-[var(--text-subtle)] opacity-50">
                Showing {displayLimit} of {filteredAndSortedNotes.length} notes
              </span>
            </div>
          )}
        </>
      )}
    </div>
      </div>
    </div>
  );
};

export default AllNotesView;
