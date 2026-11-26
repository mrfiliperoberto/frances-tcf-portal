import { createZip } from './zipWriter';
import { getAllRecordings } from './voiceRecordings';

const pad = (n) => String(n).padStart(2, '0');

/** Local date/time parts of an ISO timestamp: { date: '2026-11-25', time: '23:14:05' }. */
export function localDateParts(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  };
}

/** "Être à l'heure" → "etre-a-l-heure" (safe for file names on every OS). */
export function slugifyWord(word) {
  const slug = String(word || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'palavra';
}

export function extensionForMime(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg')) return 'mp3';
  return 'bin';
}

/** "abandonner/abandonner_2026-11-25_23-14-05.webm" (one folder per word). */
export function buildRecordingFileName(recording) {
  const slug = slugifyWord(recording.word || recording.wordId);
  const { date, time } = localDateParts(recording.recordedAt);
  const stamp = date ? `${date}_${time.replace(/:/g, '-')}` : `id-${recording.id}`;
  return `${slug}/${slug}_${stamp}.${extensionForMime(recording.mimeType)}`;
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Index of the recordings for spreadsheet analysis. Semicolon-separated with a UTF-8 BOM,
 * so Excel in Portuguese opens it with the right columns and accents.
 */
export function buildRecordingsCsv(rows) {
  const header = ['arquivo', 'palavra', 'data', 'hora', 'data_hora_iso_utc', 'fuso', 'duracao_s', 'nota_gemini', 'dica_gemini'];
  const lines = rows.map(({ fileName, recording }) => {
    const { date, time } = localDateParts(recording.recordedAt);
    const score = recording.evaluation?.score;
    return [
      fileName,
      recording.word,
      date,
      time,
      recording.recordedAt,
      recording.timeZone || '',
      Number.isFinite(recording.durationSec) ? String(recording.durationSec).replace('.', ',') : '',
      Number.isFinite(score) ? score : '',
      recording.evaluation?.feedback || ''
    ]
      .map(csvCell)
      .join(';');
  });
  return `﻿${[header.join(';'), ...lines].join('\r\n')}\r\n`;
}

/**
 * Builds the .zip with every saved recording (one folder per word) and gravacoes.csv.
 * Returns { bytes, count } or null when there are no recordings.
 */
export async function buildRecordingsZip(recordings) {
  const list = recordings ?? (await getAllRecordings());
  const withAudio = list.filter((r) => r?.audio && r.audio.byteLength > 0);
  if (withAudio.length === 0) return null;

  const usedNames = new Set();
  const rows = withAudio.map((recording) => {
    let fileName = buildRecordingFileName(recording);
    if (usedNames.has(fileName)) fileName = fileName.replace(/(\.[a-z0-9]+)$/, `_${recording.id}$1`);
    usedNames.add(fileName);
    return { fileName, recording };
  });

  const files = rows.map(({ fileName, recording }) => ({
    name: fileName,
    data: recording.audio,
    date: new Date(recording.recordedAt)
  }));
  files.push({ name: 'gravacoes.csv', data: buildRecordingsCsv(rows), date: new Date() });
  return { bytes: createZip(files), count: withAudio.length };
}

/** Builds the .zip and triggers the download. Returns how many recordings were exported. */
export async function downloadRecordingsZip() {
  const result = await buildRecordingsZip();
  if (!result) return 0;
  const blob = new Blob([result.bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const { date } = localDateParts(new Date().toISOString());
  const a = document.createElement('a');
  a.href = url;
  a.download = `gravacoes-pronuncia-${date}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return result.count;
}
