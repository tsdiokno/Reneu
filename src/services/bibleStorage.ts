import type { CommentaryNote, ThemeMode, AppearanceSettings } from '../types/bible';
import { db } from './db';
import {
  pushNoteToCloud,
  deleteNoteFromCloud,
  pushSettingToCloud,
  fetchRemoteSetting,
} from './supabaseSync';

export {
  syncAllWithCloud,
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  getLastSyncedTime,
  signUpWithEmail,
  signInWithEmail,
  signInWithOAuth,
  signOutUser,
  getCurrentUser,
  onAuthStateChange,
  type SupabaseConfig,
  type SupabaseUserProfile,
  type SyncResult,
} from './supabaseSync';

const SETTING_KEYS = {
  THEME: 'theme',
  APPEARANCE: 'appearance_settings',
  READING_POS: 'reading_pos',
  USER_PROFILE: 'user_abridged_profile',
  ENGINE_MODE: 'synthesis_engine_mode',
  NEW_NOTE_MADE_FOR_SYNTHESIS: 'new_note_made_for_synthesis',
  EXPOSED_NOTES: 'exposed_notes_set',
  INITIAL_SEEDED: 'notes_initial_seeded',
};

const LOCAL_STORAGE_EXPOSED_NOTES = 'scripture_exposed_notes';

export interface ReadingPosition {
  bookId: number;
  chapter: number;
}

const DEFAULT_THEME: ThemeMode = 'parchment';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'parchment',
  fontFamily: 'serif',
  fontSize: 'base',
  lineSpacing: 'loose',
};

const DEFAULT_READING_POS: ReadingPosition = {
  bookId: 43, // John
  chapter: 1
};

function clonePlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function getReadingPosition(): Promise<ReadingPosition> {
  const setting = await db.settings.get(SETTING_KEYS.READING_POS);
  return setting ? setting.value : DEFAULT_READING_POS;
}

export async function saveReadingPosition(pos: ReadingPosition): Promise<void> {
  const plain = clonePlain(pos);
  const now = Date.now();
  await db.settings.put({ id: SETTING_KEYS.READING_POS, value: plain, updatedAt: now } as any);
  void pushSettingToCloud('reading_pos', plain);
}

let notesInitPromise: Promise<void> | null = null;

/**
 * Guarantees that commentary notes are initialized early on first launch,
 * ensuring sample commentaries exist before the reader or notes view renders.
 */
export async function ensureNotesInitialized(): Promise<void> {
  if (!notesInitPromise) {
    notesInitPromise = (async () => {
      try {
        const seededSetting = await db.settings.get(SETTING_KEYS.INITIAL_SEEDED);
        if (!seededSetting) {
          const count = await db.notes.count();
          if (count === 0) {
            await seedSampleCommentaries();
          }
          await db.settings.put({ id: SETTING_KEYS.INITIAL_SEEDED, value: true });
        }
      } catch (err) {
        console.warn('Error during notes early initialization:', err);
      }
    })();
  }
  return notesInitPromise;
}

export async function getNotesByChapter(bookId: number, chapter: number): Promise<CommentaryNote[]> {
  await ensureNotesInitialized();
  return await db.notes.where('[bookId+chapter]').equals([bookId, chapter]).toArray();
}

export async function getAllNotes(): Promise<CommentaryNote[]> {
  await ensureNotesInitialized();
  return await db.notes.orderBy('updatedAt').reverse().toArray();
}

export async function addOrUpdateNote(note: CommentaryNote): Promise<void> {
  const plain = clonePlain(note);
  await db.notes.put(plain);
  void pushNoteToCloud(plain);
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
  void deleteNoteFromCloud(id);
}

export async function createSynthesisNote(params: {
  title?: string;
  synthesisQuote: string;
  content?: string;
  sourceReferences: string[];
  sourceNoteIds: string[];
  sourceFootnotes?: Array<{ ref: string; excerpt?: string; noteId?: string }>;
  keyThemes?: string[];
  trajectorySummary?: string;
  practicalApplication?: string;
}): Promise<CommentaryNote> {
  const now = Date.now();
  const note: CommentaryNote = {
    id: `synthesis-${now}-${Math.random().toString(36).substring(2, 8)}`,
    bookId: 0,
    bookName: 'Synthesis',
    chapter: 0,
    startVerse: 0,
    endVerse: 0,
    synthesisQuote: params.synthesisQuote,
    content: params.content || '',
    createdAt: now,
    updatedAt: now,
    isSynthesis: true,
    isStarred: false,
    title: params.title || 'Synthesis Reflection',
    sourceReferences: params.sourceReferences,
    sourceNoteIds: params.sourceNoteIds,
    sourceFootnotes: params.sourceFootnotes,
    keyThemes: params.keyThemes,
    trajectorySummary: params.trajectorySummary,
    practicalApplication: params.practicalApplication,
  };
  await addOrUpdateNote(note);
  return note;
}

export async function createPlainNote(params: {
  title?: string;
  content: string;
}): Promise<CommentaryNote> {
  const now = Date.now();
  const note: CommentaryNote = {
    id: `plain-${now}-${Math.random().toString(36).substring(2, 8)}`,
    bookId: 0,
    bookName: '',
    chapter: 0,
    startVerse: 0,
    endVerse: 0,
    title: params.title?.trim() || undefined,
    content: params.content.trim(),
    createdAt: now,
    updatedAt: now,
    isPlainNote: true,
    isSynthesis: false,
  };
  await addOrUpdateNote(note);
  await recordNewNoteMadeForSynthesis();
  return note;
}

export async function hasNewNoteBeenMadeForSynthesis(): Promise<boolean> {
  const setting = await db.settings.get(SETTING_KEYS.NEW_NOTE_MADE_FOR_SYNTHESIS);
  return setting ? Boolean(setting.value) : false;
}

export async function recordNewNoteMadeForSynthesis(): Promise<void> {
  await db.settings.put({ id: SETTING_KEYS.NEW_NOTE_MADE_FOR_SYNTHESIS, value: true });
}

export async function clearNewNoteMadeForSynthesis(): Promise<void> {
  await db.settings.put({ id: SETTING_KEYS.NEW_NOTE_MADE_FOR_SYNTHESIS, value: false });
}

export async function seedSampleCommentaries(): Promise<CommentaryNote[]> {
  const now = Date.now();
  const samples: CommentaryNote[] = [
    {
      id: `seed-john1-1-${now}`,
      bookId: 43, // John
      bookName: 'John',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      content: 'The logos represents not an impersonal cosmic logic, but an incarnate ordering principle where divine intentionality enters historical contingency.',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
    },
    {
      id: `seed-gen1-3-${now}`,
      bookId: 1, // Genesis
      bookName: 'Genesis',
      chapter: 1,
      startVerse: 3,
      endVerse: 3,
      content: 'Creation begins with spoken light: divine disclosure precedes material architecture, establishing that intelligibility is the bedrock of existence.',
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    },
    {
      id: `seed-rom8-28-${now}`,
      bookId: 45, // Romans
      bookName: 'Romans',
      chapter: 8,
      startVerse: 28,
      endVerse: 28,
      content: 'Providence is neither fatalistic nor mechanical. It is the persistent redemptive weaving of human fragility and suffering into ultimate restorative purpose.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const n of samples) {
    await addOrUpdateNote(n);
  }
  return samples;
}

export const THEME_STORAGE_KEY = 'scripturepage_theme';
export const APPEARANCE_STORAGE_KEY = 'scripturepage_appearance';
export const LOCAL_STORAGE_GEMINI_API_KEY = 'scripturepage_gemini_api_key';

export async function getGeminiApiKey(): Promise<string> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_GEMINI_API_KEY);
      if (local !== null) return local;
    } catch {}
  }
  const setting = await db.settings.get('gemini_api_key');
  return setting ? setting.value : '';
}

export async function saveGeminiApiKey(key: string): Promise<void> {
  const cleanKey = key ? key.trim() : '';
  if (typeof window !== 'undefined') {
    try {
      if (cleanKey) {
        localStorage.setItem(LOCAL_STORAGE_GEMINI_API_KEY, cleanKey);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_GEMINI_API_KEY);
      }
    } catch {}
  }
  await db.settings.put({ id: 'gemini_api_key', value: cleanKey });
}

export async function testGeminiApiKey(customKey?: string): Promise<{
  success: boolean;
  message: string;
  model?: string;
}> {
  const effectiveKey = customKey !== undefined ? customKey.trim() : (await getGeminiApiKey());
  if (!effectiveKey) {
    return {
      success: false,
      message: 'No API key provided. Enter your Gemini API key above.',
    };
  }

  try {
    const res = await fetch('/api/test-gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': effectiveKey,
      },
      body: JSON.stringify({ apiKey: effectiveKey }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'API key validated successfully!',
        model: data.model,
      };
    }

    return {
      success: false,
      message: data.message || data.error || `Validation failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error verifying API key.',
    };
  }
}

export async function getTheme(): Promise<ThemeMode> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (local === 'parchment' || local === 'white' || local === 'black') {
        return local;
      }
    } catch {}
  }
  const setting = await db.settings.get(SETTING_KEYS.THEME);
  const theme = setting ? setting.value : DEFAULT_THEME;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }
  return theme;
}

export async function saveTheme(theme: ThemeMode): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }
  await db.settings.put({ id: SETTING_KEYS.THEME, value: theme });
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const setting = await db.settings.get(SETTING_KEYS.APPEARANCE);
  if (!setting) {
    const existingTheme = await getTheme();
    return { ...DEFAULT_APPEARANCE, theme: existingTheme };
  }
  const loaded = { ...DEFAULT_APPEARANCE, ...setting.value };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, loaded.theme);
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(loaded));
    } catch {}
  }
  return loaded;
}

export async function saveAppearanceSettings(settings: AppearanceSettings): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }
  const plain = clonePlain(settings);
  const now = Date.now();
  await db.settings.put({ id: SETTING_KEYS.APPEARANCE, value: plain, updatedAt: now } as any);
  await saveTheme(settings.theme);
  void pushSettingToCloud('appearance_settings', plain);
}

export async function resetToDefaults(): Promise<void> {
  notesInitPromise = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
      localStorage.removeItem(APPEARANCE_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_GEMINI_API_KEY);
      localStorage.removeItem(LOCAL_STORAGE_EXPOSED_NOTES);
    } catch {}
  }
  await db.settings.clear();
  await db.notes.clear();
  await db.chapters.clear();
}

/**
 * Synchronous initial retrieval of exposed verse note keys for zero-layout-shift render.
 * Format of each key: `${bookId}:${chapter}:${verseNum}` (e.g. "43:1:1").
 * By default, notes are hidden (empty set).
 */
export function getInitialExposedNotesSync(): Set<string> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_EXPOSED_NOTES);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    } catch {}
  }
  return new Set<string>();
}

/**
 * Asynchronous retrieval of exposed notes list from IndexedDB with localStorage fallback.
 */
export async function getExposedNotes(): Promise<string[]> {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_EXPOSED_NOTES);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  const setting = await db.settings.get(SETTING_KEYS.EXPOSED_NOTES);
  const list = setting && Array.isArray(setting.value) ? (setting.value as string[]) : [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXPOSED_NOTES, JSON.stringify(list));
    } catch {}
  }
  return list;
}

/**
 * Persists the current list of exposed verse note keys across sessions and devices.
 */
export async function saveExposedNotes(exposedList: string[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_EXPOSED_NOTES, JSON.stringify(exposedList));
    } catch {}
  }
  await db.settings.put({ id: SETTING_KEYS.EXPOSED_NOTES, value: exposedList });
}

export async function getUserProfile(): Promise<string> {
  const setting = await db.settings.get(SETTING_KEYS.USER_PROFILE);
  if (setting && typeof setting.value === 'string' && setting.value.trim().length > 0) {
    return setting.value;
  }
  // If local Dexie is unpopulated, attempt to pull the living profile from Supabase
  try {
    const remote = await fetchRemoteSetting('user_profile');
    if (remote && typeof remote.value === 'string' && remote.value.trim().length > 0) {
      await db.settings.put({
        id: SETTING_KEYS.USER_PROFILE,
        value: remote.value,
        updatedAt: remote.updatedAt,
      } as any);
      return remote.value;
    }
  } catch (err) {
    console.debug('Failed fetching cloud user profile fallback:', err);
  }
  return '';
}

export async function saveUserProfile(profile: string): Promise<void> {
  const now = Date.now();
  await db.settings.put({ id: SETTING_KEYS.USER_PROFILE, value: profile, updatedAt: now } as any);
  void pushSettingToCloud('user_profile', profile);
}

export async function resetUserProfile(): Promise<void> {
  await db.settings.delete(SETTING_KEYS.USER_PROFILE);
}

/**
 * Retrieves the rolling historical summary of prior syntheses used as compact background context for AI prompts.
 */
export async function getSynthesisProfile(): Promise<string> {
  return await getUserProfile();
}

/**
 * Saves and updates the rolling historical synthesis profile.
 */
export async function saveSynthesisProfile(profile: string): Promise<void> {
  await saveUserProfile(profile);
}

/**
 * Silent synthesis expiration window: 48 hours.
 * An un-retained synthesis expires silently out of the frontend after 48 hours,
 * or is replaced if a new synthesis is triggered before the 48-hour window.
 */
export const SYNTHESIS_EXPIRATION_MS = 48 * 60 * 60 * 1000;

/**
 * A synthesis is kept visible permanently for the user if:
 * a.) the user bookmarks / stars the synthesis (isStarred === true), OR
 * b.) the user puts a commentary on the synthesis (content has non-empty text).
 */
export function isSynthesisRetained(note: CommentaryNote): boolean {
  if (!note.isSynthesis) return true;
  const hasCommentary = Boolean(note.content && note.content.trim().length > 0);
  const isStarred = Boolean(note.isStarred);
  return isStarred || hasCommentary;
}

/**
 * Checks whether an un-retained synthesis has expired (exceeded 48 hours).
 * Retained syntheses (starred or commented) NEVER expire.
 */
export function isSynthesisExpired(note: CommentaryNote): boolean {
  if (!note.isSynthesis) return false;
  if (isSynthesisRetained(note)) return false;
  const timestamp = note.createdAt || note.updatedAt || 0;
  return Date.now() - timestamp > SYNTHESIS_EXPIRATION_MS;
}

/**
 * Silently deletes any un-retained syntheses that have exceeded the 48-hour window.
 */
export async function pruneExpiredSyntheses(): Promise<string[]> {
  await ensureNotesInitialized();
  const notes = await db.notes.toArray();
  const expiredIds: string[] = [];
  for (const n of notes) {
    if (n.isSynthesis && isSynthesisExpired(n)) {
      expiredIds.push(n.id);
      await db.notes.delete(n.id);
    }
  }
  return expiredIds;
}

/**
 * Silently prunes any un-retained syntheses (to be replaced when a new synthesis is triggered).
 */
export async function pruneUnretainedSyntheses(): Promise<string[]> {
  await ensureNotesInitialized();
  const notes = await db.notes.toArray();
  const prunedIds: string[] = [];
  for (const n of notes) {
    if (n.isSynthesis && !isSynthesisRetained(n)) {
      prunedIds.push(n.id);
      await db.notes.delete(n.id);
    }
  }
  return prunedIds;
}

/**
 * Toggles the bookmark/star status on a note (retains synthesis permanently when starred).
 */
export async function toggleStarNote(id: string): Promise<boolean> {
  await ensureNotesInitialized();
  const note = await db.notes.get(id);
  if (!note) return false;
  const newStarred = !note.isStarred;
  note.isStarred = newStarred;
  note.updatedAt = Date.now();
  await db.notes.put(clonePlain(note));
  return newStarred;
}

/**
 * Appends a compact snapshot of a new successful synthesis to the background rolling profile,
 * capping history to the last 6 entries to conserve token budgets while preserving thematic continuity.
 */
export async function appendToSynthesisProfile(summary: {
  title: string;
  keyThemes?: string[];
  trajectorySummary?: string;
  userCommentary?: string;
}): Promise<string> {
  const current = await getUserProfile();
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const themesStr = (summary.keyThemes || []).slice(0, 3).join(', ');
  const commentarySnippet = summary.userCommentary ? ` | Reflection: "${summary.userCommentary.slice(0, 80)}..."` : '';
  const newEntry = `• [${dateStr}] "${summary.title}" (${themesStr})${summary.trajectorySummary ? ` — ${summary.trajectorySummary.slice(0, 100)}` : ''}${commentarySnippet}`;

  const existingLines = current ? current.split('\n').filter((l) => l.trim().length > 0) : [];
  // If an entry for this synthesis title already exists, update it with commentary
  const existingIdx = existingLines.findIndex((line) => line.includes(`"${summary.title}"`));
  if (existingIdx >= 0) {
    existingLines[existingIdx] = newEntry;
  } else {
    existingLines.push(newEntry);
  }
  // Cap at 6 rolling snapshot lines (under ~180 words total)
  const capped = existingLines.slice(-6).join('\n');
  await saveUserProfile(capped);
  return capped;
}

export type SynthesisEngineMode = 'simulated' | 'live';

export async function getSynthesisEngineMode(): Promise<SynthesisEngineMode> {
  const setting = await db.settings.get(SETTING_KEYS.ENGINE_MODE);
  return (setting?.value as SynthesisEngineMode) || 'live';
}

export async function saveSynthesisEngineMode(mode: SynthesisEngineMode): Promise<void> {
  await db.settings.put({ id: SETTING_KEYS.ENGINE_MODE, value: mode });
}

