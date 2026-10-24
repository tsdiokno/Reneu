export type Testament = 'OT' | 'NT';

export interface BibleBook {
  id: number;
  code: string;
  name: string;
  testament: Testament;
  canonicalOrder: number;
  chapterCount: number;
  section: 'Law' | 'History' | 'Poetry' | 'Prophets' | 'Gospels' | 'Acts' | 'Epistles' | 'Apocalypse';
}

export type ThemeMode = 'parchment' | 'white' | 'black';
export type FontFamily = 'serif' | 'sans' | 'mono';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';
export type LineSpacing = 'normal' | 'relaxed' | 'loose';

export interface AppearanceSettings {
  theme: ThemeMode;
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineSpacing: LineSpacing;
}

export interface VerseToken {
  id: string; // e.g. "GEN.1.1"
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  heading?: string;
  isPoetry?: boolean;
}

export interface ChapterData {
  bookId: number;
  bookName: string;
  chapter: number;
  verses: VerseToken[];
}

export interface FootnoteReference {
  ref: string;
  excerpt?: string;
  noteId?: string;
}

export interface CommentaryNote {
  id: string;
  bookId: number;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  content: string; // For standard notes: verse commentary. For synthesis notes: user reflection below the quote.
  createdAt: number;
  updatedAt: number;
  isSynthesis?: boolean;
  isPlainNote?: boolean;
  isStarred?: boolean; // Star/bookmark to retain permanently in personal collection
  title?: string;
  synthesisQuote?: string; // Hero blockquote text
  sourceReferences?: string[];
  sourceNoteIds?: string[];
  sourceFootnotes?: FootnoteReference[];
  keyThemes?: string[];
  trajectorySummary?: string;
  practicalApplication?: string;
}

export interface SynthesisResult {
  title: string;
  synthesis: string;
  keyThemes: string[];
  trajectorySummary: string;
  practicalApplication?: string;
  updatedUserProfile?: string;
  sampledNotes: Array<{
    id: string;
    reference: string;
    content: string;
    isSynthesis?: boolean;
    isPlainNote?: boolean;
    title?: string;
  }>;
  isFallback?: boolean;
  notice?: string;
}

