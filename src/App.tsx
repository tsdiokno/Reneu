import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { getBookById, CANONICAL_BOOKS, getBookAbbreviation } from './data/canonicalBooks';
import { fetchChapterData } from './data/netBibleCorpus';
import {
  getReadingPosition,
  saveReadingPosition,
  getTheme,
  saveTheme,
  getAppearanceSettings,
  saveAppearanceSettings,
  DEFAULT_APPEARANCE,
  getNotesByChapter,
  addOrUpdateNote,
  deleteNote,
  recordNewNoteMadeForSynthesis,
  getInitialExposedNotesSync,
  getExposedNotes,
  saveExposedNotes,
  ensureNotesInitialized,
  type ReadingPosition,
} from './services/bibleStorage';
import type {
  CommentaryNote,
  ThemeMode,
  AppearanceSettings,
  VerseToken,
  ChapterData,
} from './types/bible';
import type {
  PlanReadingSession,
  PlanDaySchedule,
  ReadingPlan,
} from './types/readingPlan';
import { getAssignedChaptersForDay } from './services/readingPlanEngine';
import { setDayCompletionState } from './services/readingPlanStorage';
import { parseOmnibarAction, parseScriptureReference } from './utils/referenceParser';
import { VerseRow } from './components/VerseRow';
import { CopiedToast } from './components/CopiedToast';
import { checkSimulateSplash, checkSimulateLoginSplash } from './utils/devSimulation';
import { getCurrentUser, onAuthStateChange, syncAllWithCloud, type SupabaseUserProfile } from './services/bibleStorage';
import { NotesViewSkeleton } from './components/NotesViewSkeleton';
import { SettingsViewSkeleton } from './components/SettingsViewSkeleton';
import { ReaderViewSkeleton } from './components/ReaderViewSkeleton';
import { ReadingPlansViewSkeleton } from './components/ReadingPlansViewSkeleton';
import { SplashInstallBanner } from './components/SplashInstallBanner';
import { AboutModal } from './components/AboutModal';

const AllNotesView = lazy(() => import('./components/AllNotesView'));
const ReadingPlansView = lazy(() => import('./components/ReadingPlansView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const LoginSplash = lazy(() => import('./components/LoginSplash').then((m) => ({ default: m.LoginSplash })));

const ViewLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-96 select-none animate-fade-in" role="status">
    <span className="text-sm font-sans tracking-widest text-[var(--text-subtle)] uppercase">
      {label}
    </span>
  </div>
);

// Navigation History Best Practices: 50-entry max stack depth with session storage persistence
const MAX_HISTORY_LENGTH = 50;
const SESSION_HISTORY_STACK_KEY = 'reneu_nav_history_stack';
const SESSION_HISTORY_INDEX_KEY = 'reneu_nav_history_index';

export const App: React.FC = () => {
  const [position, setPosition] = useState<ReadingPosition>({ bookId: 43, chapter: 1 });

  // History Navigation Stack (preserves browsing journey across chapters)
  const [historyStack, setHistoryStack] = useState<ReadingPosition[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(SESSION_HISTORY_STACK_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [{ bookId: 43, chapter: 1 }];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(SESSION_HISTORY_INDEX_KEY);
        if (stored !== null) {
          const idx = Number(stored);
          if (!isNaN(idx) && idx >= 0) return idx;
        }
      } catch {}
    }
    return 0;
  });
  const [theme, setTheme] = useState<ThemeMode>('parchment');
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [currentView, setCurrentView] = useState<'reader' | 'notes' | 'plans' | 'settings'>('reader');
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [notes, setNotes] = useState<CommentaryNote[]>([]);
  const [command, setCommand] = useState<string>('');
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const targetScrollVerseRef = useRef<number | null>(null);
  const [exposedNotes, setExposedNotes] = useState<Set<string>>(() => getInitialExposedNotesSync());
  const [copiedToast, setCopiedToast] = useState<{ reference: string } | null>(null);
  const [isComposingPlainNote, setIsComposingPlainNote] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appInitialized, setAppInitialized] = useState<boolean>(false);
  const [planReadingSession, setPlanReadingSession] = useState<PlanReadingSession | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [currentUser, setCurrentUser] = useState<SupabaseUserProfile | null>(null);
  const [isLoginSplashOpen, setIsLoginSplashOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return checkSimulateLoginSplash();
  });
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((user) => {
      if (mounted) {
        setCurrentUser(user);
        if (!user && checkSimulateLoginSplash()) {
          setIsLoginSplashOpen(true);
        }
      }
    });

    const unsubscribe = onAuthStateChange((user) => {
      if (mounted) {
        setCurrentUser(user);
        if (user) {
          setIsLoginSplashOpen(false);
        }
      }
    });

    const handleLoginSplashEvent = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setIsLoginSplashOpen(Boolean(custom.detail));
    };

    window.addEventListener('scripturepage-sim-login-splash', handleLoginSplashEvent);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('scripturepage-sim-login-splash', handleLoginSplashEvent);
    };
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    setIsLoginSplashOpen(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('reneu_guest_mode_chosen', 'true');
      } catch {}
    }
  }, []);

  const handleAuthenticated = useCallback((user: SupabaseUserProfile) => {
    setCurrentUser(user);
    setIsLoginSplashOpen(false);
    void syncAllWithCloud().catch(() => {});
  }, []);

  useEffect(() => {
    let prevWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // Only trigger state update if the screen width crossed or changed meaningfully
      if (Math.abs(currentWidth - prevWidth) >= 16) {
        prevWidth = currentWidth;
        setIsMobile(currentWidth < 1024);
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const commandInputRef = useRef<HTMLInputElement | null>(null);

  // Sliding active background indicator for dock items
  const [dockIndicator, setDockIndicator] = useState<{ left: number; width: number }>({ left: 6, width: 58 });
  const dockNavRef = useRef<HTMLElement>(null);
  const readerBtnRef = useRef<HTMLButtonElement>(null);
  const plansBtnRef = useRef<HTMLButtonElement>(null);
  const notesBtnRef = useRef<HTMLButtonElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const activeEl =
        currentView === 'reader'
          ? readerBtnRef.current
          : currentView === 'plans'
          ? plansBtnRef.current
          : currentView === 'notes'
          ? notesBtnRef.current
          : settingsBtnRef.current;

      if (activeEl && activeEl.offsetWidth > 0) {
        setDockIndicator({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
        });
      }
    };

    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timeoutId = setTimeout(updateIndicator, 50);

    window.addEventListener('resize', updateIndicator);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && dockNavRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateIndicator();
      });
      resizeObserver.observe(dockNavRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicator);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [currentView, isLoading, Boolean(chapterData)]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    Promise.all([
      getReadingPosition(),
      getAppearanceSettings(),
      getExposedNotes(),
      ensureNotesInitialized(),
    ]).then(
      async ([savedPos, savedAppearance, savedExposed]) => {
        if (!mounted) return;
        setPosition(savedPos);
        setAppearance(savedAppearance);
        setTheme(savedAppearance.theme);
        if (savedExposed && savedExposed.length > 0) {
          setExposedNotes(new Set(savedExposed));
        }

        // Initialize history stack with saved reading position if stack only contains the initial default
        setHistoryStack((prevStack) => {
          if (
            prevStack.length === 1 &&
            prevStack[0].bookId === 43 &&
            prevStack[0].chapter === 1 &&
            (savedPos.bookId !== 43 || savedPos.chapter !== 1)
          ) {
            const newStack = [savedPos];
            try {
              sessionStorage.setItem(SESSION_HISTORY_STACK_KEY, JSON.stringify(newStack));
              sessionStorage.setItem(SESSION_HISTORY_INDEX_KEY, '0');
            } catch {}
            setHistoryIndex(0);
            return newStack;
          }
          return prevStack;
        });

        // Load initial chapter notes early so they are immediately available on first reader render
        try {
          const initialNotes = await getNotesByChapter(savedPos.bookId, savedPos.chapter);
          if (mounted) {
            setNotes(initialNotes);
          }
        } catch (err) {
          console.warn('Could not early load chapter notes:', err);
        }
        if (mounted) {
          setAppInitialized(true);
        }
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  // Sync Theme with DOM and Meta theme-color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'black') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }

    const themeColors: Record<ThemeMode, string> = {
      parchment: '#f5efeb',
      white: '#ffffff',
      black: '#111113',
    };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeColors[theme]);
    }

    const splash = document.getElementById('pwa-splash');
    if (splash) {
      splash.setAttribute('data-splash-theme', theme);
    }

    if (appInitialized) {
      void saveTheme(theme);
    }
  }, [theme, appInitialized]);

  const handleUpdateAppearance = (newSettings: AppearanceSettings) => {
    setAppearance(newSettings);
    setTheme(newSettings.theme);
    void saveAppearanceSettings(newSettings);
  };

  // Calibrated minimum artificial delay (320ms) ensures the reader skeleton placeholder
  // transitions deliberately and smoothly, eliminating high-frequency flashes or glitchy micro-stutters.
  const SKELETON_ARTIFICIAL_DELAY_MS = 320;

  // Load Chapter Data & Notes when position or initialization changes
  useEffect(() => {
    if (!appInitialized) return;
    let mounted = true;
    const startTime = Date.now();
    setIsLoading(true);

    Promise.all([
      fetchChapterData(position.bookId, position.chapter),
      getNotesByChapter(position.bookId, position.chapter),
      saveReadingPosition(position),
    ])
      .then(async ([data, chapterNotes]) => {
        if (!mounted) return;

        // Artificial delay ensures the placeholder skeleton settles gracefully
        // and doesn't flicker or flash too quickly when cached data returns in <20ms
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, SKELETON_ARTIFICIAL_DELAY_MS - elapsed);
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        if (!mounted) return;
        setChapterData(data);
        setNotes(chapterNotes);
      })
      .catch((err) => {
        console.error('Failed to load chapter data:', err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [position, appInitialized]);

  // Smooth scroll to target focused verse only when explicitly requested by external navigation (search, hash, plan)
  useEffect(() => {
    if (!isLoading && chapterData && targetScrollVerseRef.current !== null) {
      const targetVerse = targetScrollVerseRef.current;
      targetScrollVerseRef.current = null;
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${targetVerse}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isLoading, chapterData]);

  // Manage HTML PWA splash screen dismissal (honoring VITE_SIMULATE_SPLASH / ?splash=true)
  useEffect(() => {
    const splash = document.getElementById('pwa-splash');
    if (!splash) return;

    const isSimulatingSplash = checkSimulateSplash();

    const dismissSplash = () => {
      document.body.classList.remove('splash-active');
      document.documentElement.classList.remove('splash-active');
      if (!splash.classList.contains('splash-dismissed')) {
        splash.classList.add('splash-dismissed');
        const timer = setTimeout(() => {
          if (splash.parentNode) splash.remove();
        }, 400);
        return () => clearTimeout(timer);
      }
    };

    if (isSimulatingSplash) {
      document.body.classList.add('splash-active');
      document.documentElement.classList.add('splash-active');
      splash.classList.remove('splash-dismissed');
      // Developer escape hatch: click anywhere on splash or press Escape to dismiss
      const handleDismiss = () => dismissSplash();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') dismissSplash();
      };
      splash.addEventListener('click', handleDismiss);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        splash.removeEventListener('click', handleDismiss);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    // Normal launch: dismiss as soon as the app is initialized
    if (appInitialized) {
      dismissSplash();
    }
  }, [appInitialized]);

  // Refresh notes when returning to reader
  useEffect(() => {
    if (currentView === 'reader' && appInitialized) {
      getNotesByChapter(position.bookId, position.chapter).then((chNotes) => {
        setNotes(chNotes);
      });
    }
  }, [currentView, appInitialized, position]);

  // Centralized Navigation Engine with History Tracking
  const navigateToPosition = useCallback(
    (
      target: { bookId: number; chapter: number; verse?: number },
      options?: { isHistoryAction?: boolean }
    ) => {
      const isHistoryAction = options?.isHistoryAction ?? false;
      const newPos: ReadingPosition = { bookId: target.bookId, chapter: target.chapter };

      setPosition(newPos);
      setCurrentView('reader');

      if (!isHistoryAction) {
        setHistoryStack((prevStack) => {
          const currentItem = prevStack[historyIndex];
          // Avoid pushing duplicate entry if already at this position
          if (currentItem && currentItem.bookId === target.bookId && currentItem.chapter === target.chapter) {
            return prevStack;
          }

          // Truncate any forward history beyond current history index
          const truncated = prevStack.slice(0, historyIndex + 1);
          const nextStack = [...truncated, newPos];
          // Limit stack length to MAX_HISTORY_LENGTH (50)
          const finalStack =
            nextStack.length > MAX_HISTORY_LENGTH
              ? nextStack.slice(nextStack.length - MAX_HISTORY_LENGTH)
              : nextStack;

          const nextIndex = finalStack.length - 1;
          setHistoryIndex(nextIndex);

          try {
            sessionStorage.setItem(SESSION_HISTORY_STACK_KEY, JSON.stringify(finalStack));
            sessionStorage.setItem(SESSION_HISTORY_INDEX_KEY, String(nextIndex));
          } catch {}

          return finalStack;
        });
      }

      if (target.verse) {
        setFocusedVerse(target.verse);
        const verseKey = `${target.bookId}:${target.chapter}:${target.verse}`;
        setExposedNotes((prev) => {
          if (prev.has(verseKey)) return prev;
          const next = new Set(prev);
          next.add(verseKey);
          void saveExposedNotes(Array.from(next));
          return next;
        });
        setTimeout(() => {
          const el = document.getElementById(`verse-${target.verse}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        setFocusedVerse(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [historyIndex]
  );

  // History Navigation Helpers
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const prevHistoryItem = canGoBack ? historyStack[historyIndex - 1] : null;
  const nextHistoryItem = canGoForward ? historyStack[historyIndex + 1] : null;

  const prevHistoryLabel = useMemo(() => {
    if (!prevHistoryItem) return null;
    const b = getBookById(prevHistoryItem.bookId);
    return `${b?.name || ''} ${prevHistoryItem.chapter}`;
  }, [prevHistoryItem]);

  const nextHistoryLabel = useMemo(() => {
    if (!nextHistoryItem) return null;
    const b = getBookById(nextHistoryItem.bookId);
    return `${b?.name || ''} ${nextHistoryItem.chapter}`;
  }, [nextHistoryItem]);

  const handleHistoryBack = useCallback(() => {
    if (!canGoBack || !prevHistoryItem) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    try {
      sessionStorage.setItem(SESSION_HISTORY_INDEX_KEY, String(newIndex));
    } catch {}
    navigateToPosition(prevHistoryItem, { isHistoryAction: true });
  }, [canGoBack, prevHistoryItem, historyIndex, navigateToPosition]);

  const handleHistoryForward = useCallback(() => {
    if (!canGoForward || !nextHistoryItem) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    try {
      sessionStorage.setItem(SESSION_HISTORY_INDEX_KEY, String(newIndex));
    } catch {}
    navigateToPosition(nextHistoryItem, { isHistoryAction: true });
  }, [canGoForward, nextHistoryItem, historyIndex, navigateToPosition]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lowerCmd = command.trim().toLowerCase();
    if (lowerCmd === '/plans' || lowerCmd === '/plan' || lowerCmd === 'plans' || lowerCmd === 'plan') {
      setCurrentView('plans');
      setCommand('');
      commandInputRef.current?.blur();
      return;
    }
    if (lowerCmd === '/notes' || lowerCmd === '/note' || lowerCmd === 'notes') {
      setCurrentView('notes');
      setCommand('');
      commandInputRef.current?.blur();
      return;
    }
    if (lowerCmd === '/settings' || lowerCmd === 'settings') {
      setCurrentView('settings');
      setCommand('');
      commandInputRef.current?.blur();
      return;
    }
    const action = parseOmnibarAction(command, position.bookId, position.chapter);
    if (action) {
      if (action.type === 'theme') {
        setTheme(action.theme);
        setAppearance((prev) => ({ ...prev, theme: action.theme }));
        setCommand('');
        commandInputRef.current?.blur();
        return;
      }
      const target = action.target;
      navigateToPosition(target);
      setCommand('');
      commandInputRef.current?.blur();
      return;
    }
    setCommand('');
  };

  const handleNoteChange = useCallback(
    async (verseNum: number, text: string) => {
      const existing = notes.find((n) => n.startVerse === verseNum);
      let updatedNotes: CommentaryNote[];

      if (existing) {
        if (text.trim() === '') {
          await deleteNote(existing.id);
          updatedNotes = notes.filter((n) => n.id !== existing.id);
        } else {
          const isContentChanged = existing.content.trim() !== text.trim();
          const updated: CommentaryNote = {
            ...existing,
            content: text,
            updatedAt: Date.now(),
          };
          await addOrUpdateNote(updated);
          if (isContentChanged && text.trim() !== '') {
            await recordNewNoteMadeForSynthesis();
          }
          updatedNotes = notes.map((n) => (n.id === existing.id ? updated : n));
        }
      } else if (text.trim() !== '') {
        const newNote: CommentaryNote = {
          id: crypto.randomUUID(),
          bookId: position.bookId,
          bookName: chapterData?.bookName || '',
          chapter: position.chapter,
          startVerse: verseNum,
          endVerse: verseNum,
          content: text,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await addOrUpdateNote(newNote);
        await recordNewNoteMadeForSynthesis();
        updatedNotes = [...notes, newNote];
      } else {
        return;
      }
      setNotes(updatedNotes);
    },
    [notes, position, chapterData]
  );

  const copyVerseReference = async (reference: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = reference;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = reference;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleDismissToast = useCallback(() => {
    setCopiedToast(null);
  }, []);

  const handleVerseNumberClick = (v: VerseToken, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chapterData) return;
    const bookAbbr = getBookAbbreviation(position.bookId);
    const reference = `${bookAbbr} ${chapterData.chapter}:${v.verse}`;
    void copyVerseReference(reference);
    setCopiedToast({ reference });
  };

  const handleNavigateFromNotes = (bookId: number, chapter: number, verse: number) => {
    navigateToPosition({ bookId, chapter, verse });
  };

  const handleNoteTokenClick = (tokenTarget: string, _sourceVerse?: number, label?: string) => {
    const refString = label || tokenTarget;
    const parsed = parseScriptureReference(refString);
    if (parsed) {
      if (parsed.bookId === position.bookId && parsed.chapter === position.chapter) {
        if (parsed.verse) {
          const verseKey = `${position.bookId}:${position.chapter}:${parsed.verse}`;
          setExposedNotes((prev) => {
            if (prev.has(verseKey)) return prev;
            const next = new Set(prev);
            next.add(verseKey);
            void saveExposedNotes(Array.from(next));
            return next;
          });
          document.getElementById(`verse-${parsed.verse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setFocusedVerse(parsed.verse);
        }
      } else {
        handleNavigateFromNotes(parsed.bookId, parsed.chapter, parsed.verse || 1);
      }
      return;
    }

    if (tokenTarget.startsWith('@v:')) {
      const target = tokenTarget.slice(3);
      if (target.includes(':') || target.includes('.')) {
        const parts = target.split(/[:.]/);
        if (parts.length === 3) {
          const bId = parseInt(parts[0], 10);
          const ch = parseInt(parts[1], 10);
          const vs = parseInt(parts[2], 10);
          if (!isNaN(bId) && !isNaN(ch) && !isNaN(vs)) {
            handleNavigateFromNotes(bId, ch, vs);
            return;
          }
        }
      }
      const targetVerseNum = parseInt(target, 10);
      if (!isNaN(targetVerseNum) && chapterData) {
        const verseObj = chapterData.verses.find((v) => v.verse === targetVerseNum);
        if (verseObj) {
          document.getElementById(`verse-${verseObj.verse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setFocusedVerse(verseObj.verse);
        }
      }
    }
  };

  const handleScrollToVerse = (verseNum: number) => {
    document.getElementById(`verse-${verseNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedVerse(verseNum);
  };

  // Performance: Constant-time O(1) map of commentary notes by verse
  const notesByVerse = useMemo(() => {
    const map = new Map<number, CommentaryNote>();
    for (const n of notes) {
      map.set(n.startVerse, n);
    }
    return map;
  }, [notes]);

  const handleVerseRowClick = useCallback((verseNum: number) => {
    const verseKey = `${position.bookId}:${position.chapter}:${verseNum}`;
    setExposedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(verseKey)) {
        next.delete(verseKey);
        setFocusedVerse((curr) => (curr === verseNum ? null : curr));
      } else {
        next.add(verseKey);
        setFocusedVerse(verseNum);
      }
      void saveExposedNotes(Array.from(next));
      return next;
    });
  }, [position.bookId, position.chapter]);

  const handleDeleteNoteForVerse = useCallback((verseNum: number) => {
    void handleNoteChange(verseNum, '');
  }, [handleNoteChange]);

  // Performance: Prefetch adjacent chapter during browser idle time for instant chapter navigation
  useEffect(() => {
    if (!chapterData || isLoading) return;
    const currentBook = getBookById(position.bookId);
    const timer = window.setTimeout(() => {
      if (position.chapter < currentBook.chapterCount) {
        void fetchChapterData(position.bookId, position.chapter + 1);
      } else if (position.bookId < CANONICAL_BOOKS.length) {
        void fetchChapterData(position.bookId + 1, 1);
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [position.bookId, position.chapter, chapterData, isLoading]);

  // Chapter pagination calculations (Canonical sequence)
  const prevChapterTarget = useMemo(() => {
    const currentBook = getBookById(position.bookId);
    if (position.chapter > 1) {
      return {
        bookId: position.bookId,
        chapter: position.chapter - 1,
        label: `${currentBook.name} ${position.chapter - 1}`,
      };
    }
    // Transition to previous book
    if (position.bookId > 1) {
      const prevBook = getBookById(position.bookId - 1);
      return {
        bookId: prevBook.id,
        chapter: prevBook.chapterCount,
        label: `${prevBook.name} ${prevBook.chapterCount}`,
      };
    }
    return null;
  }, [position]);

  const nextChapterTarget = useMemo(() => {
    const currentBook = getBookById(position.bookId);
    if (position.chapter < currentBook.chapterCount) {
      return {
        bookId: position.bookId,
        chapter: position.chapter + 1,
        label: `${currentBook.name} ${position.chapter + 1}`,
      };
    }
    // Transition to next book
    if (position.bookId < CANONICAL_BOOKS.length) {
      const nextBook = getBookById(position.bookId + 1);
      return {
        bookId: nextBook.id,
        chapter: 1,
        label: `${nextBook.name} 1`,
      };
    }
    return null;
  }, [position]);

  const handleNavigateToChapter = (targetBookId: number, targetChapter: number) => {
    navigateToPosition({ bookId: targetBookId, chapter: targetChapter });
  };

  // Launch Reader in Plan Mode for a specific plan day
  const handleStartPlanReading = useCallback(
    (plan: ReadingPlan, daySchedule: PlanDaySchedule, targetPortionIndex: number = 0) => {
      const assigned = getAssignedChaptersForDay(daySchedule);
      if (assigned.length === 0) return;

      let initialIndex = 0;
      if (typeof targetPortionIndex === 'number' && targetPortionIndex >= 0) {
        const found = assigned.findIndex((c) => c.portionIndex === targetPortionIndex);
        if (found >= 0) initialIndex = found;
      }

      const target = assigned[initialIndex];
      const isAlreadyCompleted = Boolean(plan.completedDays?.includes(daySchedule.dayNumber));

      setPlanReadingSession({
        planId: plan.id,
        planTitle: plan.title,
        dayNumber: daySchedule.dayNumber,
        totalDays: plan.durationDays,
        assignedChapters: assigned,
        currentChapterIndex: initialIndex,
        isDayFinished: isAlreadyCompleted,
      });

      navigateToPosition({ bookId: target.bookId, chapter: target.chapter });
      setCurrentView('reader');
    },
    [navigateToPosition]
  );

  // Navigate through today's assigned chapters in Plan Mode
  const handleNavigatePlanChapter = useCallback(
    (direction: 'prev' | 'next') => {
      if (!planReadingSession) return;
      const targetIndex =
        direction === 'prev'
          ? planReadingSession.currentChapterIndex - 1
          : planReadingSession.currentChapterIndex + 1;

      if (targetIndex < 0 || targetIndex >= planReadingSession.assignedChapters.length) {
        return;
      }

      const target = planReadingSession.assignedChapters[targetIndex];
      setPlanReadingSession((prev) =>
        prev ? { ...prev, currentChapterIndex: targetIndex } : null
      );
      navigateToPosition({ bookId: target.bookId, chapter: target.chapter });
    },
    [planReadingSession, navigateToPosition]
  );

  // Mark today's assigned reading finished in Plan Mode and show the fact in the plans view
  const handleFinishPlanDay = useCallback(async () => {
    if (!planReadingSession) return;
    const allPortionKeys = planReadingSession.assignedChapters.map(
      (c) => `${planReadingSession.dayNumber}-${c.portionIndex}`
    );
    await setDayCompletionState(
      planReadingSession.planId,
      planReadingSession.dayNumber,
      true,
      allPortionKeys
    );
    setPlanReadingSession((prev) => (prev ? { ...prev, isDayFinished: true } : null));
    setCurrentView('plans');
  }, [planReadingSession]);

  // Synchronize planReadingSession if plan progress is modified in plans view
  const handlePlanProgressChange = useCallback((updatedPlan: ReadingPlan) => {
    setPlanReadingSession((prev) => {
      if (!prev || prev.planId !== updatedPlan.id) return prev;
      const isDayFinished = Boolean(updatedPlan.completedDays?.includes(prev.dayNumber));
      if (prev.isDayFinished === isDayFinished) return prev;
      return { ...prev, isDayFinished };
    });
  }, []);

  // Synchronize currentChapterIndex if position changes within active plan readings
  useEffect(() => {
    if (!planReadingSession) return;
    const matchingIdx = planReadingSession.assignedChapters.findIndex(
      (c) => c.bookId === position.bookId && c.chapter === position.chapter
    );
    if (matchingIdx >= 0 && matchingIdx !== planReadingSession.currentChapterIndex) {
      setPlanReadingSession((prev) =>
        prev ? { ...prev, currentChapterIndex: matchingIdx } : null
      );
    }
  }, [position.bookId, position.chapter, planReadingSession]);

  // Scroll progress within current active chapter for plan mode reading progress bar
  const [chapterScrollProgress, setChapterScrollProgress] = useState<number>(0);
  const readerOmnibarRef = useRef<HTMLElement>(null);
  const planBarRef = useRef<HTMLDivElement>(null);
  const [isPlanBarPinned, setIsPlanBarPinned] = useState(false);
  const [planBarHeight, setPlanBarHeight] = useState<number>(45);

  useEffect(() => {
    if (currentView !== 'reader' || !planReadingSession) {
      setIsPlanBarPinned(false);
      return;
    }

    if (planBarRef.current) {
      setPlanBarHeight(planBarRef.current.offsetHeight || 45);
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 30) {
            const raw = Math.min(1, Math.max(0, window.scrollY / maxScroll));
            // Quantize to 2 decimal places to prevent re-rendering the whole component tree on every single pixel
            const fraction = Math.round(raw * 100) / 100;
            setChapterScrollProgress((prev) => (Math.abs(prev - fraction) >= 0.01 ? fraction : prev));
          } else {
            setChapterScrollProgress(1);
          }

          const omniHeight = readerOmnibarRef.current?.offsetHeight || 66;
          const pinned = window.scrollY >= omniHeight;
          setIsPlanBarPinned((prev) => (prev !== pinned ? pinned : prev));

          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentView, planReadingSession, position.bookId, position.chapter, chapterData]);

  // Overall day reading progress percentage across assigned chapters + active scroll
  const planReadingProgressPercent = useMemo(() => {
    if (!planReadingSession) return 0;
    if (planReadingSession.isDayFinished) return 100;

    const total = planReadingSession.assignedChapters.length;
    if (total === 0) return 0;

    const currentIdx = Math.max(
      0,
      Math.min(total - 1, planReadingSession.currentChapterIndex)
    );

    const rawPercent = ((currentIdx + chapterScrollProgress) / total) * 100;
    return Math.min(100, Math.max(0, Number(rawPercent.toFixed(1))));
  }, [planReadingSession, chapterScrollProgress]);

  // Quick jump to assigned chapter via progress bar
  const handleJumpToPlanChapter = useCallback(
    (targetIndex: number) => {
      if (!planReadingSession) return;
      if (targetIndex < 0 || targetIndex >= planReadingSession.assignedChapters.length) return;
      const target = planReadingSession.assignedChapters[targetIndex];
      setPlanReadingSession((prev) =>
        prev ? { ...prev, currentChapterIndex: targetIndex } : null
      );
      navigateToPosition({ bookId: target.bookId, chapter: target.chapter });
    },
    [planReadingSession, navigateToPosition]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditing = targetTag === 'input' || targetTag === 'textarea';

      if (((e.metaKey || e.ctrlKey) && e.key === 'k') || (!isEditing && e.key === '/')) {
        e.preventDefault();
        commandInputRef.current?.focus();
        commandInputRef.current?.select();
        return;
      }

      if (e.key === 'Escape') {
        if (copiedToast) {
          setCopiedToast(null);
          return;
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setFocusedVerse(null);
        return;
      }

      if (!isEditing && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setTheme((prev) => (prev === 'parchment' ? 'white' : prev === 'white' ? 'black' : 'parchment'));
        return;
      }

      if (!isEditing && currentView === 'reader') {
        // Alt + Left / Alt + Right (or Cmd + [ / Cmd + ]) for history navigation
        if ((e.altKey && e.key === 'ArrowLeft') || ((e.metaKey || e.ctrlKey) && e.key === '[')) {
          e.preventDefault();
          handleHistoryBack();
          return;
        }
        if ((e.altKey && e.key === 'ArrowRight') || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
          e.preventDefault();
          handleHistoryForward();
          return;
        }

        if (e.key === 'ArrowRight' || e.key === 'l') {
          const currentBook = getBookById(position.bookId);
          if (position.chapter < currentBook.chapterCount) {
            handleNavigateToChapter(position.bookId, position.chapter + 1);
          } else if (position.bookId < CANONICAL_BOOKS.length) {
            handleNavigateToChapter(position.bookId + 1, 1);
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'h') {
          if (position.chapter > 1) {
            handleNavigateToChapter(position.bookId, position.chapter - 1);
          } else if (position.bookId > 1) {
            const prevBook = getBookById(position.bookId - 1);
            handleNavigateToChapter(position.bookId - 1, prevBook.chapterCount);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [copiedToast, currentView, position, handleHistoryBack, handleHistoryForward, handleNavigateToChapter]);

  const getNoteForVerse = (verse: number) => {
    return notes.find((n) => n.startVerse === verse);
  };

  const hasNoteForVerse = (verse: number) => {
    const note = getNoteForVerse(verse);
    return Boolean(note && note.content.trim().length > 0);
  };

  const readerFontFamilyClass =
    appearance.fontFamily === 'sans'
      ? 'font-sans'
      : appearance.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-serif';

  const readerFontSizeClass =
    appearance.fontSize === 'sm'
      ? 'text-base sm:text-lg'
      : appearance.fontSize === 'lg'
      ? 'text-xl sm:text-2xl'
      : appearance.fontSize === 'xl'
      ? 'text-2xl sm:text-3xl'
      : 'text-lg sm:text-xl';

  const readerLineSpacingClass =
    appearance.lineSpacing === 'normal'
      ? 'leading-normal'
      : appearance.lineSpacing === 'relaxed'
      ? 'leading-relaxed'
      : 'leading-loose md:leading-loose';

  return (
    <div className={`min-h-screen w-full max-w-full bg-[var(--bg-app)] text-[var(--text-primary)] ${currentView === 'reader' ? readerFontFamilyClass : 'font-sans'} transition-colors duration-200`}>
      {/* Dismissible Splash Install Elicitation Banner (hidden if already installed or dismissed) */}
      <SplashInstallBanner />

      {/* Omnibar Header for Reader View: scrolls away with the page content */}
      {currentView === 'reader' && (
        <header
          ref={readerOmnibarRef}
          className="relative z-20 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 transition-colors"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <form onSubmit={handleCommandSubmit} className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 py-1">
              {/* Back Button (History Navigation - Left End of Search Bar) */}
              <button
                type="button"
                onClick={handleHistoryBack}
                disabled={!canGoBack}
                className={`text-[var(--text-subtle)] transition-all p-1.5 -ml-1 rounded focus:outline-none shrink-0 ${
                  canGoBack
                    ? 'opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] cursor-pointer'
                    : 'opacity-20 cursor-not-allowed pointer-events-none'
                }`}
                title={canGoBack ? `Back to ${prevHistoryLabel}` : 'No previous history'}
                aria-label={canGoBack ? `Back to ${prevHistoryLabel}` : 'Back (no previous history)'}
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {/* Native Scripture Book & Chapter Browser Trigger */}
              <div className="relative inline-flex items-center justify-center shrink-0">
                <button
                  type="button"
                  className="text-[var(--text-subtle)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] transition-all p-1 cursor-pointer focus:outline-none"
                  title="Browse Scripture (Books & Chapters)"
                  aria-label="Browse Scripture books and chapters"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
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
                </button>
                <select
                  value={`${position.bookId}-${position.chapter}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-');
                    const bId = Number(parts[0]);
                    const ch = Number(parts[1]);
                    if (bId && ch) {
                      handleNavigateToChapter(bId, ch);
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-sans bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  aria-label="Select book and chapter"
                >
                  {(() => {
                    const currentBook = getBookById(position.bookId);
                    if (!currentBook) return null;
                    return (
                      <optgroup label={`${currentBook.name} Chapters`} className="bg-[var(--bg-surface)] text-[var(--text-subtle)] font-sans">
                        {Array.from({ length: currentBook.chapterCount }, (_, i) => i + 1).map((ch) => (
                          <option key={`curr-${ch}`} value={`${position.bookId}-${ch}`} className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
                            {currentBook.name} {ch}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                  <optgroup label="Old Testament" className="bg-[var(--bg-surface)] text-[var(--text-subtle)] font-sans">
                    {CANONICAL_BOOKS.filter((b) => b.testament === 'OT').map((b) => (
                      <option key={b.id} value={`${b.id}-1`} className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
                        {b.name} (1–{b.chapterCount})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="New Testament" className="bg-[var(--bg-surface)] text-[var(--text-subtle)] font-sans">
                    {CANONICAL_BOOKS.filter((b) => b.testament === 'NT').map((b) => (
                      <option key={b.id} value={`${b.id}-1`} className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
                        {b.name} (1–{b.chapterCount})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <input
                ref={commandInputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={
                  chapterData
                    ? `${chapterData.bookName} ${chapterData.chapter}`
                    : `${getBookById(position.bookId)?.name || 'Scripture'} ${position.chapter}`
                }
                className="w-full bg-transparent border-none outline-none font-sans text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] placeholder-[var(--input-placeholder)] py-1 leading-normal"
                autoComplete="off"
                spellCheck="false"
                aria-label="Scripture navigation and search omnibar"
              />
              {command && (
                <button
                  type="button"
                  onClick={() => setCommand('')}
                  className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-md shrink-0"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              {/* Forward Button (History Navigation - Right End of Search Bar) */}
              <button
                type="button"
                onClick={handleHistoryForward}
                disabled={!canGoForward}
                className={`text-[var(--text-subtle)] transition-all p-1.5 rounded focus:outline-none shrink-0 ${
                  canGoForward
                    ? 'opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] cursor-pointer'
                    : 'opacity-20 cursor-not-allowed pointer-events-none'
                }`}
                title={canGoForward ? `Forward to ${nextHistoryLabel}` : 'No forward history'}
                aria-label={canGoForward ? `Forward to ${nextHistoryLabel}` : 'Forward (no forward history)'}
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </form>

            <div role="group" aria-label="Navigation and view modes" className="flex items-center gap-1.5 sm:gap-2 text-xs font-sans select-none shrink-0">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('settings')}
                  className="px-2.5 py-1 rounded-full text-xs font-sans font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  title={`Signed in as ${currentUser.email || 'User'}. Click to view account in Settings.`}
                  aria-label="Account Settings"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.fullName || currentUser.email?.split('@')[0] || 'Account'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginSplashOpen(true)}
                  className="px-2.5 py-1 rounded-full text-xs font-sans font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/8 border border-[var(--line-subtle)]/70 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Sync across devices"
                  aria-label="Sync across devices"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span className="hidden sm:inline">Sync</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Plan Mode Completion Bar: under the main omnibar, fixed/pinned at top of viewport when scrolling */}
      {currentView === 'reader' && planReadingSession && (
        <>
          {isPlanBarPinned && (
            <div style={{ height: planBarHeight }} aria-hidden="true" />
          )}
          <div
            ref={planBarRef}
            className={`${
              isPlanBarPinned ? 'fixed top-0 left-0 right-0 z-40 shadow-sm' : 'relative z-30'
            } border-b border-[var(--line-subtle)] bg-[var(--bg-omnibar)] backdrop-blur-md px-4 sm:px-8 py-2 sm:py-2.5 transition-colors`}
          >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setCurrentView('plans')}
                className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                title="Return to Bible Reading Plans"
              >
                <span aria-hidden="true">←</span>
                <span>Plans</span>
              </button>

              <span aria-hidden="true" className="opacity-30">·</span>

              <span className="font-semibold text-[var(--text-primary)] truncate">
                {planReadingSession.planTitle} · Day {planReadingSession.dayNumber}
              </span>

              <span aria-hidden="true" className="opacity-30 hidden sm:inline">·</span>

              <span className="text-[var(--text-subtle)] hidden sm:inline truncate">
                Chapter {planReadingSession.currentChapterIndex + 1} of {planReadingSession.assignedChapters.length}
              </span>
            </div>

            {/* In-bar Reading Progress Bar & Interactive Chapter Scrubber */}
            <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-[200px] lg:max-w-[260px] mx-2">
              <div
                role="progressbar"
                aria-valuenow={Math.round(planReadingProgressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Daily reading plan progress"
                className="flex-1 h-1.5 rounded-full bg-[var(--text-primary)]/15 overflow-hidden flex"
              >
                {planReadingSession.assignedChapters.length > 1 ? (
                  // Multi-chapter segmented track
                  planReadingSession.assignedChapters.map((ch, idx) => {
                    const isCompleted = idx < planReadingSession.currentChapterIndex || planReadingSession.isDayFinished;
                    const isCurrent = idx === planReadingSession.currentChapterIndex && !planReadingSession.isDayFinished;
                    const segmentWidth = 100 / planReadingSession.assignedChapters.length;

                    return (
                      <div
                        key={`${ch.bookId}-${ch.chapter}-${idx}`}
                        onClick={() => handleJumpToPlanChapter(idx)}
                        className={`h-full border-r last:border-r-0 border-[var(--bg-app)] cursor-pointer transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 dark:bg-emerald-400'
                            : isCurrent
                            ? 'bg-[var(--line-subtle)] relative overflow-hidden'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${segmentWidth}%` }}
                        title={`Jump to ${ch.bookName} ${ch.chapter} (${idx + 1} of ${planReadingSession.assignedChapters.length})`}
                      >
                        {isCurrent && (
                          <div
                            className="h-full bg-[var(--text-primary)] transition-all duration-150 ease-out"
                            style={{ width: `${chapterScrollProgress * 100}%` }}
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Single chapter smooth fill
                  <div
                    className={`h-full rounded-full transition-all duration-150 ease-out ${
                      planReadingSession.isDayFinished
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-[var(--text-primary)]'
                    }`}
                    style={{ width: `${planReadingProgressPercent}%` }}
                  />
                )}
              </div>

              <span
                className={`text-[11px] font-mono tabular-nums shrink-0 ${
                  planReadingSession.isDayFinished
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-[var(--text-subtle)]'
                }`}
              >
                {Math.round(planReadingProgressPercent)}%
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Mobile reading progress percentage */}
              <span
                className={`text-[11px] font-mono tabular-nums md:hidden ${
                  planReadingSession.isDayFinished
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-[var(--text-subtle)]'
                }`}
              >
                {Math.round(planReadingProgressPercent)}%
              </span>

              {planReadingSession.isDayFinished ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span>✓ Day Finished</span>
                </span>
              ) : (
                <span className="text-[var(--text-subtle)] hidden lg:inline text-[11px] font-mono">
                  {planReadingSession.assignedChapters[planReadingSession.currentChapterIndex]?.displayRef}
                </span>
              )}

              <button
                type="button"
                onClick={() => setPlanReadingSession(null)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors underline cursor-pointer text-[11px]"
                title="Exit Plan Mode to browse freely"
              >
                Exit Plan Mode
              </button>
            </div>
          </div>

          {/* Sticky Top Reading Progress Bar Pinned Edge-to-Edge */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(planReadingProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daily reading progress bar"
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--text-primary)]/15 overflow-hidden"
          >
            <div
              className={`h-full transition-all duration-150 ease-out ${
                planReadingSession.isDayFinished
                  ? 'bg-emerald-600 dark:bg-emerald-400'
                  : 'bg-[var(--text-primary)]'
              }`}
              style={{ width: `${planReadingProgressPercent}%` }}
            />
          </div>
        </div>
      </>
    )}

      {/* Sticky Header for Settings View */}
      {currentView === 'settings' && (
        <header className="sticky top-0 z-40 bg-[var(--bg-omnibar)] backdrop-blur-md pt-4 sm:pt-5 pb-4 px-4 sm:px-8 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center py-1">
              <h1 className="w-full font-sans text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)] py-1 m-0 leading-normal select-none truncate">
                Appearance & Reading
              </h1>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      {currentView === 'reader' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 md:pt-8 pb-28 sm:pb-32">
          {isLoading || !chapterData ? (
            <ReaderViewSkeleton
              readerFontSizeClass={readerFontSizeClass}
              readerLineSpacingClass={readerLineSpacingClass}
            />
          ) : (
            <div className="flex flex-col w-full pb-32 animate-fade-in">
              {chapterData.verses.map((v) => {
                const note = notesByVerse.get(v.verse);
                const hasNote = Boolean(note && note.content && note.content.trim().length > 0);
                const verseKey = `${position.bookId}:${position.chapter}:${v.verse}`;
                const isNoteActive = exposedNotes.has(verseKey);

                return (
                  <VerseRow
                    key={v.verse}
                    verse={v}
                    bookName={chapterData.bookName}
                    bookAbbr={getBookAbbreviation(position.bookId)}
                    chapter={chapterData.chapter}
                    noteContent={note?.content}
                    hasNote={hasNote}
                    isNoteActive={isNoteActive}
                    isFocused={focusedVerse === v.verse}
                    isMobile={isMobile}
                    readerFontSizeClass={readerFontSizeClass}
                    readerLineSpacingClass={readerLineSpacingClass}
                    onVerseRowClick={handleVerseRowClick}
                    onVerseNumberClick={handleVerseNumberClick}
                    onUpdateContent={handleNoteChange}
                    onDeleteNote={handleDeleteNoteForVerse}
                    onTokenClick={handleNoteTokenClick}
                  />
                );
              })}

              {/* Next and Previous Chapter Pagination */}
              <nav
                aria-label="Chapter pagination"
                className="mt-16 pt-8 pb-12 border-t border-[var(--line-subtle)] grid grid-cols-3 items-center max-w-2xl lg:max-w-4xl mx-auto w-full select-none gap-2 sm:gap-4"
              >
                {planReadingSession ? (
                  /* Plan Mode Navigation (Sequences through assigned books/chapters for the day) */
                  <>
                    <div className="flex justify-start">
                      {planReadingSession.currentChapterIndex > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleNavigatePlanChapter('prev')}
                          className={`inline-flex items-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 -ml-2 sm:-ml-3 rounded hover:bg-[var(--text-primary)]/5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group text-left ${readerFontFamilyClass}`}
                          title={`Go to ${planReadingSession.assignedChapters[planReadingSession.currentChapterIndex - 1]?.bookName} ${planReadingSession.assignedChapters[planReadingSession.currentChapterIndex - 1]?.chapter}`}
                          aria-label="Previous assigned chapter in plan"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:-translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                          </svg>
                          <span className="text-sm sm:text-base font-medium">
                            {planReadingSession.assignedChapters[planReadingSession.currentChapterIndex - 1]?.bookName}{' '}
                            {planReadingSession.assignedChapters[planReadingSession.currentChapterIndex - 1]?.chapter}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentView('plans')}
                          className="inline-flex items-center gap-1.5 py-2 px-2.5 -ml-2 rounded hover:bg-[var(--text-primary)]/5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xs sm:text-sm font-sans"
                        >
                          <span aria-hidden="true">←</span>
                          <span>Back to Plan</span>
                        </button>
                      )}
                    </div>

                    <div className={`text-center flex flex-col items-center ${readerFontFamilyClass}`}>
                      <span className="text-sm sm:text-base font-medium text-[var(--text-primary)]">
                        {chapterData.bookName} {chapterData.chapter}
                      </span>
                      <span className="text-[11px] font-sans text-[var(--text-subtle)]">
                        Day {planReadingSession.dayNumber} · Chapter {planReadingSession.currentChapterIndex + 1} of{' '}
                        {planReadingSession.assignedChapters.length}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      {planReadingSession.currentChapterIndex < planReadingSession.assignedChapters.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => handleNavigatePlanChapter('next')}
                          className={`inline-flex items-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 -mr-2 sm:-mr-3 rounded hover:bg-[var(--text-primary)]/5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group text-right ${readerFontFamilyClass}`}
                          title={`Go to ${planReadingSession.assignedChapters[planReadingSession.currentChapterIndex + 1]?.bookName} ${planReadingSession.assignedChapters[planReadingSession.currentChapterIndex + 1]?.chapter}`}
                          aria-label="Next assigned chapter in plan"
                        >
                          <span className="text-sm sm:text-base font-medium">
                            {planReadingSession.assignedChapters[planReadingSession.currentChapterIndex + 1]?.bookName}{' '}
                            {planReadingSession.assignedChapters[planReadingSession.currentChapterIndex + 1]?.chapter}
                          </span>
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </button>
                      ) : (
                        /* Last assigned chapter of the day: Says "Finished" or "End" */
                        <button
                          type="button"
                          onClick={() => void handleFinishPlanDay()}
                          className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-full transition-all cursor-pointer font-sans text-xs sm:text-sm font-semibold shadow-sm ${
                            planReadingSession.isDayFinished
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                              : 'bg-[var(--text-primary)] text-[var(--bg-app)] hover:opacity-90 active:scale-95'
                          }`}
                          title="Finish day reading"
                        >
                          <span>{planReadingSession.isDayFinished ? 'Finished ✓' : 'Finish Reading'}</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* Normal Canonical Reader Pagination */
                  <>
                    <div className="flex justify-start">
                      {prevChapterTarget ? (
                        <button
                          type="button"
                          onClick={() => handleNavigateToChapter(prevChapterTarget.bookId, prevChapterTarget.chapter)}
                          className={`inline-flex items-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 -ml-2 sm:-ml-3 rounded hover:bg-[var(--text-primary)]/5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group text-left ${readerFontFamilyClass}`}
                          title={`Go to ${prevChapterTarget.label}`}
                          aria-label={`Go to ${prevChapterTarget.label}`}
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:-translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                          </svg>
                          <span className="text-sm sm:text-base font-medium">
                            {prevChapterTarget.label}
                          </span>
                        </button>
                      ) : null}
                    </div>

                    <div className={`text-center text-sm sm:text-base font-medium text-[var(--text-primary)] ${readerFontFamilyClass}`}>
                      {chapterData.bookName} {chapterData.chapter}
                    </div>

                    <div className="flex justify-end">
                      {nextChapterTarget ? (
                        <button
                          type="button"
                          onClick={() => handleNavigateToChapter(nextChapterTarget.bookId, nextChapterTarget.chapter)}
                          className={`inline-flex items-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 -mr-2 sm:-mr-3 rounded hover:bg-[var(--text-primary)]/5 text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group text-right ${readerFontFamilyClass}`}
                          title={`Go to ${nextChapterTarget.label}`}
                          aria-label={`Go to ${nextChapterTarget.label}`}
                        >
                          <span className="text-sm sm:text-base font-medium">
                            {nextChapterTarget.label}
                          </span>
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </nav>

              {/* NET Attribution Fine Print & About Modal Link */}
              <footer className="mt-12 sm:mt-16 md:mt-20 pt-6 border-t border-[var(--line-subtle)]/60 text-center font-sans">
                <p className="text-[11px] sm:text-xs text-[var(--text-subtle)] leading-relaxed max-w-2xl mx-auto">
                  Scripture text provided by the{' '}
                  <a
                    href="https://labs.bible.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--text-primary)] transition-colors"
                  >
                    NET Bible® API
                  </a>
                  . Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C.{' '}
                  (<a
                    href="http://netbible.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--text-primary)] transition-colors"
                  >
                    netbible.com
                  </a>
                  ). Quoted by permission. All rights reserved.
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAboutOpen(true)}
                    className="text-[11.5px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    About Reneu
                  </button>
                </div>
              </footer>
            </div>
          )}
        </main>
      )}

      {currentView === 'plans' && (
        <Suspense fallback={<ReadingPlansViewSkeleton />}>
          <ReadingPlansView
            onNavigate={handleNavigateFromNotes}
            onStartPlanReading={handleStartPlanReading}
            onPlanProgressChange={handlePlanProgressChange}
            initialDayNumber={planReadingSession?.dayNumber}
            fontFamily={appearance.fontFamily}
          />
        </Suspense>
      )}

      {currentView === 'notes' && (
        <Suspense fallback={<NotesViewSkeleton />}>
          <AllNotesView
            onNavigate={handleNavigateFromNotes}
            isComposingPlainNote={isComposingPlainNote}
            onToggleComposePlainNote={setIsComposingPlainNote}
          />
        </Suspense>
      )}

      {currentView === 'settings' && (
        <Suspense fallback={<SettingsViewSkeleton />}>
          <SettingsView
            settings={appearance}
            onUpdateSettings={handleUpdateAppearance}
            onNavigateToReader={() => setCurrentView('reader')}
            onOpenLoginSplash={() => setIsLoginSplashOpen(true)}
          />
        </Suspense>
      )}

      {/* Viewport-Anchored Navigation Dock & Action Button on Tablet/Mobile in Notes; Centered otherwise */}
      <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-50 flex items-center justify-between lg:justify-center pointer-events-none select-none px-4 sm:px-6 md:px-8">
        {/* Navigation Dock (Smoothly animates between center and left edge on tablet & mobile) */}
        <nav
          ref={dockNavRef}
          aria-label="App navigation"
          className={`relative dock-nav-transition dock-nav-animated pointer-events-auto font-sans h-16 p-1.5 flex items-center gap-1 sm:gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--bg-app)]/90 backdrop-blur-md shadow-sm shrink-0 ${
            currentView === 'notes' ? 'dock-anchored-left' : 'dock-centered'
          }`}
        >
          {/* Animated Sliding Active Background Indicator */}
          <div
            className="absolute top-1.5 left-0 h-[50px] rounded-full bg-[var(--text-primary)] shadow-sm pointer-events-none"
            style={{
              transform: `translateX(${dockIndicator.left}px)`,
              width: `${dockIndicator.width}px`,
              opacity: 1,
              transition:
                'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-hidden="true"
          />

          <button
            ref={readerBtnRef}
            type="button"
            onClick={() => setCurrentView('reader')}
            className={`relative z-10 min-w-[58px] sm:min-w-[66px] md:min-w-[72px] h-[50px] px-2.5 sm:px-3 md:px-3.5 rounded-full font-sans inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              currentView === 'reader'
                ? 'text-[var(--bg-app)]'
                : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
            }`}
            title="Reader"
            aria-label="Reader"
            aria-current={currentView === 'reader' ? 'page' : undefined}
          >
            <svg
              className="w-5 h-5 sm:w-5 sm:h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="font-sans text-[9px] sm:text-[9.5px] font-medium leading-none tracking-normal">
              Reader
            </span>
          </button>

          <button
            ref={plansBtnRef}
            type="button"
            onClick={() => setCurrentView('plans')}
            className={`relative z-10 min-w-[58px] sm:min-w-[66px] md:min-w-[72px] h-[50px] px-2.5 sm:px-3 md:px-3.5 rounded-full font-sans inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              currentView === 'plans'
                ? 'text-[var(--bg-app)]'
                : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
            }`}
            title="Reading Plans"
            aria-label="Reading Plans"
            aria-current={currentView === 'plans' ? 'page' : undefined}
          >
            <svg
              className="w-5 h-5 sm:w-5 sm:h-5 shrink-0"
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
              <path d="m9 16 2 2 4-4" />
            </svg>
            <span className="font-sans text-[9px] sm:text-[9.5px] font-medium leading-none tracking-normal">
              Plans
            </span>
          </button>

          <button
            ref={notesBtnRef}
            type="button"
            onClick={() => setCurrentView('notes')}
            className={`relative z-10 min-w-[58px] sm:min-w-[66px] md:min-w-[72px] h-[50px] px-2.5 sm:px-3 md:px-3.5 rounded-full font-sans inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              currentView === 'notes'
                ? 'text-[var(--bg-app)]'
                : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
            }`}
            title="Notes"
            aria-label="Notes"
            aria-current={currentView === 'notes' ? 'page' : undefined}
          >
            <svg
              className="w-5 h-5 sm:w-5 sm:h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="font-sans text-[9px] sm:text-[9.5px] font-medium leading-none tracking-normal">
              Notes
            </span>
          </button>

          <button
            ref={settingsBtnRef}
            type="button"
            onClick={() => setCurrentView('settings')}
            className={`relative z-10 min-w-[58px] sm:min-w-[66px] md:min-w-[72px] h-[50px] px-2.5 sm:px-3 md:px-3.5 rounded-full font-sans inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              currentView === 'settings'
                ? 'text-[var(--bg-app)]'
                : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5'
            }`}
            title="Appearance & Typography Settings"
            aria-label="Settings"
            aria-current={currentView === 'settings' ? 'page' : undefined}
          >
            <svg
              className="w-5 h-5 sm:w-5 sm:h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="font-sans text-[9px] sm:text-[9.5px] font-medium leading-none tracking-normal">
              Settings
            </span>
          </button>
        </nav>

        {/* Animated Add Note Button (Anchored to right on tablet & mobile, attached to dock on desktop) */}
        <div
          className={`dock-action-wrapper overflow-visible flex items-center justify-center shrink-0 ${
            currentView === 'notes'
              ? 'w-16 ml-0 lg:ml-3 sm:lg:ml-4 opacity-100 scale-100 translate-x-0 pointer-events-auto'
              : 'w-0 ml-0 opacity-0 scale-50 translate-x-3 pointer-events-none'
          }`}
          aria-hidden={currentView !== 'notes'}
        >
          <button
            type="button"
            tabIndex={currentView === 'notes' ? 0 : -1}
            onClick={() => {
              setIsComposingPlainNote((prev) => !prev);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-16 h-16 shrink-0 rounded-full border shadow-sm flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
              isComposingPlainNote
                ? 'bg-[var(--text-primary)] text-[var(--bg-app)] border-[var(--text-primary)] shadow-md'
                : 'border-[var(--line-subtle)] bg-[var(--bg-app)] text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-app)] hover:border-[var(--text-primary)]'
            }`}
            title={isComposingPlainNote ? 'Close new note' : 'New note'}
            aria-label="Add new note"
          >
            <svg
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${
                isComposingPlainNote ? 'rotate-45' : ''
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast confirming verse reference copied to clipboard (smooth in/out animation) */}
      <CopiedToast
        toast={copiedToast}
        onDismiss={handleDismissToast}
      />

      {/* Log-In Splash Page (Accessible upon logged-out visit, ?login=true, Settings, or Header trigger) */}
      {isLoginSplashOpen && (
        <Suspense fallback={null}>
          <LoginSplash
            isOpen={isLoginSplashOpen}
            onClose={() => setIsLoginSplashOpen(false)}
            onContinueAsGuest={handleContinueAsGuest}
            onAuthenticated={handleAuthenticated}
          />
        </Suspense>
      )}

      {/* About & Attribution Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
};

export default App;
