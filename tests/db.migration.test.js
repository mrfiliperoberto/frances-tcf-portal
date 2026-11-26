import { describe, it, expect, vi, afterEach } from 'vitest';
import Dexie from 'dexie';

const DB_NAME = 'ZeroAoCanadaDB';

// Cópia fiel do schema v8 em produção antes da Fase 1.
const V8_SCHEMA = {
  flashcards:
    '++id, category, studiedAt, *reviewDates, isMastered, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, word, level, category, palavra, nivel, estudado, studiedAt, *reviewDates, isMastered, proxima_revisao',
  cartoonEpisodes: '++id, day, sprintId, level, title, url',
  cartoonSummaries: '++id, episode_id, study_day, date, summary_text',
  guidedReading: '++id, book_title, chapter, stanzas, audio_url, is_completed',
  videoLessons: '++id, title, youtube_id, level, topic',
  studySessions: '++id, date, notebook_photo_data_url, is_completed'
};

const BIG_PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(50_000);

/** Cria um banco v8 com registros "de usuário" pré-existentes. */
async function seedLegacyV8() {
  const legacy = new Dexie(DB_NAME);
  legacy.version(8).stores(V8_SCHEMA);
  await legacy.open();

  const cardIds = await legacy.flashcards.bulkAdd(
    [
      { category: 'Pessoal', front: 'la maison', back: 'a casa', reviewDates: ['2026-11-01', '2026-11-16', '2026-12-01'], repetition: 0, isMastered: false, createdAt: '2026-10-17T10:00:00Z' },
      { category: 'Pessoal', front: 'le chat', back: 'o gato', reviewDates: null, repetition: 1, isMastered: false, createdAt: '2026-10-18T10:00:00Z' }
    ],
    { allKeys: true }
  );
  await legacy.dailyWords.bulkPut([
    { id: 'word_A1_0', word: 'bonjour', palavra: 'bonjour', level: 'A1', reviewCount: 7, studiedAt: '2026-10-01', reviewDates: ['2026-10-31', '2026-11-15'], completedReviewDates: ['2026-10-16'], isMastered: false, estudado: true },
    { id: 'custom_1', word: 'courriel', palavra: 'courriel', level: 'B1', reviewCount: 2, reviewDates: undefined, isMastered: 0 }
  ]);
  await legacy.errorLogs.add({ date: '01/11/2026', source: 'TCF', original: 'x'.repeat(2000), corrected: 'y', explanation: 'z'.repeat(3000), flashcardId: cardIds[0] });
  await legacy.tcfHistory.add({ date: '2026-11-02', mode: 'Escrita Tâche 3', score: '14/20', nclc: 'NCLC 7' });
  await legacy.studySessions.add({ date: '2026-11-20T10:00:00Z', notebook_photo_data_url: BIG_PHOTO, is_completed: true });
  await legacy.cartoonSummaries.add({ episode_id: 'c_s1_01', study_day: 3, date: '2026-11-03', summary_text: 'Résumé '.repeat(500) });
  await legacy.guidedReading.put({ id: 1, book_title: 'Le Petit Prince', chapter: 1, stanzas: [{ fr: 'a', pt: 'b' }], is_completed: true });
  await legacy.cartoonEpisodes.put({ id: 'c_s1_01', day: 1, sprintId: 1, title: 'Ep 1', url: 'https://x' });
  await legacy.videoLessons.put({ id: 'vl_1', day: 1, level: 'A1', title: 'Aula 1' });

  const snapshot = {};
  for (const t of legacy.tables) snapshot[t.name] = await t.toArray();
  legacy.close();
  return snapshot;
}

async function readAllRaw(dbInstance) {
  const out = {};
  for (const t of dbInstance.tables) out[t.name] = await t.toArray();
  return out;
}

let openedDb = null;
afterEach(() => {
  openedDb?.close();
  openedDb = null;
});

describe('Migração v8 → v9', () => {
  it('preserva todos os registros, ajusta índices e cria a store dailyProgress', async () => {
    const before = await seedLegacyV8();

    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();

    expect(mod.db.verno).toBe(9);
    expect(mod.dbStatus.state).toBe('ready');
    const after = await readAllRaw(mod.db);

    // Nenhum registro perdido em nenhuma store antiga
    for (const store of Object.keys(V8_SCHEMA)) {
      for (const record of before[store]) {
        const match = after[store].find((r) => r.id === record.id);
        expect(match, `${store}#${record.id} sumiu`).toBeTruthy();
      }
    }

    // Conteúdo extenso preservado byte a byte
    expect(after.studySessions[0].notebook_photo_data_url).toBe(BIG_PHOTO);
    expect(after.errorLogs[0].explanation).toBe(before.errorLogs[0].explanation);

    // Progresso do usuário intacto (sync da seed não sobrescreve)
    const bonjour = after.dailyWords.find((w) => w.id === 'word_A1_0');
    expect(bonjour.reviewCount).toBe(7);
    expect(bonjour.reviewDates).toEqual(['2026-10-31', '2026-11-15']);
    expect(bonjour.completedReviewDates).toEqual(['2026-10-16']);

    // Normalização não destrutiva no upgrade
    const custom = after.dailyWords.find((w) => w.id === 'custom_1');
    expect(custom.reviewDates).toEqual([]);
    expect(custom.isMastered).toBe(false);
    expect(custom.reviewCount).toBe(2);
    const chat = after.flashcards.find((c) => c.front === 'le chat');
    expect(chat.reviewDates).toEqual([]);

    // Flashcards existentes não são re-semeados
    expect(after.flashcards.length).toBe(before.flashcards.length);

    // Índices de campos extensos removidos
    const idx = (table) => Object.keys(mod.db.table(table).schema.idxByName);
    expect(idx('errorLogs')).not.toContain('original');
    expect(idx('errorLogs')).not.toContain('explanation');
    expect(idx('studySessions')).not.toContain('notebook_photo_data_url');
    expect(idx('cartoonSummaries')).not.toContain('summary_text');
    expect(idx('guidedReading')).not.toContain('stanzas');

    // Nova store
    expect(mod.db.dailyProgress).toBeDefined();
    expect(mod.db.dailyProgress.schema.primKey.keyPath).toBe('date');
  });

  it('cria snapshot de backup ANTES do upgrade, com todas as contagens', async () => {
    const before = await seedLegacyV8();
    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();

    const backup = await import('../src/services/dbBackup.js');
    const snaps = await backup.listSnapshots();
    expect(snaps).toHaveLength(1);
    expect(snaps[0].fromVersion).toBe(8);
    for (const [store, rows] of Object.entries(before)) {
      expect(snaps[0].counts[store]).toBe(rows.length);
    }
    const full = await backup.getSnapshot(snaps[0].id);
    const photo = full.data.stores.studySessions.records[0].value.notebook_photo_data_url;
    expect(photo).toBe(BIG_PHOTO);
  });

  it('não cria novo snapshot quando o banco já está na versão atual', async () => {
    await seedLegacyV8();
    let mod = await import('../src/services/db.js');
    await mod.initDatabase();
    mod.db.close();

    vi.resetModules();
    mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();

    const backup = await import('../src/services/dbBackup.js');
    expect(await backup.listSnapshots()).toHaveLength(1);
  });

  it('instalação nova: popula seeds e não cria snapshot', async () => {
    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();
    expect(await mod.db.dailyWords.count()).toBeGreaterThan(0);
    expect(await mod.db.flashcards.count()).toBeGreaterThan(0);

    const backup = await import('../src/services/dbBackup.js');
    expect(await backup.listSnapshots()).toHaveLength(0);
  });
});

describe('Falhas de abertura nunca apagam dados', () => {
  it('falha de abertura (OpenFailedError): erro diagnosticado, dados intactos, sem db.delete', async () => {
    const before = await seedLegacyV8();

    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    const deleteSpy = vi.spyOn(mod.db, 'delete');
    const openErr = new Dexie.OpenFailedError('UnknownError: Internal error opening backing store');
    vi.spyOn(mod.db, 'open').mockRejectedValue(openErr);

    await mod.initDatabase(); // não deve lançar para a UI
    expect(mod.dbStatus.state).toBe('error');
    expect(mod.dbStatus.errorKind).toBe('open');
    expect(mod.dbStatus.error).toMatch(/OpenFailedError/);
    expect(deleteSpy).not.toHaveBeenCalled();

    // Escritas falham explicitamente em vez de gravar num banco recriado vazio
    await expect(mod.addFlashcard({ front: 'x', back: 'y' })).rejects.toThrow();

    const check = new Dexie(DB_NAME);
    check.version(8).stores(V8_SCHEMA);
    await check.open();
    expect(await check.flashcards.count()).toBe(before.flashcards.length);
    expect(await check.dailyWords.count()).toBe(before.dailyWords.length);
    check.close();
  });

  it('banco criado por uma versão futura do app abre sem apagar nada (Dexie 4)', async () => {
    const future = new Dexie(DB_NAME);
    future.version(50).stores({ ...V8_SCHEMA, futureStore: '++id' });
    await future.open();
    await future.flashcards.add({ front: 'précieux', back: 'precioso' });
    await future.table('futureStore').add({ x: 1 });
    future.close();

    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    const deleteSpy = vi.spyOn(mod.db, 'delete');
    await mod.initDatabase();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect((await mod.db.flashcards.toArray()).map((c) => c.front)).toContain('précieux');
    mod.db.close();

    const check = new Dexie(DB_NAME);
    check.version(50).stores({ ...V8_SCHEMA, futureStore: '++id' });
    await check.open();
    expect(await check.table('futureStore').count()).toBe(1);
    check.close();
  });

  it('falha ao criar backup: migração adiada, banco continua em v8 com todos os dados', async () => {
    const before = await seedLegacyV8();

    vi.doMock('../src/services/dbBackup.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        createSnapshot: vi.fn().mockRejectedValue(new Error('QuotaExceededError simulado'))
      };
    });

    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();
    expect(mod.dbStatus.state).toBe('error');
    expect(mod.dbStatus.errorKind).toBe('backup');
    expect(mod.db.isOpen()).toBe(false);

    const { getRawDatabaseVersion } = await vi.importActual('../src/services/dbBackup.js');
    expect(await getRawDatabaseVersion(DB_NAME)).toBe(80);

    const check = new Dexie(DB_NAME);
    check.version(8).stores(V8_SCHEMA);
    await check.open();
    expect(await check.flashcards.count()).toBe(before.flashcards.length);
    expect(await check.studySessions.count()).toBe(1);
    check.close();
    vi.doUnmock('../src/services/dbBackup.js');
  });

  it('erro dentro do .upgrade() aborta a migração inteira sem perder dados', async () => {
    await seedLegacyV8();

    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    // 1º modify (dailyWords) roda de verdade; o 2º (flashcards) falha no meio da migração.
    const realModify = mod.db.Collection.prototype.modify;
    let calls = 0;
    const spy = vi.spyOn(mod.db.Collection.prototype, 'modify').mockImplementation(function (...args) {
      calls += 1;
      if (calls === 2) return Promise.reject(new Error('falha simulada na migração'));
      return realModify.apply(this, args);
    });
    await mod.initDatabase();
    spy.mockRestore();

    expect(calls).toBe(2);
    expect(mod.dbStatus.state).toBe('error');
    const { getRawDatabaseVersion } = await import('../src/services/dbBackup.js');
    expect(await getRawDatabaseVersion(DB_NAME)).toBe(80); // rollback para v8

    const check = new Dexie(DB_NAME);
    check.version(8).stores(V8_SCHEMA);
    await check.open();
    expect(await check.dailyWords.get('word_A1_0')).toMatchObject({ reviewCount: 7 });
    // a alteração do 1º modify também foi desfeita (transação atômica)
    expect((await check.dailyWords.get('custom_1')).reviewDates).toBeUndefined();
    expect(await check.errorLogs.count()).toBe(1);
    check.close();
  });

  it('retryDatabaseOpen permite nova tentativa depois de uma falha', async () => {
    await seedLegacyV8();
    vi.doMock('../src/services/dbBackup.js', async (importOriginal) => {
      const actual = await importOriginal();
      let first = true;
      return {
        ...actual,
        createSnapshot: vi.fn(async (...args) => {
          if (first) {
            first = false;
            throw new Error('falha transitória');
          }
          return actual.createSnapshot(...args);
        })
      };
    });
    const mod = await import('../src/services/db.js');
    openedDb = mod.db;
    await mod.initDatabase();
    expect(mod.dbStatus.state).toBe('error');

    await mod.retryDatabaseOpen();
    expect(mod.dbStatus.state).toBe('ready');
    expect(mod.db.verno).toBe(9);
    vi.doUnmock('../src/services/dbBackup.js');
  });
});
