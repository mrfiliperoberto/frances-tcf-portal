import { describe, it, expect } from 'vitest';
import { CARTOON_SPRINTS_SEED } from '../src/data/cartoonSeed.js';
import { VIDEO_LESSON_SEED } from '../src/data/videoLessonSeed.js';

const YOUTUBE_URL = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/;

describe('Daily Cartoon seed', () => {
  const episodes = CARTOON_SPRINTS_SEED.flatMap((sprint) => sprint.episodes.map((ep) => ({ ...ep, sprint })));

  it('covers consecutive days from 1 with exactly one episode per day', () => {
    const days = episodes.map((ep) => ep.day);
    expect(days).toEqual(Array.from({ length: days.length }, (_, i) => i + 1));
    expect(days.length).toBeGreaterThanOrEqual(180);
  });

  it('has unique episode ids that encode sprint and day', () => {
    const ids = episodes.map((ep) => ep.id);
    expect(new Set(ids).size).toBe(ids.length);
    episodes.forEach((ep) => {
      expect(ep.id).toBe(`c_s${ep.sprint.sprintId}_${String(ep.day).padStart(2, '0')}`);
    });
  });

  it('uses valid YouTube watch URLs and non-empty titles', () => {
    episodes.forEach((ep) => {
      expect(ep.url, ep.id).toMatch(YOUTUBE_URL);
      expect(ep.title.trim().length, ep.id).toBeGreaterThan(0);
    });
  });

  it('has 15-day sprints whose "days" label matches their episodes', () => {
    CARTOON_SPRINTS_SEED.forEach((sprint) => {
      expect(sprint.episodes, `sprint ${sprint.sprintId}`).toHaveLength(15);
      const first = sprint.episodes[0].day;
      expect(sprint.days).toBe(`${first} a ${first + 14}`);
      expect(sprint.level).toBeTruthy();
    });
  });
});

describe('Teoria em Vídeo seed', () => {
  it('covers days 1..365 with one lesson per day', () => {
    const days = VIDEO_LESSON_SEED.map((lesson) => lesson.day).sort((a, b) => a - b);
    expect(days).toEqual(Array.from({ length: 365 }, (_, i) => i + 1));
  });

  it('has unique vl_ ids, valid URLs, titles and CEFR levels', () => {
    const ids = VIDEO_LESSON_SEED.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    VIDEO_LESSON_SEED.forEach((lesson) => {
      expect(lesson.id).toMatch(/^vl_\d+$/);
      expect(lesson.url, lesson.id).toMatch(YOUTUBE_URL);
      expect(lesson.title.trim().length, lesson.id).toBeGreaterThan(0);
      expect(['A1', 'A2', 'B1', 'B2']).toContain(lesson.level);
    });
  });
});
