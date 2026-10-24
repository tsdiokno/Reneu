import { CANONICAL_BOOKS, getBookById } from '../data/canonicalBooks';
import { ThemeMode } from '../types/bible';

// Book abbreviation lookup map
const BOOK_ALIAS_MAP: Record<string, number> = {};

CANONICAL_BOOKS.forEach((book) => {
  const normName = book.name.toLowerCase().replace(/\s+/g, '');
  const code = book.code.toLowerCase();
  BOOK_ALIAS_MAP[normName] = book.id;
  BOOK_ALIAS_MAP[code] = book.id;
});

const EXTRA_ALIASES: Record<string, number> = {
  gen: 1, ge: 1, gn: 1,
  exo: 2, ex: 2, exod: 2,
  lev: 3, le: 3, lv: 3,
  num: 4, nu: 4, nm: 4, nb: 4,
  deut: 5, dt: 5, de: 5,
  josh: 6, jos: 6, jsh: 6,
  judg: 7, jdg: 7, jg: 7, jdgs: 7,
  ruth: 8, rth: 8, ru: 8,
  '1sam': 9, '1sa': 9, '1s': 9, '1samuel': 9,
  '2sam': 10, '2sa': 10, '2s': 10, '2samuel': 10,
  '1kings': 11, '1ki': 11, '1k': 11, '1kgs': 11,
  '2kings': 12, '2ki': 12, '2k': 12, '2kgs': 12,
  '1chron': 13, '1ch': 13, '1chr': 13, '1chronicles': 13,
  '2chron': 14, '2ch': 14, '2chr': 14, '2chronicles': 14,
  ezra: 15, ezr: 15,
  neh: 16, ne: 16,
  esth: 17, est: 17,
  job: 18, jb: 18,
  psalm: 19, psalms: 19, psa: 19, ps: 19, pss: 19,
  prov: 20, pro: 20, pr: 20, prv: 20,
  eccl: 21, ecc: 21, ec: 21, qoh: 21,
  song: 22, sng: 22, sos: 22, canticles: 22, songofsolomon: 22, songofsongs: 22,
  isa: 23, is: 23, isaiah: 23,
  jer: 24, je: 24, jr: 24, jeremiah: 24,
  lam: 25, la: 25, lamentations: 25,
  ezek: 26, eze: 26, ezk: 26, ezekiel: 26,
  dan: 27, da: 27, dn: 27, daniel: 27,
  hos: 28, ho: 28, hosea: 28,
  joel: 29, jl: 29,
  amos: 30, am: 30,
  obad: 31, ob: 31, obadiah: 31,
  jonah: 32, jon: 32, jnh: 32,
  mic: 33, mc: 33, micah: 33,
  nah: 34, na: 34, nahum: 34,
  hab: 35, hb: 35, habakkuk: 35,
  zeph: 36, zep: 36, zp: 36, zephaniah: 36,
  hag: 37, hg: 37, haggai: 37,
  zech: 38, zec: 38, zc: 38, zechariah: 38,
  mal: 39, ml: 39, malachi: 39,
  matt: 40, mat: 40, mt: 40, matthew: 40,
  mark: 41, mrk: 41, mk: 41,
  luke: 42, luk: 42, lk: 42,
  john: 43, jhn: 43, jn: 43,
  acts: 44, act: 44, ac: 44,
  rom: 45, ro: 45, rm: 45, romans: 45,
  '1cor': 46, '1co': 46, '1corinthians': 46,
  '2cor': 47, '2co': 47, '2corinthians': 47,
  gal: 48, ga: 48, galatians: 48,
  eph: 49, ep: 49, ephesians: 49,
  phil: 50, php: 50, philippians: 50,
  col: 51, colossians: 51,
  '1thess': 52, '1th': 52, '1thessalonians': 52,
  '2thess': 53, '2th': 53, '2thessalonians': 53,
  '1tim': 54, '1ti': 54, '1timothy': 54,
  '2tim': 55, '2ti': 55, '2timothy': 55,
  titus: 56, tit: 56, ti: 56,
  philm: 57, phm: 57, philemon: 57,
  heb: 58, hebrews: 58,
  james: 59, jas: 59, jm: 59,
  '1pet': 60, '1pe': 60, '1pt': 60, '1peter': 60,
  '2pet': 61, '2pe': 61, '2pt': 61, '2peter': 61,
  '1john': 62, '1jn': 62, '1j': 62,
  '2john': 63, '2jn': 63, '2j': 63,
  '3john': 64, '3jn': 64, '3j': 64,
  jude: 65, jud: 65, jd: 65,
  rev: 66, revelation: 66, apocalypse: 66
};

Object.assign(BOOK_ALIAS_MAP, EXTRA_ALIASES);

export function lookupBookId(rawBookName: string): number | null {
  const clean = rawBookName.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  if (BOOK_ALIAS_MAP[clean]) {
    return BOOK_ALIAS_MAP[clean];
  }
  const found = CANONICAL_BOOKS.find((b) =>
    b.name.toLowerCase().replace(/\s+/g, '').startsWith(clean)
  );
  return found ? found.id : null;
}

export interface NavigationTarget {
  bookId: number;
  chapter: number;
  verse?: number;
}

export function parseOmnibarCommand(
  rawInput: string,
  currentBookId: number,
  currentChapter: number
): NavigationTarget | null {
  const input = rawInput.trim();
  if (!input) return null;

  const lower = input.toLowerCase();

  // 1. Next / Prev chapter command
  if (lower === 'next' || lower === 'n' || lower === '+') {
    const currentBook = getBookById(currentBookId);
    if (currentChapter < currentBook.chapterCount) {
      return { bookId: currentBookId, chapter: currentChapter + 1 };
    }
    if (currentBookId < CANONICAL_BOOKS.length) {
      return { bookId: currentBookId + 1, chapter: 1 };
    }
    return null;
  }

  if (lower === 'prev' || lower === 'previous' || lower === 'p' || lower === '-') {
    if (currentChapter > 1) {
      return { bookId: currentBookId, chapter: currentChapter - 1 };
    }
    if (currentBookId > 1) {
      const prevBook = getBookById(currentBookId - 1);
      return { bookId: currentBookId - 1, chapter: prevBook.chapterCount };
    }
    return null;
  }

  // 2. Pure number: e.g. "12" -> chapter 12 in current book
  if (/^\d+$/.test(input)) {
    const ch = parseInt(input, 10);
    const currentBook = getBookById(currentBookId);
    if (ch >= 1 && ch <= currentBook.chapterCount) {
      return { bookId: currentBookId, chapter: ch };
    }
  }

  // 3. Book + Chapter [: Verse]: e.g. "1 Corinthians 13:4", "Song of Songs 2", "John 3", "Gen 1:1", "Jn. 1:1", "1 Cor 13:4-7"
  const matchWithVerse = input.match(/^([1-3]?\s*[A-Za-z\s.]+?)\s+(\d+)[:.](\d+)(?:[a-zA-Z]|\s*-\s*\d+)?$/i);
  if (matchWithVerse) {
    const bId = lookupBookId(matchWithVerse[1]);
    if (bId) {
      const ch = parseInt(matchWithVerse[2], 10);
      const vs = parseInt(matchWithVerse[3], 10);
      const book = getBookById(bId);
      const safeCh = Math.max(1, Math.min(ch, book.chapterCount));
      return { bookId: bId, chapter: safeCh, verse: vs };
    }
  }

  const matchChapter = input.match(/^([1-3]?\s*[A-Za-z\s.]+?)\s+(\d+)$/i);
  if (matchChapter) {
    const bId = lookupBookId(matchChapter[1]);
    if (bId) {
      const ch = parseInt(matchChapter[2], 10);
      const book = getBookById(bId);
      const safeCh = Math.max(1, Math.min(ch, book.chapterCount));
      return { bookId: bId, chapter: safeCh };
    }
  }

  // 4. Just Book Name: e.g. "Romans" -> Romans 1
  const bIdOnly = lookupBookId(input);
  if (bIdOnly) {
    return { bookId: bIdOnly, chapter: 1 };
  }

  return null;
}

export type OmnibarAction =
  | { type: 'navigate'; target: NavigationTarget }
  | { type: 'theme'; theme: ThemeMode };

export function parseOmnibarAction(
  rawInput: string,
  currentBookId: number,
  currentChapter: number
): OmnibarAction | null {
  const input = rawInput.trim();
  if (!input) return null;
  const lower = input.toLowerCase();

  if (lower === 'parchment' || lower === 'theme parchment') {
    return { type: 'theme', theme: 'parchment' };
  }
  if (lower === 'white' || lower === 'light' || lower === 'theme white' || lower === 'theme light') {
    return { type: 'theme', theme: 'white' };
  }
  if (lower === 'black' || lower === 'dark' || lower === 'theme black' || lower === 'theme dark') {
    return { type: 'theme', theme: 'black' };
  }

  const nav = parseOmnibarCommand(rawInput, currentBookId, currentChapter);
  if (nav) {
    return { type: 'navigate', target: nav };
  }

  return null;
}

export function parseScriptureReference(ref: string): NavigationTarget | null {
  const clean = ref.replace(/[\[\]()]/g, '').trim();
  return parseOmnibarCommand(clean, 1, 1);
}

export interface ExtractedScriptureToken {
  type: 'token';
  label: string;
  tokenTarget: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Automatically extracts verse tokens and common scripture references from note text.
 * Matches:
 * 1. Explicit markdown link tokens: [Jn 1:1](@v:1)
 * 2. Explicit verse tokens: @v:1, @v:43:1:1
 * 3. Natural Scripture references across common formats:
 *    - "Jn 1:1", "John 1:1", "Jn. 1:1", "Jn 1.1"
 *    - "1 Jn 1:9", "1Jn 1:9", "1 Cor 13:4", "1Cor 13:4-7"
 *    - "Gen 1:1", "Rom 8:28", "Song of Songs 2:4", "Ps 23:1"
 */
export function extractScriptureTokens(content: string): ExtractedScriptureToken[] {
  if (!content || !content.trim()) return [];

  const tokens: ExtractedScriptureToken[] = [];
  const occupiedRanges: Array<{ start: number; end: number }> = [];

  const isOverlapping = (start: number, end: number) => {
    return occupiedRanges.some((r) => Math.max(start, r.start) < Math.min(end, r.end));
  };

  // 1. Explicit Markdown Link or @v: token
  const explicitRegex = /(\[([^\]]+)\]\((@(v:[a-zA-Z0-9_.:]+))\)|@(v:[a-zA-Z0-9_.:]+))/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const isMarkdown = Boolean(match[2] && match[3]);
    const label = isMarkdown ? match[2] : match[0];
    const tokenTarget = isMarkdown ? match[3] : match[0];

    tokens.push({
      type: 'token',
      label,
      tokenTarget,
      startIndex: start,
      endIndex: end,
    });
    occupiedRanges.push({ start, end });
  }

  // 2. Natural Scripture references across common formats
  const naturalRefRegex = /\b([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?\.?)\s*(\d+)[:.](\d+)(?:[a-zA-Z]|\s*-\s*\d+)?\b/gi;

  while ((match = naturalRefRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (isOverlapping(start, end)) {
      continue;
    }

    const rawBook = match[1].trim();
    const lowerBook = rawBook.toLowerCase().replace(/\./g, '');

    // Prevent matching common English words
    if (lowerBook === 'is' && !/^isa/i.test(rawBook)) {
      continue;
    }
    if (['in', 'at', 'to', 'as', 'or', 'so', 'by', 'of', 'on', 'if', 'we', 'he', 'me'].includes(lowerBook)) {
      continue;
    }

    const bId = lookupBookId(rawBook);
    if (!bId) continue;

    const ch = parseInt(match[2], 10);
    const vs = parseInt(match[3], 10);
    const book = getBookById(bId);

    // Validate that chapter is within canonical book count and verse is positive
    if (ch < 1 || ch > book.chapterCount || vs < 1) {
      continue;
    }

    const label = match[0];
    tokens.push({
      type: 'token',
      label,
      tokenTarget: label,
      startIndex: start,
      endIndex: end,
    });
    occupiedRanges.push({ start, end });
  }

  tokens.sort((a, b) => a.startIndex - b.startIndex);
  return tokens;
}

/**
 * Extracts canonical book IDs referenced by a synthesis note's citations and footnotes.
 */
export function getSynthesisReferencedBookIds(note: {
  sourceReferences?: string[];
  sourceFootnotes?: Array<{ ref: string }>;
}): number[] {
  const ids = new Set<number>();
  const refs = [
    ...(note.sourceReferences || []),
    ...(note.sourceFootnotes || []).map((f) => f.ref),
  ];
  for (const r of refs) {
    const parsed = parseScriptureReference(r);
    if (parsed) ids.add(parsed.bookId);
  }
  return Array.from(ids);
}

