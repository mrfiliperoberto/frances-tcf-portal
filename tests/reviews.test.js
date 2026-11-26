import { describe, it, expect } from 'vitest';
import { isCardDue } from '../src/services/sm2Algorithm.js';

describe('Cobrança 15-30-45', () => {
  it('flashcard: etapa pendente vence no dia e continua cobrada se atrasada', () => {
    const card = { reviewDates: ['2026-11-10', '2026-11-25', '2026-12-10'], repetition: 0, isMastered: false };
    expect(isCardDue(card, '2026-11-09')).toBe(false);
    expect(isCardDue(card, '2026-11-10')).toBe(true);
    expect(isCardDue(card, '2026-11-20')).toBe(true); // atrasada (antes: false)
    // Após concluir a 1ª etapa (repetition 1), só a do dia 30 conta
    expect(isCardDue({ ...card, repetition: 1 }, '2026-11-20')).toBe(false);
    expect(isCardDue({ ...card, repetition: 1 }, '2026-11-25')).toBe(true);
    expect(isCardDue({ ...card, repetition: 3 }, '2026-12-31')).toBe(false);
    expect(isCardDue({ ...card, isMastered: true }, '2026-11-10')).toBe(false);
  });

  it('palavra: revisão atrasada é cobrada e pode ser concluída', async () => {
    const mod = await import('../src/services/db.js');
    await mod.initDatabase();
    await mod.db.dailyWords.put({
      id: 'atrasada',
      word: 'atrasada',
      reviewDates: ['2026-11-01', '2026-11-16', '2026-12-01'],
      completedReviewDates: [],
      isMastered: false
    });

    expect(mod.isDailyWordDue(await mod.db.dailyWords.get('atrasada'), '2026-11-10')).toBe(true);

    const summary = await mod.getDueReviewSummary('2026-11-10');
    const entry = summary.words.find((w) => w.id === 'atrasada');
    expect(entry).toMatchObject({ overdue: true, nextDate: '2026-11-01' });

    // Concluir "hoje" resolve a etapa atrasada mais antiga (antes ficava presa)
    const updated = await mod.completeDailyWordReview('atrasada', '2026-11-10');
    expect(updated.reviewDates).toEqual(['2026-11-16', '2026-12-01']);
    expect(updated.completedReviewDates).toEqual(['2026-11-01']);
    expect(mod.isDailyWordDue(updated, '2026-11-10')).toBe(false);
    mod.db.close();
  });

  it('resumo conta flashcards pendentes', async () => {
    const mod = await import('../src/services/db.js');
    await mod.initDatabase();
    await mod.db.flashcards.clear();
    await mod.db.flashcards.add({ front: 'due', reviewDates: ['2026-11-01', '2026-11-16', '2026-12-01'], repetition: 0 });
    await mod.db.flashcards.add({ front: 'futuro', reviewDates: ['2026-12-20', '2027-01-04', '2027-01-19'], repetition: 0 });
    const summary = await mod.getDueReviewSummary('2026-11-10');
    expect(summary.cards.map((c) => c.front)).toEqual(['due']);
    mod.db.close();
  });
});
