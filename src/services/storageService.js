import { INITIAL_FLASHCARDS } from '../data/initialFlashcards';
import { formatDateYYYYMMDD } from './sm2Algorithm';

const STORAGE_KEY = 'zeroAoCanadaState_v2';
const LEGACY_BACKUP_KEY = 'zeroAoCanadaState_legacy_backup';

/**
 * Apenas metadados leves de UI ficam no localStorage.
 * Flashcards e histórico TCF têm o IndexedDB como única fonte de verdade
 * (antes eram gravados nos dois lugares e podiam divergir).
 */
const PERSISTED_KEYS = [
  'studyStreak',
  'aiSessions',
  'lastCompletedDate',
  'dailySteps',
  'dailyStepsDate',
  'completedLessons',
  'currentAIStage',
  'currentCardIndex'
];

export const DEFAULT_STATE = {
  studyStreak: 1,
  aiSessions: 0,
  lastCompletedDate: null,
  dailySteps: { 1: false, 2: false, 3: false, 4: false },
  dailyStepsDate: null,
  completedLessons: [1],
  currentAIStage: 3,
  // Valores em memória até o IndexedDB carregar (não são persistidos no localStorage)
  flashcards: INITIAL_FLASHCARDS,
  currentCardIndex: 0,
  pendingReviews: 0,
  tcfHistory: []
};

/**
 * Antes de deixar de gravar flashcards/tcfHistory no localStorage, guarda uma cópia
 * integral do blob legado (uma única vez). O `initDatabase` lê essa cópia caso
 * o IndexedDB esteja vazio, então nada que só existia no localStorage é perdido.
 */
function preserveLegacyBlobOnce() {
  try {
    if (localStorage.getItem(LEGACY_BACKUP_KEY)) return;
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('zeroAoCanadaState_v1');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const hasHeavyData =
      (Array.isArray(parsed?.flashcards) && parsed.flashcards.length > 0) ||
      (Array.isArray(parsed?.tcfHistory) && parsed.tcfHistory.length > 0);
    if (hasHeavyData) {
      localStorage.setItem(LEGACY_BACKUP_KEY, raw);
    }
  } catch (e) {
    console.warn('Não foi possível preservar o estado legado do localStorage:', e);
  }
}

/** Zera as etapas diárias quando a data mudou (antes ficavam marcadas para sempre). */
function withFreshDailySteps(state, todayStr = formatDateYYYYMMDD(new Date())) {
  if (state.dailyStepsDate === todayStr) return state;
  return {
    ...state,
    dailySteps: { ...DEFAULT_STATE.dailySteps },
    dailyStepsDate: todayStr
  };
}

export const storageService = {
  loadState() {
    try {
      if (typeof window === 'undefined') return DEFAULT_STATE;
      preserveLegacyBlobOnce();
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('zeroAoCanadaState_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const meta = Object.fromEntries(
          PERSISTED_KEYS.filter((k) => k in parsed).map((k) => [k, parsed[k]])
        );
        // Estados antigos não tinham dailyStepsDate: preserva as marcações do dia corrente.
        if (!('dailyStepsDate' in parsed)) {
          meta.dailyStepsDate = formatDateYYYYMMDD(new Date());
        }
        return withFreshDailySteps({ ...DEFAULT_STATE, ...meta });
      }
    } catch (e) {
      console.error("Erro ao carregar estado do storage:", e);
    }
    return withFreshDailySteps(DEFAULT_STATE);
  },

  saveState(state) {
    try {
      if (typeof window === 'undefined') return;
      preserveLegacyBlobOnce();
      const meta = Object.fromEntries(PERSISTED_KEYS.map((k) => [k, state[k]]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch (e) {
      console.error("Erro ao salvar estado no storage:", e);
    }
  },

  resetState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("Erro ao limpar storage:", e);
    }
    return DEFAULT_STATE;
  }
};
