import { BibleBook } from '../types/bible';

export const CANONICAL_BOOKS: BibleBook[] = [
  // Old Testament - Law (Pentateuch)
  { id: 1, code: 'GEN', name: 'Genesis', testament: 'OT', canonicalOrder: 1, chapterCount: 50, section: 'Law' },
  { id: 2, code: 'EXO', name: 'Exodus', testament: 'OT', canonicalOrder: 2, chapterCount: 40, section: 'Law' },
  { id: 3, code: 'LEV', name: 'Leviticus', testament: 'OT', canonicalOrder: 3, chapterCount: 27, section: 'Law' },
  { id: 4, code: 'NUM', name: 'Numbers', testament: 'OT', canonicalOrder: 4, chapterCount: 36, section: 'Law' },
  { id: 5, code: 'DEU', name: 'Deuteronomy', testament: 'OT', canonicalOrder: 5, chapterCount: 34, section: 'Law' },

  // Old Testament - History
  { id: 6, code: 'JOS', name: 'Joshua', testament: 'OT', canonicalOrder: 6, chapterCount: 24, section: 'History' },
  { id: 7, code: 'JDG', name: 'Judges', testament: 'OT', canonicalOrder: 7, chapterCount: 21, section: 'History' },
  { id: 8, code: 'RUT', name: 'Ruth', testament: 'OT', canonicalOrder: 8, chapterCount: 4, section: 'History' },
  { id: 9, code: '1SA', name: '1 Samuel', testament: 'OT', canonicalOrder: 9, chapterCount: 31, section: 'History' },
  { id: 10, code: '2SA', name: '2 Samuel', testament: 'OT', canonicalOrder: 10, chapterCount: 24, section: 'History' },
  { id: 11, code: '1KI', name: '1 Kings', testament: 'OT', canonicalOrder: 11, chapterCount: 22, section: 'History' },
  { id: 12, code: '2KI', name: '2 Kings', testament: 'OT', canonicalOrder: 12, chapterCount: 25, section: 'History' },
  { id: 13, code: '1CH', name: '1 Chronicles', testament: 'OT', canonicalOrder: 13, chapterCount: 29, section: 'History' },
  { id: 14, code: '2CH', name: '2 Chronicles', testament: 'OT', canonicalOrder: 14, chapterCount: 36, section: 'History' },
  { id: 15, code: 'EZR', name: 'Ezra', testament: 'OT', canonicalOrder: 15, chapterCount: 10, section: 'History' },
  { id: 16, code: 'NEH', name: 'Nehemiah', testament: 'OT', canonicalOrder: 16, chapterCount: 13, section: 'History' },
  { id: 17, code: 'EST', name: 'Esther', testament: 'OT', canonicalOrder: 17, chapterCount: 10, section: 'History' },

  // Old Testament - Poetry & Wisdom
  { id: 18, code: 'JOB', name: 'Job', testament: 'OT', canonicalOrder: 18, chapterCount: 42, section: 'Poetry' },
  { id: 19, code: 'PSA', name: 'Psalms', testament: 'OT', canonicalOrder: 19, chapterCount: 150, section: 'Poetry' },
  { id: 20, code: 'PRO', name: 'Proverbs', testament: 'OT', canonicalOrder: 20, chapterCount: 31, section: 'Poetry' },
  { id: 21, code: 'ECC', name: 'Ecclesiastes', testament: 'OT', canonicalOrder: 21, chapterCount: 12, section: 'Poetry' },
  { id: 22, code: 'SNG', name: 'Song of Songs', testament: 'OT', canonicalOrder: 22, chapterCount: 8, section: 'Poetry' },

  // Old Testament - Prophets
  { id: 23, code: 'ISA', name: 'Isaiah', testament: 'OT', canonicalOrder: 23, chapterCount: 66, section: 'Prophets' },
  { id: 24, code: 'JER', name: 'Jeremiah', testament: 'OT', canonicalOrder: 24, chapterCount: 52, section: 'Prophets' },
  { id: 25, code: 'LAM', name: 'Lamentations', testament: 'OT', canonicalOrder: 25, chapterCount: 5, section: 'Prophets' },
  { id: 26, code: 'EZK', name: 'Ezekiel', testament: 'OT', canonicalOrder: 26, chapterCount: 48, section: 'Prophets' },
  { id: 27, code: 'DAN', name: 'Daniel', testament: 'OT', canonicalOrder: 27, chapterCount: 12, section: 'Prophets' },
  { id: 28, code: 'HOS', name: 'Hosea', testament: 'OT', canonicalOrder: 28, chapterCount: 14, section: 'Prophets' },
  { id: 29, code: 'JOL', name: 'Joel', testament: 'OT', canonicalOrder: 29, chapterCount: 3, section: 'Prophets' },
  { id: 30, code: 'AMO', name: 'Amos', testament: 'OT', canonicalOrder: 30, chapterCount: 9, section: 'Prophets' },
  { id: 31, code: 'OBA', name: 'Obadiah', testament: 'OT', canonicalOrder: 31, chapterCount: 1, section: 'Prophets' },
  { id: 32, code: 'JON', name: 'Jonah', testament: 'OT', canonicalOrder: 32, chapterCount: 4, section: 'Prophets' },
  { id: 33, code: 'MIC', name: 'Micah', testament: 'OT', canonicalOrder: 33, chapterCount: 7, section: 'Prophets' },
  { id: 34, code: 'NAH', name: 'Nahum', testament: 'OT', canonicalOrder: 34, chapterCount: 3, section: 'Prophets' },
  { id: 35, code: 'HAB', name: 'Habakkuk', testament: 'OT', canonicalOrder: 35, chapterCount: 3, section: 'Prophets' },
  { id: 36, code: 'ZEP', name: 'Zephaniah', testament: 'OT', canonicalOrder: 36, chapterCount: 3, section: 'Prophets' },
  { id: 37, code: 'HAG', name: 'Haggai', testament: 'OT', canonicalOrder: 37, chapterCount: 2, section: 'Prophets' },
  { id: 38, code: 'ZEC', name: 'Zechariah', testament: 'OT', canonicalOrder: 38, chapterCount: 14, section: 'Prophets' },
  { id: 39, code: 'MAL', name: 'Malachi', testament: 'OT', canonicalOrder: 39, chapterCount: 4, section: 'Prophets' },

  // New Testament - Gospels
  { id: 40, code: 'MAT', name: 'Matthew', testament: 'NT', canonicalOrder: 40, chapterCount: 28, section: 'Gospels' },
  { id: 41, code: 'MRK', name: 'Mark', testament: 'NT', canonicalOrder: 41, chapterCount: 16, section: 'Gospels' },
  { id: 42, code: 'LUK', name: 'Luke', testament: 'NT', canonicalOrder: 42, chapterCount: 24, section: 'Gospels' },
  { id: 43, code: 'JHN', name: 'John', testament: 'NT', canonicalOrder: 43, chapterCount: 21, section: 'Gospels' },

  // New Testament - History
  { id: 44, code: 'ACT', name: 'Acts', testament: 'NT', canonicalOrder: 44, chapterCount: 28, section: 'Acts' },

  // New Testament - Epistles (Pauline & General)
  { id: 45, code: 'ROM', name: 'Romans', testament: 'NT', canonicalOrder: 45, chapterCount: 16, section: 'Epistles' },
  { id: 46, code: '1CO', name: '1 Corinthians', testament: 'NT', canonicalOrder: 46, chapterCount: 16, section: 'Epistles' },
  { id: 47, code: '2CO', name: '2 Corinthians', testament: 'NT', canonicalOrder: 47, chapterCount: 13, section: 'Epistles' },
  { id: 48, code: 'GAL', name: 'Galatians', testament: 'NT', canonicalOrder: 48, chapterCount: 6, section: 'Epistles' },
  { id: 49, code: 'EPH', name: 'Ephesians', testament: 'NT', canonicalOrder: 49, chapterCount: 6, section: 'Epistles' },
  { id: 50, code: 'PHP', name: 'Philippians', testament: 'NT', canonicalOrder: 50, chapterCount: 4, section: 'Epistles' },
  { id: 51, code: 'COL', name: 'Colossians', testament: 'NT', canonicalOrder: 51, chapterCount: 4, section: 'Epistles' },
  { id: 52, code: '1TH', name: '1 Thessalonians', testament: 'NT', canonicalOrder: 52, chapterCount: 5, section: 'Epistles' },
  { id: 53, code: '2TH', name: '2 Thessalonians', testament: 'NT', canonicalOrder: 53, chapterCount: 3, section: 'Epistles' },
  { id: 54, code: '1TI', name: '1 Timothy', testament: 'NT', canonicalOrder: 54, chapterCount: 6, section: 'Epistles' },
  { id: 55, code: '2TI', name: '2 Timothy', testament: 'NT', canonicalOrder: 55, chapterCount: 4, section: 'Epistles' },
  { id: 56, code: 'TIT', name: 'Titus', testament: 'NT', canonicalOrder: 56, chapterCount: 3, section: 'Epistles' },
  { id: 57, code: 'PHM', name: 'Philemon', testament: 'NT', canonicalOrder: 57, chapterCount: 1, section: 'Epistles' },
  { id: 58, code: 'HEB', name: 'Hebrews', testament: 'NT', canonicalOrder: 58, chapterCount: 13, section: 'Epistles' },
  { id: 59, code: 'JAS', name: 'James', testament: 'NT', canonicalOrder: 59, chapterCount: 5, section: 'Epistles' },
  { id: 60, code: '1PE', name: '1 Peter', testament: 'NT', canonicalOrder: 60, chapterCount: 5, section: 'Epistles' },
  { id: 61, code: '2PE', name: '2 Peter', testament: 'NT', canonicalOrder: 61, chapterCount: 3, section: 'Epistles' },
  { id: 62, code: '1JN', name: '1 John', testament: 'NT', canonicalOrder: 62, chapterCount: 5, section: 'Epistles' },
  { id: 63, code: '2JN', name: '2 John', testament: 'NT', canonicalOrder: 63, chapterCount: 1, section: 'Epistles' },
  { id: 64, code: '3JN', name: '3 John', testament: 'NT', canonicalOrder: 64, chapterCount: 1, section: 'Epistles' },
  { id: 65, code: 'JUD', name: 'Jude', testament: 'NT', canonicalOrder: 65, chapterCount: 1, section: 'Epistles' },

  // New Testament - Apocalypse
  { id: 66, code: 'REV', name: 'Revelation', testament: 'NT', canonicalOrder: 66, chapterCount: 22, section: 'Apocalypse' }
];

export function getBookById(id: number): BibleBook {
  return CANONICAL_BOOKS.find(b => b.id === id) || CANONICAL_BOOKS[0];
}

export function getBookByCode(code: string): BibleBook | undefined {
  return CANONICAL_BOOKS.find(b => b.code.toUpperCase() === code.toUpperCase());
}

export const STANDARD_BOOK_ABBREVIATIONS: Record<number, string> = {
  1: 'Gen',
  2: 'Exod',
  3: 'Lev',
  4: 'Num',
  5: 'Deut',
  6: 'Josh',
  7: 'Judg',
  8: 'Ruth',
  9: '1 Sam',
  10: '2 Sam',
  11: '1 Kgs',
  12: '2 Kgs',
  13: '1 Chr',
  14: '2 Chr',
  15: 'Ezra',
  16: 'Neh',
  17: 'Esth',
  18: 'Job',
  19: 'Ps',
  20: 'Prov',
  21: 'Eccl',
  22: 'Song',
  23: 'Isa',
  24: 'Jer',
  25: 'Lam',
  26: 'Ezek',
  27: 'Dan',
  28: 'Hos',
  29: 'Joel',
  30: 'Amos',
  31: 'Obad',
  32: 'Jonah',
  33: 'Mic',
  34: 'Nah',
  35: 'Hab',
  36: 'Zeph',
  37: 'Hag',
  38: 'Zech',
  39: 'Mal',
  40: 'Matt',
  41: 'Mark',
  42: 'Luke',
  43: 'Jn',
  44: 'Acts',
  45: 'Rom',
  46: '1 Cor',
  47: '2 Cor',
  48: 'Gal',
  49: 'Eph',
  50: 'Phil',
  51: 'Col',
  52: '1 Thess',
  53: '2 Thess',
  54: '1 Tim',
  55: '2 Tim',
  56: 'Titus',
  57: 'Phlm',
  58: 'Heb',
  59: 'Jas',
  60: '1 Pet',
  61: '2 Pet',
  62: '1 Jn',
  63: '2 Jn',
  64: '3 Jn',
  65: 'Jude',
  66: 'Rev',
};

export function getBookAbbreviation(id: number): string {
  return STANDARD_BOOK_ABBREVIATIONS[id] || getBookById(id).name;
}
