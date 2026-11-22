import { INITIAL_FLASHCARDS } from '../data/initialFlashcards';

const STORAGE_KEY = 'zeroAoCanadaState_v2';

export const DEFAULT_STATE = {
  studyStreak: 1,
  aiSessions: 0,
  lastCompletedDate: null,
  dailySteps: { 1: false, 2: false, 3: false, 4: false },
  completedLessons: [1],
  currentAIStage: 3,
  flashcards: INITIAL_FLASHCARDS,
  currentCardIndex: 0,
  pendingReviews: 6,
  tcfHistory: [
    { date: "Exemplo Inicial", mode: "Escrita Tâche 3", score: "12/20", nclc: "NCLC 7 (B2)" }
  ]
};

export const storageService = {
  loadState() {
    try {
      if (typeof window === 'undefined') return DEFAULT_STATE;
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('zeroAoCanadaState_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          flashcards: parsed.flashcards && parsed.flashcards.length > 0 ? parsed.flashcards : INITIAL_FLASHCARDS
        };
      }
    } catch (e) {
      console.error("Erro ao carregar estado do storage:", e);
    }
    return DEFAULT_STATE;
  },

  saveState(state) {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
