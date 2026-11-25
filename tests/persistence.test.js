import { describe, it, expect, vi } from 'vitest';

/** Simula um F5: fecha o banco, descarta os módulos e importa tudo de novo. */
async function reload(mod) {
  mod.db.close();
  vi.resetModules();
  return import('../src/services/db.js');
}

describe('Pilares diários (dailyProgress) sobrevivem ao F5', () => {
  it('persiste pilares marcados e o encerramento do dia', async () => {
    let mod = await import('../src/services/db.js');
    await mod.initDatabase();

    await mod.setDailyPillarCompleted('dictionary', { dateStr: '2026-11-25', studyDay: 4 });
    await mod.setDailyPillarCompleted('reading', { dateStr: '2026-11-25', studyDay: 99 });

    mod = await reload(mod);
    await mod.initDatabase();
    let progress = await mod.getDailyProgress('2026-11-25');
    expect(progress.pillars).toEqual({ dictionary: true, cartoon: false, reading: true, videoLesson: false });
    expect(progress.studyDay).toBe(4); // mantém o Jour do início do dia
    expect(progress.finishedAt).toBeNull();

    await mod.markDailyProgressFinished({ dateStr: '2026-11-25', studyDay: 4 });
    mod = await reload(mod);
    progress = await mod.getDailyProgress('2026-11-25');
    expect(progress.finishedAt).toBeTruthy();

    // Outro dia começa limpo
    expect(await mod.getDailyProgress('2026-11-26')).toBeNull();
    mod.db.close();
  });

  it('rejeita pilar desconhecido', async () => {
    const mod = await import('../src/services/db.js');
    await expect(mod.setDailyPillarCompleted('hack')).rejects.toThrow(/Pilar desconhecido/);
    mod.db.close();
  });
});

describe('localStorage sem duplicar dados do IndexedDB', () => {
  it('salva apenas metadados e preserva o blob legado uma única vez', async () => {
    const legacyBlob = JSON.stringify({
      studyStreak: 9,
      dailySteps: { 1: true, 2: false, 3: false, 4: false },
      flashcards: [{ front: 'legado', back: 'x' }],
      tcfHistory: [{ date: '2026-01-01', mode: 'CO', score: '10/20' }]
    });
    localStorage.setItem('zeroAoCanadaState_v2', legacyBlob);

    const { storageService } = await import('../src/services/storageService.js');
    const state = storageService.loadState();
    expect(state.studyStreak).toBe(9);
    expect(state.dailySteps[1]).toBe(true); // estado antigo sem data: mantém o dia corrente

    storageService.saveState({ ...state, studyStreak: 10 });
    const saved = JSON.parse(localStorage.getItem('zeroAoCanadaState_v2'));
    expect(saved.studyStreak).toBe(10);
    expect(saved.flashcards).toBeUndefined();
    expect(saved.tcfHistory).toBeUndefined();

    // Cópia integral do legado preservada
    expect(localStorage.getItem('zeroAoCanadaState_legacy_backup')).toBe(legacyBlob);

    // F5: estado recarregado continua correto
    vi.resetModules();
    const again = (await import('../src/services/storageService.js')).storageService.loadState();
    expect(again.studyStreak).toBe(10);
  });

  it('flashcards que só existiam no localStorage migram para o IndexedDB mesmo após o strip', async () => {
    localStorage.setItem(
      'zeroAoCanadaState_v2',
      JSON.stringify({ flashcards: [{ front: 'só-no-localStorage', back: 'x' }] })
    );
    const { storageService } = await import('../src/services/storageService.js');
    storageService.saveState(storageService.loadState()); // primeiro save já sem flashcards

    const mod = await import('../src/services/db.js');
    await mod.initDatabase();
    const fronts = (await mod.db.flashcards.toArray()).map((c) => c.front);
    expect(fronts).toContain('só-no-localStorage');
    mod.db.close();
  });

  it('zera as etapas diárias quando a data muda', async () => {
    localStorage.setItem(
      'zeroAoCanadaState_v2',
      JSON.stringify({ dailySteps: { 1: true, 2: true, 3: true, 4: true }, dailyStepsDate: '2020-01-01' })
    );
    const { storageService } = await import('../src/services/storageService.js');
    const state = storageService.loadState();
    expect(Object.values(state.dailySteps).some(Boolean)).toBe(false);
  });
});
