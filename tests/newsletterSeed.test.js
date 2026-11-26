import { describe, it, expect } from 'vitest';
import { NEWSLETTER_SEED } from '../src/data/newsletterSeed.js';

const REQUIRED_STRING_FIELDS = [
  'id',
  'edition',
  'date',
  'category',
  'level',
  'readingTime',
  'headline_fr',
  'headline_pt',
  'subheadline_fr',
  'subheadline_pt'
];
const ALLOWED_LEVELS = ['A2', 'B1', 'B2'];
const MIN_SEGMENTS = 12;
const MAX_SEGMENT_FR_LENGTH = 80;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

describe('Newsletter seed (Le Courrier Francophone)', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NEWSLETTER_SEED)).toBe(true);
    expect(NEWSLETTER_SEED.length).toBeGreaterThan(0);
  });

  it('has unique article ids', () => {
    const ids = NEWSLETTER_SEED.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(NEWSLETTER_SEED.map((article) => [article.id, article]))('%s', (_id, article) => {
    it.each(REQUIRED_STRING_FIELDS)('has a non-empty "%s"', (field) => {
      expect(isNonEmptyString(article[field]), `${article.id}.${field}`).toBe(true);
    });

    it('uses a single CEFR level (A2, B1 or B2)', () => {
      expect(ALLOWED_LEVELS).toContain(article.level);
    });

    it('has a readingTime like "3 min"', () => {
      expect(article.readingTime).toMatch(/^\d+ min$/);
    });

    it('is flagged as fiction (isFictional: true)', () => {
      expect(article.isFictional).toBe(true);
    });

    it(`has at least ${MIN_SEGMENTS} segments`, () => {
      expect(Array.isArray(article.segments)).toBe(true);
      expect(article.segments.length).toBeGreaterThanOrEqual(MIN_SEGMENTS);
    });

    it('has segments with non-empty fr and pt', () => {
      article.segments.forEach((segment, index) => {
        const where = `${article.id} segment #${index + 1}`;
        expect(isNonEmptyString(segment?.fr), `${where}: empty fr`).toBe(true);
        expect(isNonEmptyString(segment?.pt), `${where}: empty pt`).toBe(true);
      });
    });

    it(`has no segment.fr longer than ${MAX_SEGMENT_FR_LENGTH} characters`, () => {
      article.segments.forEach((segment, index) => {
        expect(
          segment.fr.length,
          `${article.id} segment #${index + 1} is too long: "${segment.fr}"`
        ).toBeLessThanOrEqual(MAX_SEGMENT_FR_LENGTH);
      });
    });
  });
});
