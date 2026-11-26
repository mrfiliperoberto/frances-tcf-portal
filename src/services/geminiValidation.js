/**
 * Validação defensiva das respostas estruturadas (JSON) do Gemini.
 *
 * O `responseSchema` orienta o modelo, mas não garante o formato: a resposta pode vir
 * truncada, com campos ausentes, tipos trocados ou envolta em ```json```.
 * Cada normalizador:
 * - lança `GeminiResponseError` quando faltam campos essenciais (a UI cai no tratamento de erro);
 * - converte tipos e aplica defaults seguros para campos opcionais;
 * - descarta campos desconhecidos.
 */

export class GeminiResponseError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'GeminiResponseError';
    this.details = details;
  }
}

const MAX_TEXT = 20000;

function str(value, fallback = '') {
  if (typeof value === 'string') return value.slice(0, MAX_TEXT);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function requiredStr(obj, key, context) {
  const v = str(obj?.[key]).trim();
  if (!v) throw new GeminiResponseError(`Resposta do Gemini sem o campo obrigatório "${key}" (${context}).`);
  return v;
}

function strArray(value, max = 20) {
  if (Array.isArray(value)) return value.map((v) => str(v)).filter(Boolean).slice(0, max);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function intInRange(value, min, max, fallback = null) {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function corrections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c) => c && typeof c === 'object')
    .map((c) => ({
      original: str(c.original),
      corrected: str(c.corrected),
      explanation: str(c.explanation)
    }))
    .filter((c) => c.original || c.corrected)
    .slice(0, 10);
}

/** Extrai o texto da primeira parte da primeira candidata. */
export function extractCandidateText(apiResult) {
  const parts = apiResult?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

/** Faz o parse do JSON tolerando cercas ```json``` e texto ao redor do objeto. */
export function parseJsonLoose(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new GeminiResponseError('Resposta do Gemini vazia.');
  }
  let text = rawText.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // cai no erro abaixo
      }
    }
    throw new GeminiResponseError('Resposta do Gemini não é um JSON válido (possivelmente truncada).');
  }
}

function ensureObject(parsed, context) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GeminiResponseError(`Resposta do Gemini em formato inesperado (${context}).`);
  }
  return parsed;
}

/* ---------- Normalizadores por funcionalidade ---------- */

export function normalizeCamilleAudio(parsed) {
  const o = ensureObject(parsed, 'conversa por áudio');
  const replyText = str(o.replyText).trim();
  if (!replyText) throw new GeminiResponseError('Resposta do Gemini sem "replyText" (conversa por áudio).');
  return {
    transcription: str(o.userTranscription).trim() || str(o.transcription).trim() || '[Áudio gravado]',
    replyText,
    phoneticTip: str(o.phoneticTip)
  };
}

export function normalizeTCFOral(parsed) {
  const o = ensureObject(parsed, 'avaliação oral');
  const pa = o.phoneticAnalysis && typeof o.phoneticAnalysis === 'object' ? o.phoneticAnalysis : {};
  return {
    transcription: str(o.userTranscription).trim() || str(o.transcription).trim() || '[Áudio gravado]',
    score20: requiredStr(o, 'score20', 'avaliação oral'),
    nclcLevel: requiredStr(o, 'nclcLevel', 'avaliação oral'),
    cefrLevel: str(o.cefrLevel, '—') || '—',
    phoneticAnalysis: {
      nasalVowels: str(pa.nasalVowels),
      liaisonsAndElisions: str(pa.liaisonsAndElisions),
      rhythmAndIntonation: str(pa.rhythmAndIntonation),
      uvularR: str(pa.uvularR),
      pronunciationScore: intInRange(pa.pronunciationScore, 0, 100, 0)
    },
    strengths: strArray(o.strengths, 10),
    corrections: corrections(o.corrections),
    upgradedResponse: str(o.upgradedResponse)
  };
}

export function normalizeTCFWritten(parsed) {
  const o = ensureObject(parsed, 'avaliação escrita');
  // `strengths` é exibido como texto corrido nesta tela; aceita array e junta.
  const strengths = Array.isArray(o.strengths) ? strArray(o.strengths).join(' ') : str(o.strengths);
  return {
    scoreOutOf20: requiredStr(o, 'scoreOutOf20', 'avaliação escrita'),
    nclcLevel: requiredStr(o, 'nclcLevel', 'avaliação escrita'),
    cefrLevel: str(o.cefrLevel, '—') || '—',
    strengths,
    corrections: corrections(o.corrections),
    upgradedVersionB2: str(o.upgradedVersionB2)
  };
}

const OPTION_IDS = ['A', 'B', 'C', 'D'];

function normalizeMcq(o, context) {
  const rawOptions = Array.isArray(o.options) ? o.options : [];
  const options = rawOptions
    .filter((opt) => opt && typeof opt === 'object')
    .map((opt, idx) => ({
      id: str(opt.id).trim().toUpperCase().slice(0, 1) || OPTION_IDS[idx],
      text: str(opt.text).trim()
    }))
    .filter((opt) => opt.text);

  const ids = options.map((opt) => opt.id);
  const validIds = options.length === 4 && OPTION_IDS.every((id) => ids.includes(id));
  if (!validIds) {
    throw new GeminiResponseError(`Questão do Gemini com alternativas inválidas (${context}): esperadas A, B, C e D.`);
  }
  options.sort((a, b) => a.id.localeCompare(b.id));

  const correctOption = str(o.correctOption).trim().toUpperCase().slice(0, 1);
  if (!OPTION_IDS.includes(correctOption)) {
    throw new GeminiResponseError(`Questão do Gemini sem alternativa correta válida (${context}).`);
  }

  const kv = o.keyVocabulary && typeof o.keyVocabulary === 'object' ? o.keyVocabulary : {};
  return {
    question: requiredStr(o, 'question', context),
    options,
    correctOption,
    explanation: str(o.explanation),
    keyVocabulary: {
      french: str(kv.french),
      portuguese: str(kv.portuguese),
      example: str(kv.example)
    }
  };
}

export function normalizeListeningQuestion(parsed, requestedLevel) {
  const o = ensureObject(parsed, 'Compréhension Orale');
  return {
    level: str(o.level).trim() || requestedLevel,
    context: str(o.context),
    audioScript: requiredStr(o, 'audioScript', 'Compréhension Orale'),
    ...normalizeMcq(o, 'Compréhension Orale')
  };
}

export function normalizeReadingQuestion(parsed, requestedLevel) {
  const o = ensureObject(parsed, 'Compréhension Écrite');
  return {
    level: str(o.level).trim() || requestedLevel,
    documentType: str(o.documentType),
    title: str(o.title),
    passage: requiredStr(o, 'passage', 'Compréhension Écrite'),
    ...normalizeMcq(o, 'Compréhension Écrite')
  };
}

export function normalizeShadowing(parsed) {
  const o = ensureObject(parsed, 'Shadowing');
  const score = intInRange(o.pronunciationScore, 0, 100, null);
  if (score === null) {
    throw new GeminiResponseError('Avaliação de Shadowing sem "pronunciationScore" numérico.');
  }
  return {
    pronunciationScore: score,
    spokenTranscription: str(o.spokenTranscription),
    surgicalFeedback: str(o.surgicalFeedback),
    specificCorrections: strArray(o.specificCorrections, 10),
    rhythmTip: str(o.rhythmTip)
  };
}
