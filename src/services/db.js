import Dexie from 'dexie';
import { INITIAL_FLASHCARDS } from '../data/initialFlashcards';
import { DAILY_DICTIONARY_SEED } from '../data/dailyDictionarySeed';
import { PRONUNCIATION_DICT } from '../data/pronunciationDict';
import { CARTOON_SPRINTS_SEED } from '../data/cartoonSeed';
import { LITTLE_PRINCE_SEED } from '../data/littlePrinceSeed';
import { VIDEO_LESSON_SEED } from '../data/videoLessonSeed';
import {
  calculateSM2,
  isCardDue,
  SM2_DEFAULTS,
  formatDateYYYYMMDD,
  generateReviewDates15_30_45
} from './sm2Algorithm';

export const db = new Dexie('ZeroAoCanadaDB');

db.version(1).stores({
  flashcards: '++id, category, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc'
});

db.version(2).stores({
  flashcards: '++id, category, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, palavra, nivel, pronuncia_audio_url, frase_exemplo, frase_audio_url, video_youtube_id, imagem_url, estudado, proxima_revisao'
});

db.version(3).stores({
  flashcards: '++id, category, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, palavra, nivel, pronuncia_audio_url, frase_exemplo, frase_audio_url, video_youtube_id, imagem_url, estudado, proxima_revisao',
  cartoonEpisodes: '++id, title, youtube_id, season, episode',
  cartoonSummaries: '++id, episode_id, date, summary_text'
});

db.version(4).stores({
  flashcards: '++id, category, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, palavra, nivel, pronuncia_audio_url, frase_exemplo, frase_audio_url, video_youtube_id, imagem_url, estudado, proxima_revisao',
  cartoonEpisodes: '++id, title, youtube_id, season, episode',
  cartoonSummaries: '++id, episode_id, date, summary_text',
  guidedReading: '++id, book_title, chapter, stanzas, audio_url, is_completed'
});

db.version(5).stores({
  flashcards: '++id, category, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, palavra, nivel, pronuncia_audio_url, frase_exemplo, frase_audio_url, video_youtube_id, imagem_url, estudado, proxima_revisao',
  cartoonEpisodes: '++id, title, youtube_id, season, episode',
  cartoonSummaries: '++id, episode_id, date, summary_text',
  guidedReading: '++id, book_title, chapter, stanzas, audio_url, is_completed',
  videoLessons: '++id, title, youtube_id, level, topic',
  studySessions: '++id, date, notebook_photo_data_url, is_completed'
});

db.version(6).stores({
  flashcards:
    '++id, category, studiedAt, *reviewDates, isMastered, nextReviewDate, repetition, interval, easeFactor, createdAt',
  errorLogs: '++id, date, source, original, corrected, explanation, flashcardId',
  tcfHistory: '++id, date, mode, score, nclc',
  dailyWords:
    '++id, palavra, nivel, pronuncia_audio_url, frase_exemplo, frase_audio_url, video_youtube_id, imagem_url, estudado, studiedAt, *reviewDates, isMastered, proxima_revisao',
  cartoonEpisodes: '++id, title, youtube_id, season, episode',
  cartoonSummaries: '++id, episode_id, date, summary_text',
  guidedReading: '++id, book_title, chapter, stanzas, audio_url, is_completed',
  videoLessons: '++id, title, youtube_id, level, topic',
  studySessions: '++id, date, notebook_photo_data_url, is_completed'
});

// Mantém ++id nas stores para evitar UpgradeError do IndexedDB ao atualizar versões anteriores
db.version(8).stores({
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
});

/**
 * Abre o banco de forma resiliente. Caso alguma migração anterior tenha gerado conflito de chave primária,
 * reconstrói automaticamente o schema para nunca travar a UI.
 */
async function ensureDbOpen() {
  if (db.isOpen()) return;
  try {
    await db.open();
  } catch (err) {
    console.warn('Recuperando schema do IndexedDB após conflito de versão:', err);
    try {
      await db.delete();
      await db.open();
    } catch (reopenErr) {
      console.error('Erro crítico ao reabrir IndexedDB:', reopenErr);
    }
  }
}

/**
 * Achata os episódios de CARTOON_SPRINTS_SEED para armazenamento na store cartoonEpisodes.
 */
function flattenCartoonSprints(sprints = CARTOON_SPRINTS_SEED) {
  if (!Array.isArray(sprints)) return [];
  return sprints.flatMap((sprint) =>
    (sprint.episodes || []).map((ep) => ({
      ...ep,
      sprintId: sprint.sprintId,
      level: sprint.level,
      theme: sprint.theme,
      sprintDays: sprint.days
    }))
  );
}

/**
 * Normaliza um item do DAILY_DICTIONARY_SEED garantindo que todos os campos default
 * (`isMastered: false`, `reviewDates: []`, `studiedAt: null`, `estudado: false`) estejam presentes.
 */
export function normalizeSeedWord(seedItem, existingRecord = null) {
  const word = seedItem.word || seedItem.palavra || '';
  const ipa = seedItem.ipa || seedItem.fonetica_ipa || '';
  const translation = seedItem.translation || seedItem.traducao || '';
  const level = seedItem.level || seedItem.nivel || 'A1';
  const category = seedItem.category || 'Essencial';
  const humanAudioUrl =
    seedItem.humanAudioUrl ||
    seedItem.pronuncia_audio_url ||
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=fr-CA&client=tw-ob`;

  const studiedAt = existingRecord?.studiedAt ?? null;
  const reviewDates = Array.isArray(existingRecord?.reviewDates)
    ? existingRecord.reviewDates
    : [];
  const isMastered = Boolean(existingRecord?.isMastered ?? seedItem.isMastered ?? false);
  const estudado = Boolean(existingRecord?.estudado || studiedAt || isMastered);
  const reviewCount = Number(existingRecord?.reviewCount ?? seedItem.reviewCount ?? 0);

  return {
    id: seedItem.id,
    word,
    ipa,
    translation,
    level,
    category,
    humanAudioUrl,
    reviewCount,
    // Aliases para compatibilidade total
    palavra: word,
    fonetica_ipa: ipa,
    traducao: translation,
    nivel: level,
    pronuncia_audio_url: humanAudioUrl,
    frase_exemplo:
      seedItem.frase_exemplo ||
      existingRecord?.frase_exemplo ||
      `Terme essentiel (${category}) : « ${word} » — ${translation}.`,
    frase_traducao:
      seedItem.frase_traducao ||
      existingRecord?.frase_traducao ||
      `Vocabulário ${level} (${category}): "${word}" significa "${translation}".`,
    frase_audio_url: humanAudioUrl,
    video_youtube_id:
      seedItem.video_youtube_id || existingRecord?.video_youtube_id || '_CfHjzWCRUU',
    video_start_seconds: Number(seedItem.video_start_seconds || 0),
    imagem_url:
      seedItem.imagem_url ||
      existingRecord?.imagem_url ||
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
    estudado,
    studiedAt,
    reviewDates,
    completedReviewDates: existingRecord?.completedReviewDates || [],
    isMastered,
    proxima_revisao: reviewDates[0] || null,
    ultima_revisao: existingRecord?.ultima_revisao || null
  };
}

/**
 * Força a sincronização do DAILY_DICTIONARY_SEED na store dailyWords.
 * Se `db.dailyWords.count() === 0` (ou se contiver apenas registos legados sem `level`/`word`),
 * realiza um `bulkPut` iterando sobre `DAILY_DICTIONARY_SEED` com `isMastered: false` e `reviewDates: []`.
 */
export async function syncDailyDictionarySeed() {
  try {
    await ensureDbOpen();
    const combinedSeed = [...DAILY_DICTIONARY_SEED, ...PRONUNCIATION_DICT];
    const count = await db.dailyWords.count();

    if (count === 0) {
      const initialRecords = combinedSeed.map((item) => ({
        ...normalizeSeedWord(item),
        reviewCount: Number(item.reviewCount ?? 0),
        isMastered: false,
        reviewDates: [],
        studiedAt: null,
        estudado: false
      }));
      await db.dailyWords.bulkPut(initialRecords);
      return initialRecords;
    }

    const existing = await db.dailyWords.toArray();
    const existingById = new Map();
    const existingByWord = new Map();

    existing.forEach((item) => {
      if (item.id !== undefined && item.id !== null) {
        existingById.set(String(item.id), item);
      }
      const key = (item.word || item.palavra || '').toLowerCase().trim();
      if (key && !existingByWord.has(key)) {
        existingByWord.set(key, item);
      }
    });

    const recordsToUpsert = [];
    const mergedRecords = combinedSeed.map((seedItem) => {
      const prevById = existingById.get(String(seedItem.id));
      const key = (seedItem.word || '').toLowerCase().trim();
      const prev = prevById || existingByWord.get(key) || null;
      const normalized = normalizeSeedWord(seedItem, prev);
      const record = {
        ...normalized,
        reviewCount: Number(prev?.reviewCount ?? seedItem.reviewCount ?? 0),
        isMastered: Boolean(normalized.isMastered ?? false),
        reviewDates: Array.isArray(normalized.reviewDates) ? normalized.reviewDates : []
      };
      if (!prevById || typeof prevById.reviewCount !== 'number') {
        recordsToUpsert.push(record);
      }
      return record;
    });

    if (recordsToUpsert.length > 0) {
      await db.dailyWords.bulkPut(recordsToUpsert);
    }

    return mergedRecords;
  } catch (err) {
    console.error('Erro em syncDailyDictionarySeed, retornando seed em memória:', err);
    return [...DAILY_DICTIONARY_SEED, ...PRONUNCIATION_DICT].map((item) => ({
      ...normalizeSeedWord(item),
      reviewCount: Number(item.reviewCount ?? 0),
      isMastered: false,
      reviewDates: [],
      studiedAt: null,
      estudado: false
    }));
  }
}

/**
 * Inicializa e popula o banco IndexedDB caso esteja vazio.
 */
export async function initDatabase() {
  try {
    await ensureDbOpen();

    // 1. Garante que o Dicionário Diário (dailyWords) seja populado imediatamente
    await syncDailyDictionarySeed();
    if ((await db.dailyWords.count()) === 0) {
      const fallbackSeed = DAILY_DICTIONARY_SEED.map((item) => ({
        ...normalizeSeedWord(item),
        isMastered: false,
        reviewDates: [],
        studiedAt: null,
        estudado: false
      }));
      await db.dailyWords.bulkPut(fallbackSeed);
    }

    // 2. Inicializa flashcards SM-2
    const cardsCount = await db.flashcards.count();
    if (cardsCount === 0) {
      let legacyCards = [];
      try {
        const saved =
          localStorage.getItem('zeroAoCanadaState_v2') ||
          localStorage.getItem('zeroAoCanadaState_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0) {
            legacyCards = parsed.flashcards;
          }
        }
      } catch (e) {
        console.warn('Falha ao ler dados legados do localStorage', e);
      }

      const seedSource = legacyCards.length > 0 ? legacyCards : INITIAL_FLASHCARDS;
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = formatDateYYYYMMDD(now);

      const seedRecords = seedSource.map((card) => ({
        category: card.category || 'Essencial TCF',
        front: card.front,
        back: card.back,
        phonetic: card.phonetic || '',
        example: card.example || card.tip || '',
        tip: card.tip || card.example || '',
        studiedAt: card.studiedAt || todayStr,
        reviewDates:
          Array.isArray(card.reviewDates) && card.reviewDates.length === 3
            ? card.reviewDates
            : generateReviewDates15_30_45(now),
        isMastered: Boolean(card.isMastered),
        repetition: card.repetition ?? 0,
        interval: card.interval ?? 15,
        easeFactor: card.easeFactor ?? SM2_DEFAULTS.easeFactor,
        nextReviewDate: card.nextReviewDate || nowIso,
        createdAt: card.createdAt || nowIso
      }));

      await db.flashcards.bulkAdd(seedRecords);
    }

    // 3. Inicializa histórico TCF se necessário
    const historyCount = await db.tcfHistory.count();
    if (historyCount === 0) {
      try {
        const saved =
          localStorage.getItem('zeroAoCanadaState_v2') ||
          localStorage.getItem('zeroAoCanadaState_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.tcfHistory) && parsed.tcfHistory.length > 0) {
            await db.tcfHistory.bulkAdd(parsed.tcfHistory);
          }
        }
      } catch {
        // noop
      }
    }

    // 4. Sincroniza os episódios de Sprints do Daily Cartoon (cartoonEpisodes)
    const cartoonCount = await db.cartoonEpisodes.count();
    if (cartoonCount === 0) {
      const flattenedEpisodes = flattenCartoonSprints(CARTOON_SPRINTS_SEED);
      await db.cartoonEpisodes.bulkPut(flattenedEpisodes);
    }

    // 5. Inicializa os capítulos da Leitura Guiada (guidedReading)
    const guidedCount = await db.guidedReading.count();
    if (guidedCount === 0) {
      await db.guidedReading.bulkPut(LITTLE_PRINCE_SEED);
    }

    // 6. Inicializa as videoaulas de gramática/técnica (videoLessons)
    const videoLessonsCount = await db.videoLessons.count();
    if (videoLessonsCount === 0) {
      await db.videoLessons.bulkPut(VIDEO_LESSON_SEED);
    }
  } catch (err) {
    console.error('Erro ao inicializar Dexie IndexedDB:', err);
  }
}

/**
 * Calcula em qual "Dia de Estudo" (Study Day) o utilizador está:
 * Conta o número de dias únicos na store `studySessions` em que houve estudo concluído e soma 1.
 */
export function calculateCurrentStudyDay(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return 1;
  }

  const uniqueCompletedDates = new Set(
    sessions
      .filter((s) => s && s.date && s.is_completed !== false)
      .map((s) => formatDateYYYYMMDD(new Date(s.date)))
  );

  return uniqueCompletedDates.size + 1;
}

/**
 * Consulta `studySessions` no IndexedDB e retorna `currentStudyDay`.
 */
export async function getCurrentStudyDay() {
  try {
    await ensureDbOpen();
    const sessions = await db.studySessions.toArray();
    return calculateCurrentStudyDay(sessions);
  } catch {
    return 1;
  }
}

/**
 * Retorna todos os flashcards ordenados por id.
 */
export async function getAllFlashcards() {
  await ensureDbOpen();
  return await db.flashcards.toArray();
}

/**
 * Retorna os flashcards que devem ser revisados hoje.
 */
export async function getDueFlashcards() {
  await ensureDbOpen();
  const all = await db.flashcards.toArray();
  return all.filter((c) => isCardDue(c));
}

/**
 * Adiciona um novo cartão no banco com agendamento estrito [15, 30, 45 dias].
 */
export async function addFlashcard(cardData) {
  await ensureDbOpen();
  const now = new Date();
  const nowIso = now.toISOString();
  const studiedAt = formatDateYYYYMMDD(now);
  const reviewDates = generateReviewDates15_30_45(now);

  const record = {
    category: cardData.category || 'Personalizado',
    front: cardData.front,
    back: cardData.back,
    phonetic: cardData.phonetic || '',
    example: cardData.example || cardData.tip || '',
    tip: cardData.tip || cardData.example || '',
    studiedAt,
    reviewDates,
    isMastered: false,
    repetition: 0,
    interval: 15,
    easeFactor: SM2_DEFAULTS.easeFactor,
    nextReviewDate: reviewDates[0],
    createdAt: nowIso
  };
  const id = await db.flashcards.add(record);
  return { id, ...record };
}

/**
 * Avalia um cartão no ciclo 15-30-45 e marca isMastered: true ao concluir o 3º ciclo (dia 45).
 */
export async function reviewFlashcard(cardId, quality = 4) {
  await ensureDbOpen();
  const card = await db.flashcards.get(cardId);
  if (!card) throw new Error(`Cartão id ${cardId} não encontrado.`);

  const sm2Result = calculateSM2(card, quality);
  await db.flashcards.update(cardId, {
    repetition: sm2Result.repetition,
    interval: sm2Result.interval,
    easeFactor: sm2Result.easeFactor,
    studiedAt: sm2Result.studiedAt,
    reviewDates: sm2Result.isMastered ? [] : sm2Result.reviewDates,
    isMastered: sm2Result.isMastered,
    nextReviewDate: sm2Result.nextReviewDate,
    lastReviewedAt: new Date().toISOString()
  });

  return {
    card: { ...card, ...sm2Result },
    sm2Result
  };
}

/**
 * Caderno de Erros Automático.
 */
export async function addErrorToDeck({ original, corrected, explanation, source = 'TCF' }) {
  await ensureDbOpen();
  const now = new Date();
  const nowIso = now.toISOString();
  const studiedAt = formatDateYYYYMMDD(now);
  const reviewDates = generateReviewDates15_30_45(now);

  const flashcardRecord = {
    category: `Caderno de Erros • ${source}`,
    front: corrected.trim(),
    back: `Correção: ${explanation.trim()}\n\nOriginal: "${original.trim()}"`,
    phonetic: '',
    example: `Erro corrigido: ${original.trim()}`,
    tip: explanation.trim(),
    studiedAt,
    reviewDates,
    isMastered: false,
    repetition: 0,
    interval: 15,
    easeFactor: SM2_DEFAULTS.easeFactor,
    nextReviewDate: reviewDates[0],
    createdAt: nowIso,
    isFromErrorLog: true
  };

  const flashcardId = await db.flashcards.add(flashcardRecord);

  const errorLogRecord = {
    date: now.toLocaleDateString('pt-BR'),
    timestamp: nowIso,
    source,
    original: original.trim(),
    corrected: corrected.trim(),
    explanation: explanation.trim(),
    flashcardId
  };

  const errorLogId = await db.errorLogs.add(errorLogRecord);

  return {
    flashcardId,
    errorLogId,
    card: { id: flashcardId, ...flashcardRecord }
  };
}

/**
 * Retorna a lista de palavras do Dicionário Diário que devem ser revisadas hoje:
 * filtra apenas as palavras cujo array `reviewDates` contenha a string da data de `hoje`
 * e que não possuam `isMastered: true`.
 */
export async function getDailyWordsDueToday(todayStr = formatDateYYYYMMDD(new Date())) {
  const words = await syncDailyDictionarySeed();
  return words.filter(
    (word) =>
      !word.isMastered &&
      Array.isArray(word.reviewDates) &&
      word.reviewDates.includes(todayStr)
  );
}

/**
 * Retorna contagem de revisões pendentes para hoje.
 */
export async function getPendingReviewsCount() {
  const dueWords = await getDailyWordsDueToday();
  return dueWords.length;
}

/**
 * Salva histórico de simulado TCF no Dexie.
 */
export async function addTCFHistory(historyItem) {
  await ensureDbOpen();
  return await db.tcfHistory.add(historyItem);
}

/**
 * Retorna histórico de simulados TCF.
 */
export async function getTCFHistory() {
  await ensureDbOpen();
  return await db.tcfHistory.reverse().toArray();
}

/**
 * Retorna todas as palavras do Dicionário Diário armazenadas no IndexedDB.
 */
export async function getAllDailyWords() {
  return await syncDailyDictionarySeed();
}

/**
 * Novo Motor de Revisão Estrita (15, 30 e 45 dias):
 * Quando o utilizador clicar no Checkbox de uma Palavra do Dia (Dicionário),
 * grava a data atual (`studiedAt` no formato YYYY-MM-DD) e gera imediatamente o array
 * `reviewDates` contendo exatamente 3 datas (YYYY-MM-DD):
 * `[DataAtual + 15 dias, DataAtual + 30 dias, DataAtual + 45 dias]`.
 */
export async function markDailyWordAsStudied(wordId, shouldMarkStudied = true) {
  await ensureDbOpen();
  let word = await db.dailyWords.get(wordId);
  if (!word) {
    const all = await syncDailyDictionarySeed();
    word = all.find((w) => w.id === wordId);
  }
  if (!word) throw new Error(`Palavra id ${wordId} não encontrada no IndexedDB.`);

  if (!shouldMarkStudied) {
    const resetFields = {
      estudado: false,
      studiedAt: null,
      reviewDates: [],
      completedReviewDates: [],
      isMastered: false,
      proxima_revisao: null,
      ultima_revisao: null
    };
    await db.dailyWords.put({ ...word, ...resetFields });
    return { ...word, ...resetFields };
  }

  const now = new Date();
  const studiedAt = formatDateYYYYMMDD(now);
  const reviewDates = generateReviewDates15_30_45(now);

  const updatedFields = {
    estudado: true,
    studiedAt,
    reviewDates,
    completedReviewDates: [],
    isMastered: false,
    proxima_revisao: reviewDates[0],
    ultima_revisao: now.toISOString()
  };

  await db.dailyWords.put({ ...word, ...updatedFields });
  return { ...word, ...updatedFields };
}

/**
 * Conclui uma etapa de revisão agendada (dia 15, dia 30 ou dia 45) de uma palavra.
 * Quando o utilizador concluir a revisão do dia 45 (3ª data do ciclo),
 * marca `isMastered: true` no cartão, removendo-o do ciclo.
 */
export async function completeDailyWordReview(
  wordId,
  targetDateStr = formatDateYYYYMMDD(new Date())
) {
  await ensureDbOpen();
  const word = await db.dailyWords.get(wordId);
  if (!word) throw new Error(`Palavra id ${wordId} não encontrada no IndexedDB.`);

  const currentReviewDates = Array.isArray(word.reviewDates) ? [...word.reviewDates] : [];
  const completedList = Array.isArray(word.completedReviewDates)
    ? [...word.completedReviewDates]
    : [];

  const day45Date = currentReviewDates[currentReviewDates.length - 1];
  const isDay45Review =
    targetDateStr === day45Date ||
    completedList.length >= 2 ||
    currentReviewDates.length <= 1;

  const nextCompleted = completedList.includes(targetDateStr)
    ? completedList
    : [...completedList, targetDateStr];

  if (isDay45Review) {
    const masteredFields = {
      isMastered: true,
      reviewDates: [],
      completedReviewDates: nextCompleted,
      proxima_revisao: null,
      ultima_revisao: new Date().toISOString()
    };
    await db.dailyWords.put({ ...word, ...masteredFields });
    return { ...word, ...masteredFields };
  }

  const remainingDates = currentReviewDates.filter((d) => d !== targetDateStr);
  const partialFields = {
    isMastered: false,
    reviewDates: remainingDates,
    completedReviewDates: nextCompleted,
    proxima_revisao: remainingDates[0] || null,
    ultima_revisao: new Date().toISOString()
  };

  await db.dailyWords.put({ ...word, ...partialFields });
  return { ...word, ...partialFields };
}

/**
 * Adiciona uma nova palavra personalizada ao Dicionário Diário no IndexedDB.
 */
export async function addDailyWord(wordData) {
  await ensureDbOpen();
  const word = wordData.word || wordData.palavra || '';
  const level = wordData.level || wordData.nivel || 'A1';
  const id = wordData.id || `word_${level}_${Date.now()}`;
  const record = normalizeSeedWord({
    id,
    word,
    ipa: wordData.ipa || wordData.fonetica_ipa || '',
    translation: wordData.translation || wordData.traducao || '',
    level,
    category: wordData.category || 'Personalizado',
    humanAudioUrl: wordData.humanAudioUrl || wordData.pronuncia_audio_url || ''
  });
  await db.dailyWords.put(record);
  return record;
}

/**
 * Retorna todos os episódios da store cartoonEpisodes no IndexedDB.
 */
export async function getAllCartoonEpisodes() {
  const flattened = flattenCartoonSprints(CARTOON_SPRINTS_SEED);
  try {
    await ensureDbOpen();
    const count = await db.cartoonEpisodes.count();
    if (count === 0) {
      await db.cartoonEpisodes.bulkPut(flattened);
    }
  } catch {
    // fallback silencioso para lista em memória
  }
  return flattened;
}

/**
 * Retorna todos os resumos salvos na store cartoonSummaries (mais recentes primeiro).
 */
export async function getAllCartoonSummaries() {
  try {
    await ensureDbOpen();
    return await db.cartoonSummaries.reverse().toArray();
  } catch {
    return [];
  }
}

/**
 * Salva um novo resumo de episódio na store cartoonSummaries do IndexedDB.
 */
export async function saveCartoonSummary({
  episode_id,
  episode_title = '',
  study_day = 1,
  sprint_theme = '',
  summary_text
}) {
  await ensureDbOpen();
  const record = {
    episode_id: String(episode_id),
    episode_title,
    study_day: Number(study_day) || 1,
    sprint_theme,
    date: new Date().toISOString(),
    summary_text: summary_text.trim()
  };
  const id = await db.cartoonSummaries.add(record);
  return { id, ...record };
}

/**
 * Retorna todos os capítulos da store guidedReading no IndexedDB.
 */
export async function getAllGuidedReadingChapters() {
  try {
    await ensureDbOpen();
    const count = await db.guidedReading.count();
    if (count === 0) {
      await db.guidedReading.bulkPut(LITTLE_PRINCE_SEED);
    }
    return await db.guidedReading.toArray();
  } catch {
    return LITTLE_PRINCE_SEED;
  }
}

/**
 * Atualiza o status is_completed de um capítulo na store guidedReading do IndexedDB.
 */
export async function completeGuidedReadingChapter(chapterId, isCompleted = true) {
  await ensureDbOpen();
  await db.guidedReading.update(Number(chapterId), {
    is_completed: Boolean(isCompleted),
    completed_at: new Date().toISOString()
  });
  return await db.guidedReading.get(Number(chapterId));
}

/**
 * Retorna todas as videoaulas cadastradas na store videoLessons do IndexedDB.
 */
export async function getAllVideoLessons() {
  try {
    await ensureDbOpen();
    const count = await db.videoLessons.count();
    if (count === 0) {
      await db.videoLessons.bulkPut(VIDEO_LESSON_SEED);
    }
    return await db.videoLessons.toArray();
  } catch {
    return VIDEO_LESSON_SEED;
  }
}

/**
 * Retorna todas as sessões de estudo (studySessions) com fotos do caderno (mais recentes primeiro).
 */
export async function getAllStudySessions() {
  try {
    await ensureDbOpen();
    return await db.studySessions.reverse().toArray();
  } catch {
    return [];
  }
}

/**
 * Salva uma nova sessão concluída na store studySessions do IndexedDB.
 */
export async function saveStudySession({
  notebook_photo_data_url,
  lesson_id = null,
  lesson_title = ''
}) {
  await ensureDbOpen();
  const record = {
    date: new Date().toISOString(),
    notebook_photo_data_url,
    is_completed: true,
    lesson_id,
    lesson_title
  };
  const id = await db.studySessions.add(record);
  return { id, ...record };
}
