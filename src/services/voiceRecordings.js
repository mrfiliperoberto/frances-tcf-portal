import { db, ensureDbOpen } from './db';

/** Gravações mais curtas que isso são tratadas como clique acidental e não são salvas. */
export const MIN_RECORDING_SECONDS = 0.5;
export const PRONUNCIATION_LIBRARY_SOURCE = 'pronunciationLibrary';

async function blobToArrayBuffer(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Response(blob).arrayBuffer();
}

/** "25/11/2026 às 23:14" no fuso local do aparelho. */
export function formatRecordingDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} às ${time}`;
}

/** Recria um Blob tocável a partir de um registro salvo. */
export function recordingToBlob(recording) {
  if (!recording?.audio) return null;
  return new Blob([recording.audio], { type: recording.mimeType || 'audio/webm' });
}

/**
 * Salva uma gravação com data e hora. Retorna o registro salvo (com `id`) ou `null` quando a
 * gravação é vazia ou curta demais (< MIN_RECORDING_SECONDS).
 *
 * O áudio é guardado como ArrayBuffer (mais portátil entre navegadores do que Blob no IndexedDB).
 */
export async function saveVoiceRecording({
  wordId,
  word,
  blob,
  mimeType,
  durationSec,
  source = PRONUNCIATION_LIBRARY_SOURCE,
  recordedAt = new Date()
}) {
  if (wordId === undefined || wordId === null || wordId === '') {
    throw new Error('saveVoiceRecording: wordId é obrigatório.');
  }
  if (!blob || !blob.size) return null;
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration < MIN_RECORDING_SECONDS) return null;

  const audio = await blobToArrayBuffer(blob);
  const record = {
    wordId: String(wordId),
    word: word || '',
    source,
    recordedAt: new Date(recordedAt).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    durationSec: Math.round(duration * 10) / 10,
    mimeType: mimeType || blob.type || 'audio/webm',
    size: audio.byteLength,
    audio,
    evaluation: null
  };

  await ensureDbOpen();
  const id = await db.voiceRecordings.add(record);
  return { ...record, id };
}

/** Gravações de uma palavra, da mais recente para a mais antiga. */
export async function getRecordingsForWord(wordId) {
  await ensureDbOpen();
  const rows = await db.voiceRecordings.where('wordId').equals(String(wordId)).toArray();
  return rows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/** Todas as gravações, da mais antiga para a mais recente (usado na exportação .zip). */
export async function getAllRecordings() {
  await ensureDbOpen();
  return db.voiceRecordings.orderBy('recordedAt').toArray();
}

/** Mapa wordId → quantidade de gravações salvas (lê só o índice, sem carregar os áudios). */
export async function countRecordingsByWord() {
  await ensureDbOpen();
  const counts = new Map();
  const keys = await db.voiceRecordings.orderBy('wordId').keys();
  keys.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  return counts;
}

/** Anexa a avaliação do Gemini (nota 0-100 + dica) a uma gravação já salva. */
export async function setRecordingEvaluation(id, { score, feedback = '' } = {}) {
  await ensureDbOpen();
  const numericScore = Number(score);
  const evaluation = {
    score: Number.isFinite(numericScore) ? numericScore : null,
    feedback: typeof feedback === 'string' ? feedback : '',
    evaluatedAt: new Date().toISOString()
  };
  const updated = await db.voiceRecordings.update(id, { evaluation });
  return updated ? evaluation : null;
}

export async function deleteVoiceRecording(id) {
  await ensureDbOpen();
  await db.voiceRecordings.delete(id);
}

/**
 * Pede ao navegador armazenamento persistente para que os áudios não sejam apagados
 * automaticamente sob pressão de espaço. Retorna true/false, ou null se não houver suporte.
 */
export async function requestPersistentStorage() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
