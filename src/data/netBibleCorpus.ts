import { ChapterData, VerseToken } from '../types/bible';
import { getBookById } from './canonicalBooks';
import { db } from '../services/db';

export async function fetchChapterData(bookId: number, chapter: number): Promise<ChapterData> {
  const cacheKey = `${bookId}-${chapter}`;
  const cached = await db.chapters.get(cacheKey);
  if (cached) {
    return cached;
  }

  const book = getBookById(bookId);
  if (!book) throw new Error('Invalid book ID');

  try {
    // Fetch from official NET Bible API
    // Replace spaces in book names (like "1 John") with "%20"
    const bookNameSafe = encodeURIComponent(book.name);
    const res = await fetch(`https://labs.bible.org/api/?passage=${bookNameSafe}%20${chapter}&type=json`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch from NET Bible API');
    }
    
    const apiData = await res.json();
    
    if (!Array.isArray(apiData) || apiData.length === 0) {
      throw new Error('No verses returned for this chapter');
    }
    
    const verses: VerseToken[] = [];
    
    apiData.forEach((item: any) => {
      const vNum = parseInt(item.verse, 10);
      const text = item.text.trim();
      const verseId = `${book.code}.${chapter}.${vNum}`;
      
      verses.push({
        id: verseId,
        bookId,
        bookName: book.name,
        chapter,
        verse: vNum,
        text
      });
    });

    const chapterData: ChapterData = {
      bookId,
      bookName: book.name,
      chapter,
      verses
    };

    await db.chapters.put(JSON.parse(JSON.stringify({ ...chapterData, id: cacheKey })));
    return chapterData;

  } catch (error) {
    console.error('API Fetch error:', error);
    // Fallback to a single verse error message if API fails
    return {
      bookId,
      bookName: book.name,
      chapter,
      verses: [
        {
          id: `${book.code}.${chapter}.1`,
          bookId,
          bookName: book.name,
          chapter,
          verse: 1,
          text: `[Network Error: Unable to fetch ${book.name} ${chapter} from labs.bible.org]`,
        }
      ]
    };
  }
}
