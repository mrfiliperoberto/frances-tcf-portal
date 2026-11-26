import { describe, it, expect, vi } from 'vitest';

const makeBlob = (bytes = 2048, type = 'audio/webm;codecs=opus') =>
  new Blob([new Uint8Array(bytes).fill(7)], { type });

async function loadModules() {
  const dbMod = await import('../src/services/db.js');
  await dbMod.initDatabase();
  const rec = await import('../src/services/voiceRecordings.js');
  return { dbMod, rec };
}

describe('voiceRecordings service', () => {
  it('saves a recording with timestamp, duration and playable audio', async () => {
    const { dbMod, rec } = await loadModules();
    const recordedAt = new Date('2026-11-25T23:14:05.000Z');
    const saved = await rec.saveVoiceRecording({
      wordId: 'dict_200',
      word: 'abandonner',
      blob: makeBlob(),
      mimeType: 'audio/webm;codecs=opus',
      durationSec: 2.14,
      recordedAt
    });

    expect(saved.id).toBeDefined();
    expect(saved.recordedAt).toBe('2026-11-25T23:14:05.000Z');
    expect(saved.durationSec).toBe(2.1);
    expect(saved.size).toBe(2048);
    expect(saved.evaluation).toBeNull();

    const [stored] = await rec.getRecordingsForWord('dict_200');
    expect(stored.word).toBe('abandonner');
    expect(stored.source).toBe('pronunciationLibrary');
    const blob = rec.recordingToBlob(stored);
    expect(blob.type).toBe('audio/webm;codecs=opus');
    expect(blob.size).toBe(2048);
    expect(new Uint8Array(await blob.arrayBuffer())[0]).toBe(7);
    dbMod.db.close();
  });

  it('ignores empty or accidental (< 0.5 s) recordings', async () => {
    const { dbMod, rec } = await loadModules();
    expect(await rec.saveVoiceRecording({ wordId: 'w', blob: makeBlob(), durationSec: 0.3 })).toBeNull();
    expect(await rec.saveVoiceRecording({ wordId: 'w', blob: makeBlob(0), durationSec: 2 })).toBeNull();
    expect(await rec.saveVoiceRecording({ wordId: 'w', blob: null, durationSec: 2 })).toBeNull();
    expect(await dbMod.db.voiceRecordings.count()).toBe(0);
    dbMod.db.close();
  });

  it('requires a wordId', async () => {
    const { dbMod, rec } = await loadModules();
    await expect(rec.saveVoiceRecording({ blob: makeBlob(), durationSec: 1 })).rejects.toThrow(/wordId/);
    dbMod.db.close();
  });

  it('lists recordings newest first and counts them per word', async () => {
    const { dbMod, rec } = await loadModules();
    const save = (wordId, iso) =>
      rec.saveVoiceRecording({ wordId, word: wordId, blob: makeBlob(), durationSec: 1, recordedAt: new Date(iso) });
    await save('a', '2026-11-01T10:00:00Z');
    await save('a', '2026-11-20T10:00:00Z');
    await save('a', '2026-11-10T10:00:00Z');
    await save('b', '2026-11-05T10:00:00Z');

    const list = await rec.getRecordingsForWord('a');
    expect(list.map((r) => r.recordedAt)).toEqual([
      '2026-11-20T10:00:00.000Z',
      '2026-11-10T10:00:00.000Z',
      '2026-11-01T10:00:00.000Z'
    ]);
    const counts = await rec.countRecordingsByWord();
    expect(counts.get('a')).toBe(3);
    expect(counts.get('b')).toBe(1);
    expect(counts.get('c')).toBeUndefined();
    dbMod.db.close();
  });

  it('stores numeric word ids as strings so lookups match', async () => {
    const { dbMod, rec } = await loadModules();
    await rec.saveVoiceRecording({ wordId: 42, blob: makeBlob(), durationSec: 1 });
    expect(await rec.getRecordingsForWord(42)).toHaveLength(1);
    expect((await rec.countRecordingsByWord()).get('42')).toBe(1);
    dbMod.db.close();
  });

  it('attaches a Gemini evaluation and deletes a recording (count goes down)', async () => {
    const { dbMod, rec } = await loadModules();
    const first = await rec.saveVoiceRecording({ wordId: 'a', blob: makeBlob(), durationSec: 1 });
    await rec.saveVoiceRecording({ wordId: 'a', blob: makeBlob(), durationSec: 1 });

    const evaluation = await rec.setRecordingEvaluation(first.id, { score: '78', feedback: 'Bom R uvular.' });
    expect(evaluation.score).toBe(78);
    const stored = await dbMod.db.voiceRecordings.get(first.id);
    expect(stored.evaluation).toMatchObject({ score: 78, feedback: 'Bom R uvular.' });
    expect(stored.evaluation.evaluatedAt).toBeTruthy();

    await rec.deleteVoiceRecording(first.id);
    expect((await rec.countRecordingsByWord()).get('a')).toBe(1);
    dbMod.db.close();
  });

  it('recordings survive a reload (F5)', async () => {
    let { dbMod, rec } = await loadModules();
    await rec.saveVoiceRecording({ wordId: 'a', blob: makeBlob(), durationSec: 1.5 });
    dbMod.db.close();
    vi.resetModules();
    ({ dbMod, rec } = await loadModules());
    expect(await rec.getRecordingsForWord('a')).toHaveLength(1);
    dbMod.db.close();
  });

  it('formats the recording date and time in pt-BR', async () => {
    const rec = await import('../src/services/voiceRecordings.js');
    expect(rec.formatRecordingDateTime('2026-11-25T23:14:05.000Z')).toMatch(
      /^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/
    );
    expect(rec.formatRecordingDateTime('not a date')).toBe('');
  });

  it('requestPersistentStorage returns null without support and the browser answer otherwise', async () => {
    const rec = await import('../src/services/voiceRecordings.js');
    vi.stubGlobal('navigator', {});
    expect(await rec.requestPersistentStorage()).toBeNull();
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist: async () => true } });
    expect(await rec.requestPersistentStorage()).toBe(true);
    vi.unstubAllGlobals();
  });
});
