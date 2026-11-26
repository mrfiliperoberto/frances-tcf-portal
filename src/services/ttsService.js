/**
 * Shared French text-to-speech service.
 *
 * Strategy per call to `playFrench`:
 * 1. Primary: Google Translate TTS (fr-CA) through the local `/__tts` proxy, played on a
 *    single shared HTMLAudioElement. Requesting translate.google.com directly from the
 *    page is blocked by Chrome (ORB/CORS), so the proxy is mandatory.
 * 2. Fallback: window.speechSynthesis with an fr-CA voice, then any fr-* voice, else lang fr-FR.
 *    Used when the audio element errors, `play()` rejects, or the response is not audio
 *    (e.g. on static hosting where `/__tts` falls through to index.html).
 *
 * Long texts are split into chunks of at most MAX_CHUNK_LENGTH characters (Google TTS
 * rejects long `q` values and Chrome's speechSynthesis cuts off long utterances).
 */

export const MAX_CHUNK_LENGTH = 180;
const SPEAK_AFTER_CANCEL_DELAY_MS = 40;

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

/** Strips HTML tags and [phonetic] brackets, collapses whitespace. */
export function cleanSpeechText(text) {
  return String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function packPieces(pieces, maxLength) {
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitOversized(piece, maxLength) {
  if (piece.length <= maxLength) return [piece];
  // 1) comma / semicolon / colon boundaries
  const clauses = piece.split(/(?<=[,;:])\s+/).filter(Boolean);
  const byClause = clauses.length > 1 ? packPieces(clauses, maxLength) : clauses;
  // 2) any clause still too long: word boundaries (hard cut only for a single giant word)
  return byClause.flatMap((clause) => {
    if (clause.length <= maxLength) return [clause];
    const words = clause.split(/\s+/).flatMap((w) =>
      w.length <= maxLength ? [w] : w.match(new RegExp(`.{1,${maxLength}}`, 'g'))
    );
    return packPieces(words, maxLength);
  });
}

/** Splits text into chunks <= maxLength, preferring sentence, then comma boundaries. */
export function splitIntoChunks(text, maxLength = MAX_CHUNK_LENGTH) {
  const clean = cleanSpeechText(text);
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];
  const sentences = clean.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const pieces = sentences.flatMap((s) => splitOversized(s, maxLength));
  return packPieces(pieces, maxLength);
}

export function buildGoogleTtsUrl(text, lang = 'fr-CA') {
  return (
    'https://translate.google.com/translate_tts?ie=UTF-8&q=' +
    encodeURIComponent(text) +
    `&tl=${encodeURIComponent(lang)}&client=tw-ob`
  );
}

/**
 * For a Google Translate TTS URL returns its text (`q`, possibly ''); for any other or invalid
 * URL returns null. Lets seed data that stores Google TTS URLs go through playFrench.
 */
export function extractGoogleTtsText(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'translate.google.com' && parsed.pathname === '/translate_tts') {
      return parsed.searchParams.get('q') || '';
    }
  } catch {
    // relative or invalid URL: not Google TTS
  }
  return null;
}

export function buildProxyTtsUrl(text, lang = 'fr-CA') {
  return `/__tts?url=${encodeURIComponent(buildGoogleTtsUrl(text, lang))}`;
}

/* ------------------------------------------------------------------ */
/* speechSynthesis (shared with useFrenchAudio)                        */
/* ------------------------------------------------------------------ */

export function hasSpeechSynthesis() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** fr-CA voice first, then any French voice, else null. */
export function selectFrenchVoice(voices) {
  const list =
    Array.isArray(voices) && voices.length > 0
      ? voices
      : hasSpeechSynthesis()
        ? window.speechSynthesis.getVoices()
        : [];
  const lang = (v) => (v?.lang || '').toLowerCase();
  return (
    list.find((v) => lang(v).includes('fr-ca') || lang(v).includes('fr_ca')) ||
    list.find((v) => lang(v).startsWith('fr')) ||
    null
  );
}

let speakTimeout = null;
let currentUtterance = null; // keeps a reference so Chrome/Edge don't garbage-collect it mid-speech

/**
 * Speaks one utterance with a French voice. Cancels anything already speaking; on
 * Windows Chrome/Edge calling speak() in the same tick as cancel() drops the new
 * utterance, so it waits SPEAK_AFTER_CANCEL_DELAY_MS in that case.
 * Returns false when speechSynthesis is unavailable or the text is empty.
 */
export function speakWithSynthesis(text, { rate = 0.94, voices, onStart, onEnd, onError } = {}) {
  if (!hasSpeechSynthesis()) return false;
  const clean = cleanSpeechText(text);
  if (!clean) return false;

  if (speakTimeout) {
    clearTimeout(speakTimeout);
    speakTimeout = null;
  }

  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;
  if (wasBusy) synth.cancel();
  if (synth.paused) synth.resume();

  const start = () => {
    speakTimeout = null;
    const utterance = new SpeechSynthesisUtterance(clean);
    currentUtterance = utterance;

    const voice = selectFrenchVoice(voices);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang; // must match the selected voice on Windows SAPI
    } else {
      utterance.lang = 'fr-FR';
    }
    utterance.rate = rate;
    utterance.volume = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      if (currentUtterance === utterance) currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (event) => {
      if (currentUtterance === utterance) currentUtterance = null;
      onError?.(event);
    };
    synth.speak(utterance);
  };

  if (wasBusy) {
    speakTimeout = setTimeout(start, SPEAK_AFTER_CANCEL_DELAY_MS);
  } else {
    start();
  }
  return true;
}

export function cancelSynthesis() {
  if (speakTimeout) {
    clearTimeout(speakTimeout);
    speakTimeout = null;
  }
  currentUtterance = null;
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
}

/* ------------------------------------------------------------------ */
/* Playback session                                                    */
/* ------------------------------------------------------------------ */

let sharedAudio = null;
let activeSession = null;

function getSharedAudio() {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

function describeMediaError(audio) {
  const codes = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED (response is not audio or /__tts is unavailable)'
  };
  const err = audio?.error;
  if (!err) return 'unknown media error';
  return `${codes[err.code] || `code ${err.code}`}${err.message ? `: ${err.message}` : ''}`;
}

/** Plays one chunk through the proxy. Resolves on end (or cancel), rejects on failure. */
function playProxyChunk(text, session) {
  return new Promise((resolve, reject) => {
    const audio = getSharedAudio();
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      session.settleCurrent = null;
    };
    session.settleCurrent = () => {
      cleanup();
      resolve();
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error(`Proxy audio failed: ${describeMediaError(audio)}`));
    };
    audio.src = buildProxyTtsUrl(text);
    audio.playbackRate = 1;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (session.cancelled) return;
        cleanup();
        reject(new Error(`audio.play() rejected: ${err?.name || 'Error'}: ${err?.message || err}`));
      });
    }
  });
}

/** Speaks one chunk with speechSynthesis. Resolves on end (or cancel), rejects on failure. */
function speakChunk(text, rate, session) {
  return new Promise((resolve, reject) => {
    session.settleCurrent = () => {
      session.settleCurrent = null;
      resolve();
    };
    const started = speakWithSynthesis(text, {
      rate,
      onEnd: () => {
        session.settleCurrent = null;
        resolve();
      },
      onError: (event) => {
        session.settleCurrent = null;
        // 'interrupted' / 'canceled' come from stopFrench() or a newer playFrench(): not a failure
        if (session.cancelled || event?.error === 'interrupted' || event?.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`speechSynthesis error: ${event?.error || 'unknown'}`));
        }
      }
    });
    if (!started) {
      session.settleCurrent = null;
      reject(new Error('speechSynthesis is not available in this browser.'));
    }
  });
}

/** Stops any French playback started by playFrench (and pending speechSynthesis). */
export function stopFrench() {
  if (activeSession) {
    activeSession.cancelled = true;
    activeSession.settleCurrent?.();
    activeSession = null;
  }
  if (sharedAudio) {
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
    sharedAudio.pause();
    sharedAudio.removeAttribute('src');
    try {
      sharedAudio.load();
    } catch {
      // ignore: some browsers throw when loading an empty source
    }
  }
  cancelSynthesis();
}

/**
 * Plays French text. Resolves `{ source: 'proxy' | 'speech', cancelled }` when playback
 * ends (or is stopped by stopFrench / a newer playFrench call). Rejects only if both the
 * proxy audio and speechSynthesis fail. `rate` applies to speechSynthesis.
 */
export async function playFrench(text, { rate = 0.94 } = {}) {
  stopFrench();
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) return { source: null, cancelled: false };

  const session = { cancelled: false, settleCurrent: null };
  activeSession = session;
  const finish = (source) => {
    if (activeSession === session) activeSession = null;
    return { source, cancelled: session.cancelled };
  };

  let index = 0;
  let proxyError = null;
  try {
    for (; index < chunks.length; index += 1) {
      if (session.cancelled) return finish('proxy');
      await playProxyChunk(chunks[index], session);
    }
    return finish('proxy');
  } catch (err) {
    proxyError = err;
  }

  if (session.cancelled) return finish('proxy');
  console.warn('[TTS] Proxy playback failed, falling back to speechSynthesis:', proxyError.message);

  try {
    for (; index < chunks.length; index += 1) {
      if (session.cancelled) return finish('speech');
      await speakChunk(chunks[index], rate, session);
    }
    return finish('speech');
  } catch (speechError) {
    if (activeSession === session) activeSession = null;
    const error = new Error(
      `French audio playback failed. Proxy: ${proxyError.message} | Speech: ${speechError.message}`
    );
    error.proxyError = proxyError;
    error.speechError = speechError;
    console.error('[TTS]', error.message);
    throw error;
  }
}
