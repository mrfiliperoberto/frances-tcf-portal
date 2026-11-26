import { describe, it, expect } from 'vitest';
import { createZip, crc32 } from '../src/services/zipWriter.js';
import {
  slugifyWord,
  extensionForMime,
  buildRecordingFileName,
  buildRecordingsCsv,
  buildRecordingsZip,
  localDateParts
} from '../src/services/recordingsExport.js';

/** Reads a stored-only ZIP through its central directory (what real unzip tools do). */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(ptr, true)).toBe(0x02014b50);
    const crc = view.getUint32(ptr + 16, true);
    const size = view.getUint32(ptr + 24, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const data = bytes.slice(start, start + size);
    expect(crc32(data)).toBe(crc);
    entries.push({ name, data });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

describe('zipWriter', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes a valid archive with UTF-8 names and exact contents', () => {
    const audio = new Uint8Array(5000).map((_, i) => i % 256);
    const zip = createZip([
      { name: 'être/être_2026-11-25.webm', data: audio, date: new Date(2026, 10, 25, 23, 14, 6) },
      { name: 'gravacoes.csv', data: 'a;b\r\n' }
    ]);
    const entries = readZip(zip);
    expect(entries.map((e) => e.name)).toEqual(['être/être_2026-11-25.webm', 'gravacoes.csv']);
    expect(entries[0].data).toEqual(audio);
    expect(new TextDecoder().decode(entries[1].data)).toBe('a;b\r\n');
  });

  it('writes an empty archive', () => {
    expect(readZip(createZip([]))).toEqual([]);
  });
});

describe('recordings export helpers', () => {
  it('slugifies words for file names', () => {
    expect(slugifyWord("Être à l'heure")).toBe('etre-a-l-heure');
    expect(slugifyWord('aujourd’hui (adv.)')).toBe('aujourd-hui-adv');
    expect(slugifyWord('')).toBe('palavra');
  });

  it('maps MIME types to extensions', () => {
    expect(extensionForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMime('audio/mp4')).toBe('m4a');
    expect(extensionForMime('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extensionForMime('')).toBe('bin');
  });

  it('names files by word and local date/time, one folder per word', () => {
    const iso = new Date(2026, 10, 25, 23, 14, 5).toISOString();
    expect(buildRecordingFileName({ id: 1, word: 'abandonner', recordedAt: iso, mimeType: 'audio/webm' })).toBe(
      'abandonner/abandonner_2026-11-25_23-14-05.webm'
    );
    expect(localDateParts(iso)).toEqual({ date: '2026-11-25', time: '23:14:05' });
  });

  it('builds a semicolon CSV with BOM, escaping and Gemini data', () => {
    const iso = new Date(2026, 10, 25, 23, 14, 5).toISOString();
    const csv = buildRecordingsCsv([
      {
        fileName: 'a/a.webm',
        recording: {
          word: 'abandonner',
          recordedAt: iso,
          timeZone: 'America/Sao_Paulo',
          durationSec: 2.1,
          evaluation: { score: 78, feedback: 'R uvular; bom "ritmo"' }
        }
      },
      { fileName: 'b/b.webm', recording: { word: 'bonjour', recordedAt: iso, durationSec: 1, evaluation: null } }
    ]);
    expect(csv.startsWith('﻿arquivo;palavra;data;hora;')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      `a/a.webm;abandonner;2026-11-25;23:14:05;${iso};America/Sao_Paulo;2,1;78;"R uvular; bom ""ritmo"""`
    );
    expect(lines[2].endsWith(';1;;')).toBe(true);
  });
});

describe('buildRecordingsZip', () => {
  it('returns null when there are no recordings', async () => {
    expect(await buildRecordingsZip([])).toBeNull();
  });

  it('exports every saved recording plus gravacoes.csv, from the database', async () => {
    const dbMod = await import('../src/services/db.js');
    await dbMod.initDatabase();
    const rec = await import('../src/services/voiceRecordings.js');
    const at = new Date(2026, 10, 25, 23, 14, 5);
    const bytes = new Uint8Array([9, 8, 7, 6]);
    await rec.saveVoiceRecording({ wordId: 'a', word: 'abandonner', blob: new Blob([bytes]), mimeType: 'audio/webm', durationSec: 1, recordedAt: at });
    // same word, same second: second file gets the id appended instead of overwriting
    await rec.saveVoiceRecording({ wordId: 'a', word: 'abandonner', blob: new Blob([bytes]), mimeType: 'audio/webm', durationSec: 1, recordedAt: at });

    // Imported here (not at the top) so it shares the db module instance of this test.
    const { buildRecordingsZip: buildFromDb } = await import('../src/services/recordingsExport.js');
    const result = await buildFromDb();
    expect(result.count).toBe(2);
    const entries = readZip(result.bytes);
    const names = entries.map((e) => e.name);
    expect(names).toHaveLength(3);
    expect(names[0]).toBe('abandonner/abandonner_2026-11-25_23-14-05.webm');
    expect(names[1]).toMatch(/^abandonner\/abandonner_2026-11-25_23-14-05_\d+\.webm$/);
    expect(names[2]).toBe('gravacoes.csv');
    expect(Array.from(entries[0].data)).toEqual([9, 8, 7, 6]);
    expect(new TextDecoder().decode(entries[2].data)).toContain('abandonner');
    dbMod.db.close();
  });
});
