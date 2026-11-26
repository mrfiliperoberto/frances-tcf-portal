import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { VIDEO_LESSON_SEED } from '../src/data/videoLessonSeed.js';
import { CARTOON_SPRINTS_SEED } from '../src/data/cartoonSeed.js';

const DB_NAME = 'ZeroAoCanadaDB';
const V10_SCHEMA = {
  flashcards:
    '++id, category, studiedAt, *reviewDates, isMastered, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, word, level, category, palavra, nivel, estudado, studiedAt, *reviewDates, isMastered, proxima_revisao',
  cartoonEpisodes: '++id, day, sprintId, level',
  cartoonSummaries: '++id, episode_id, study_day, date',
  guidedReading: '++id, book_title, chapter, is_completed',
  videoLessons: '++id, youtube_id, level, topic',
  studySessions: '++id, date, is_completed',
  dailyProgress: 'date, studyDay, finishedAt',
  voiceRecordings: '++id, wordId, recordedAt, source'
};

const totalEpisodes = CARTOON_SPRINTS_SEED.reduce((sum, s) => sum + s.episodes.length, 0);

describe('content seed sync (Daily Cartoon + Teoria em Vídeo)', () => {
  it('updates an existing install with the new seed without touching user data', async () => {
    const legacy = new Dexie(DB_NAME);
    legacy.version(10).stores(V10_SCHEMA);
    await legacy.open();
    await legacy.videoLessons.bulkPut([
      { id: 'vl_1', day: 1, level: 'A1', title: 'Título antigo', url: 'https://www.youtube.com/watch?v=OLDOLDOLD01' },
      { id: 'vl_2', day: 2, level: 'A1', title: 'x', url: 'https://www.youtube.com/watch?v=OLDOLDOLD02', isCompleted: true },
      { id: 'vl_9999', day: 9999, level: 'B2', title: 'Saiu da seed', url: 'https://www.youtube.com/watch?v=OLDOLDOLD03' },
      { id: 'my_custom', day: 3, level: 'A1', title: 'Minha aula', url: 'https://www.youtube.com/watch?v=MYMYMYMYMY1' }
    ]);
    await legacy.cartoonEpisodes.bulkPut([
      { id: 'c_s2_16', day: 16, title: 'Peppa quebrado', url: 'https://www.youtube.com/watch?v=H6UjT2Q0X4U' },
      { id: 'c_s99_01', day: 999, title: 'Episódio removido', url: 'https://www.youtube.com/watch?v=OLDOLDOLD04' }
    ]);
    await legacy.cartoonSummaries.add({ episode_id: 'c_s1_01', study_day: 1, date: '2026-11-01', summary_text: 'Meu resumo' });
    await legacy.studySessions.add({ date: '2026-11-01T10:00:00Z', is_completed: true });
    legacy.close();

    const mod = await import('../src/services/db.js');
    await mod.initDatabase();

    const lessons = await mod.db.videoLessons.toArray();
    const byId = new Map(lessons.map((l) => [l.id, l]));
    expect(byId.get('vl_1').url).toBe(VIDEO_LESSON_SEED[0].url);
    expect(byId.get('vl_1').title).toBe(VIDEO_LESSON_SEED[0].title);
    expect(byId.get('vl_2').isCompleted).toBe(true); // preservado
    expect(byId.has('vl_9999')).toBe(VIDEO_LESSON_SEED.some((l) => l.id === 'vl_9999'));
    expect(byId.get('my_custom').title).toBe('Minha aula'); // fora do prefixo: intocado
    expect(lessons).toHaveLength(VIDEO_LESSON_SEED.length + 1);

    const episodes = await mod.db.cartoonEpisodes.toArray();
    expect(episodes).toHaveLength(totalEpisodes);
    expect(episodes.some((e) => e.id === 'c_s99_01')).toBe(false);

    // dados do usuário intactos
    expect(await mod.db.cartoonSummaries.count()).toBe(1);
    expect(await mod.db.studySessions.count()).toBe(1);
    mod.db.close();
  });

  it('fresh install gets the full seeds', async () => {
    const mod = await import('../src/services/db.js');
    await mod.initDatabase();
    expect(await mod.db.videoLessons.count()).toBe(VIDEO_LESSON_SEED.length);
    expect(await mod.db.cartoonEpisodes.count()).toBe(totalEpisodes);
    mod.db.close();
  });

  it('getAllVideoLessons returns the synced list', async () => {
    const mod = await import('../src/services/db.js');
    const lessons = await mod.getAllVideoLessons();
    expect(lessons).toHaveLength(VIDEO_LESSON_SEED.length);
    mod.db.close();
  });
});
