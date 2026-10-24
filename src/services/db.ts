import Dexie, { type Table } from 'dexie';
import type { CommentaryNote, ChapterData } from '../types/bible';
import type { ReadingPlan } from '../types/readingPlan';

export interface AppSettings {
  id: string; // 'theme' | 'reading_pos'
  value: any;
}

export class BibleDatabase extends Dexie {
  notes!: Table<CommentaryNote, string>;
  settings!: Table<AppSettings, string>;
  chapters!: Table<ChapterData & { id: string }, string>;
  readingPlans!: Table<ReadingPlan, string>;

  constructor() {
    super('ScriptureSplitDB');
    this.version(1).stores({
      notes: 'id, [bookId+chapter], startVerse',
      settings: 'id',
      chapters: 'id, [bookId+chapter]'
    });
    
    this.version(2).stores({
      notes: 'id, [bookId+chapter], startVerse, updatedAt'
    });

    this.version(3).stores({
      readingPlans: 'id, createdAt, isActive'
    });
  }
}

export const db = new BibleDatabase();
