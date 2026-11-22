import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked,
  Volume2,
  CheckCircle2,
  Sparkles,
  RotateCw,
  CalendarClock,
  Shuffle,
  Layers,
  Eye,
  Award,
  Flame,
  Tag
} from 'lucide-react';
import {
  db,
  syncDailyDictionarySeed,
  getAllStudySessions,
  calculateCurrentStudyDay,
  markDailyWordAsStudied,
  completeDailyWordReview
} from '../../services/db';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';

const CEFR_BADGE_STYLES = {
  A1: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  B1: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  B2: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  C1: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  C2: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
};

/**
 * Determina o nível alvo de vocabulário conforme o currentStudyDay:
 * - Se currentStudyDay <= 30 -> 'A1'
 * - Se currentStudyDay entre 31 e 60 -> 'A2'
 * - Acima de 60 -> 'B1'
 */
function getTargetLevelForStudyDay(studyDay) {
  if (studyDay <= 30) return 'A1';
  if (studyDay <= 60) return 'A2';
  return 'B1';
}

export function DailyDictionaryTab({ onAddCard, onShowToast }) {
  const [words, setWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  const [currentStudyDay, setCurrentStudyDay] = useState(1);
  const [currentTargetLevel, setCurrentTargetLevel] = useState('A1');
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [noWordsAvailable, setNoWordsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('bruto'); // 'bruto' | 'flashcard'
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [playingType, setPlayingType] = useState(null);

  const htmlAudioRef = useRef(null);
  const { speakText } = useFrenchAudio();

  // useEffect blindado com try...catch...finally { setLoading(false) }
  useEffect(() => {
    let isMounted = true;

    async function fetchDailyWordFromDexie() {
      try {
        setLoading(true);

        // 1. Garante que o seed do Dicionário esteja sincronizado no banco
        const syncedWords = await syncDailyDictionarySeed();

        // 2. Calcula currentStudyDay a partir de studySessions
        const sessions = await getAllStudySessions();
        const studyDay = calculateCurrentStudyDay(sessions);
        const targetLevel = getTargetLevelForStudyDay(studyDay);

        // 3. Query no Dexie filtrando palavras não estudadas do targetLevel
        let storedWords = [];
        try {
          storedWords = await db.dailyWords.toArray();
        } catch {
          storedWords = syncedWords;
        }
        const allWords = storedWords.length > 0 ? storedWords : syncedWords;

        const filteredAvailable = allWords.filter(
          (w) =>
            (w.level || w.nivel) === targetLevel &&
            !w.studiedAt &&
            !w.estudado &&
            !w.isMastered
        );

        if (!isMounted) return;

        setCurrentStudyDay(studyDay);
        setCurrentTargetLevel(targetLevel);
        setWords(allWords);
        setAvailableWords(filteredAvailable);

        if (filteredAvailable.length === 0) {
          setNoWordsAvailable(true);
          setSelectedWordId(null);
        } else {
          setNoWordsAvailable(false);
          const randomIndex = Math.floor(Math.random() * filteredAvailable.length);
          const drawnWord = filteredAvailable[randomIndex] || filteredAvailable[0];
          setSelectedWordId(drawnWord.id);
        }
      } catch (err) {
        console.error('Erro ao buscar Palavra do Dia no IndexedDB:', err);
        if (isMounted) {
          setNoWordsAvailable(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDailyWordFromDexie();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setIsCardFlipped(false);
  }, [selectedWordId]);

  const currentWord =
    words.find((w) => w.id === selectedWordId) || availableWords[0] || null;

  const levelWords = words.filter(
    (w) => (w.level || w.nivel) === currentTargetLevel
  );

  const handleDrawRandomWord = () => {
    const unstudiedPool = words.filter(
      (w) =>
        (w.level || w.nivel) === currentTargetLevel &&
        !w.studiedAt &&
        !w.estudado &&
        !w.isMastered
    );

    setAvailableWords(unstudiedPool);

    if (unstudiedPool.length === 0) {
      setNoWordsAvailable(true);
      setSelectedWordId(null);
      return;
    }

    setNoWordsAvailable(false);
    const candidates =
      unstudiedPool.length > 1
        ? unstudiedPool.filter((w) => w.id !== selectedWordId)
        : unstudiedPool;

    const randomPick = candidates[Math.floor(Math.random() * candidates.length)];
    if (randomPick) {
      setSelectedWordId(randomPick.id);
      if (onShowToast) {
        onShowToast(
          `🎲 Nova Palavra do Dia sorteada (${currentTargetLevel}): "${randomPick.word || randomPick.palavra}"`,
          'success'
        );
      }
    }
  };

  /**
   * Reproduz humanAudioUrl (Google Neural TTS fr-CA) com fallback Web Speech API
   */
  const playWordAudio = useCallback(
    async (audioUrl, textToSpeak, type = 'word') => {
      if (htmlAudioRef.current) {
        try {
          htmlAudioRef.current.pause();
          htmlAudioRef.current.currentTime = 0;
        } catch {}
      }

      setPlayingType(type);

      const triggerFallback = () => {
        speakText(textToSpeak, 0.9);
        setTimeout(() => setPlayingType(null), 1200);
      };

      const targetUrl =
        audioUrl ||
        `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          textToSpeak
        )}&tl=fr-CA&client=tw-ob`;

      try {
        const audio = new Audio(targetUrl);
        htmlAudioRef.current = audio;
        audio.onended = () => setPlayingType(null);
        audio.onerror = () => triggerFallback();
        await audio.play();
      } catch {
        triggerFallback();
      }
    },
    [speakText]
  );

  /**
   * Checkbox da Palavra do Dia:
   * Grava studiedAt (YYYY-MM-DD) e reviewDates: [DataAtual + 15d, DataAtual + 30d, DataAtual + 45d] no Dexie.js
   */
  const handleToggleStudiedCheckbox = async (shouldCheck) => {
    if (!currentWord) return;
    try {
      const isAlreadyStudied = Boolean(currentWord.estudado || currentWord.studiedAt);
      const nextChecked =
        typeof shouldCheck === 'boolean' ? shouldCheck : !isAlreadyStudied;
      const updatedWord = await markDailyWordAsStudied(currentWord.id, nextChecked);

      const nextWords = words.map((item) =>
        item.id === updatedWord.id ? updatedWord : item
      );
      setWords(nextWords);

      const nextAvailable = nextWords.filter(
        (w) =>
          (w.level || w.nivel) === currentTargetLevel &&
          !w.studiedAt &&
          !w.estudado &&
          !w.isMastered
      );
      setAvailableWords(nextAvailable);

      const displayWord = updatedWord.word || updatedWord.palavra;
      const displayIpa = updatedWord.ipa || updatedWord.fonetica_ipa || '';
      const displayTranslation = updatedWord.translation || updatedWord.traducao || '';
      const displayLevel = updatedWord.level || updatedWord.nivel || 'A1';

      if (nextChecked && onAddCard && !isAlreadyStudied) {
        onAddCard({
          category: `Dicionário Diário • ${displayLevel}`,
          front: `${displayWord} ${displayIpa}`.trim(),
          back: `${displayTranslation} (${updatedWord.category || 'Vocabulário'})`,
          phonetic: displayIpa,
          example: updatedWord.frase_exemplo || displayWord,
          tip: displayTranslation
        });
      }

      if (onShowToast) {
        if (nextChecked) {
          onShowToast(
            `✅ "${displayWord}" estudada em ${updatedWord.studiedAt}! Revisões: ${updatedWord.reviewDates.join(', ')} (15-30-45d).`,
            'success'
          );
        } else {
          onShowToast(`Ciclo de revisão de "${displayWord}" reiniciado.`);
        }
      }
    } catch (err) {
      console.error('Erro ao gravar ciclo 15-30-45 no IndexedDB:', err);
    }
  };

  /**
   * Conclui uma etapa de revisão (15d, 30d ou 45d). Ao concluir o dia 45, marca isMastered: true.
   */
  const handleCompleteReviewStage = async (dateStr) => {
    if (!currentWord) return;
    try {
      const updatedWord = await completeDailyWordReview(currentWord.id, dateStr);
      setWords((prev) =>
        prev.map((item) => (item.id === updatedWord.id ? updatedWord : item))
      );

      const displayWord = updatedWord.word || updatedWord.palavra;
      if (onShowToast) {
        if (updatedWord.isMastered) {
          onShowToast(
            `🏆 Revisão de 45 dias concluída! "${displayWord}" marcada como Dominada (isMastered: true)!`,
            'success'
          );
        } else {
          onShowToast(
            `✅ Revisão de ${dateStr} concluída! Próxima revisão: ${
              updatedWord.reviewDates[0] || 'Finalizada'
            }.`,
            'success'
          );
        }
      }
    } catch (err) {
      console.error('Erro ao concluir etapa de revisão:', err);
    }
  };

  // 1. Tela de carregamento controlada exclusivamente por `loading`
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
        Carregando o Dicionário Diário Nivelado do IndexedDB...
      </div>
    );
  }

  // 2. Tratamento de Estado Vazio (Empty State) quando `noWordsAvailable` for true e `loading` for false
  if (noWordsAvailable || !currentWord) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-4 font-sans"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white leading-snug">
          🎉 Tudo em dia! Você já estudou todo o vocabulário da sua rotação atual. Volte amanhã ou revise o seu Deck SM-2.
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Study Day #{currentStudyDay} • Rotação atual: Nível {currentTargetLevel}
        </p>
      </motion.div>
    );
  }

  const wordText = currentWord.word || currentWord.palavra;
  const wordIpa = currentWord.ipa || currentWord.fonetica_ipa || '';
  const wordTranslation = currentWord.translation || currentWord.traducao || '';
  const wordLevel = currentWord.level || currentWord.nivel || 'A1';
  const wordCategory = currentWord.category || 'Vocabulário Geral';
  const wordAudioUrl =
    currentWord.humanAudioUrl || currentWord.pronuncia_audio_url || '';
  const isStudied = Boolean(currentWord.estudado || currentWord.studiedAt);
  const reviewDates = Array.isArray(currentWord.reviewDates)
    ? currentWord.reviewDates
    : [];

  const studiedCount = words.filter((w) => w.estudado || w.studiedAt).length;
  const masteredCount = words.filter((w) => w.isMastered).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO EDITORIAL DO DICIONÁRIO DIÁRIO NIVELADO */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20 flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5" />
              Nivelamento Progressivo • Ciclo 15-30-45
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Study Day {currentStudyDay} → Nível {currentTargetLevel}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {availableWords.length} não estudadas no nível {currentTargetLevel} •{' '}
              {studiedCount} estudadas • {masteredCount} dominadas
            </span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white">
            Le Dictionnaire Quotidien
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Como você está no <strong>Day {currentStudyDay}</strong>, a Palavra do Dia é sorteada automaticamente dentre os termos não estudados de nível{' '}
            <strong>{currentTargetLevel}</strong> (Dias 1–30: A1 • Dias 31–60: A2 • Dias 61+: B1).
          </p>
        </div>

        {/* Controles: Sortear Palavra + Alternar Modo Estudo Bruto / Flashcard */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleDrawRandomWord}
            className="px-4 py-2.5 rounded-2xl bg-red-700 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
            title="Sortear outra palavra não estudada do nível atual"
          >
            <Shuffle className="w-4 h-4" />
            <span>Sortear Palavra ({currentTargetLevel})</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('bruto')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'bruto'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
              <span>Estudo Bruto</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('flashcard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'flashcard'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
              <span>Flashcard 3D</span>
            </button>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGAÇÃO DO SUBCONJUNTO NIVELADO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {levelWords.map((item) => {
          const isSelected = item.id === currentWord.id;
          const label = item.word || item.palavra;
          const lvl = item.level || item.nivel;
          const itemStudied = Boolean(item.estudado || item.studiedAt);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setNoWordsAvailable(false);
                setSelectedWordId(item.id);
              }}
              className={`px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-semibold shadow-sm'
                  : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="font-display">{label}</span>
              <span className="text-[10px] font-mono opacity-75">({lvl})</span>
              {item.isMastered ? (
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : itemStudied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO PRINCIPAL: MODO ESTUDO BRUTO OU MODO FLASHCARDS */}
      <AnimatePresence mode="wait">
        {activeView === 'bruto' ? (
          <motion.section
            key={`bruto-${currentWord.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* COLUNA ESQUERDA (8 cols): Palavra do Dia, Pronúncia, Categoria e Checkbox 15-30-45 */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                        CEFR_BADGE_STYLES[wordLevel] || CEFR_BADGE_STYLES.A1
                      }`}
                    >
                      Nível {wordLevel}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-red-700 dark:text-red-400" />
                      {wordCategory}
                    </span>

                    {wordIpa && (
                      <span className="text-sm font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {wordIpa}
                      </span>
                    )}

                    {currentWord.isMastered && (
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Ciclo 45d Dominado ✓
                      </span>
                    )}
                  </div>

                  <h2 className="font-display font-bold text-4xl sm:text-6xl text-slate-900 dark:text-white tracking-tight">
                    {wordText}
                  </h2>

                  <p className="text-xl sm:text-2xl font-medium text-slate-600 dark:text-slate-300">
                    {wordTranslation}
                  </p>
                </div>

                {/* Botão Áudio da Palavra (Google Neural TTS fr-CA) */}
                <button
                  type="button"
                  onClick={() => playWordAudio(wordAudioUrl, wordText, 'word')}
                  className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer shadow-xs ${
                    playingType === 'word'
                      ? 'bg-red-700 text-white ring-4 ring-red-700/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900'
                  }`}
                >
                  <Volume2
                    className={`w-4 h-4 ${playingType === 'word' ? 'animate-bounce' : ''}`}
                  />
                  <span>Ouvir Pronúncia (fr-CA)</span>
                </button>
              </div>

              {/* Card Contextual da Palavra Sorteada */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                  Palavra do Dia Sorteada • Day {currentStudyDay} ({wordCategory})
                </span>

                <blockquote className="font-display italic text-xl sm:text-2xl text-slate-900 dark:text-slate-100 leading-relaxed border-l-4 border-red-700 pl-4">
                  « {wordText} » — {wordTranslation}
                </blockquote>

                <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 font-mono">
                  ID: {currentWord.id} • Fonética IPA: {wordIpa} • Nível: {wordLevel}
                </p>
              </div>

              {/* MOTOR DE REVISÃO ESTRITA (15, 30 E 45 DIAS) + CHECKBOX DA PALAVRA DO DIA */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Checkbox Interativo da Palavra do Dia */}
                  <label className="flex items-center gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isStudied}
                      onChange={(e) => handleToggleStudiedCheckbox(e.target.checked)}
                      className="w-5 h-5 rounded-md accent-red-700 cursor-pointer"
                    />
                    <div>
                      <span className="font-display font-bold text-base text-slate-900 dark:text-white block">
                        {isStudied
                          ? `Palavra Estudada (studiedAt: ${currentWord.studiedAt})`
                          : 'Marcar Palavra do Dia como Estudada'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Grava `studiedAt` e gera `reviewDates` para +15, +30 e +45 dias no IndexedDB.
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleToggleStudiedCheckbox(true)}
                    className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isStudied ? 'Reagendar 15-30-45' : 'Marcar como Estudado'}
                    </span>
                  </button>
                </div>

                {/* Exibição das 3 Datas Estritas (reviewDates) */}
                {isStudied && (
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                        Cronograma `reviewDates` (YYYY-MM-DD)
                      </span>
                      {currentWord.isMastered && (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          isMastered: true (Removido do ciclo)
                        </span>
                      )}
                    </div>

                    {reviewDates.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {reviewDates.map((dateStr, idx) => {
                          const stageLabels = ['+15 dias', '+30 dias', '+45 dias (Final)'];
                          const isLastStage = idx === reviewDates.length - 1;
                          return (
                            <div
                              key={dateStr}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {stageLabels[idx] || `Marco ${idx + 1}`}
                                </span>
                                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                  {dateStr}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCompleteReviewStage(dateStr)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                  isLastStage
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-600 hover:text-white'
                                }`}
                              >
                                {isLastStage ? 'Concluir 45d' : 'Revisar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        🏆 Todas as revisões (15, 30 e 45 dias) foram concluídas! Este cartão possui `isMastered: true` e foi removido do ciclo.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA (4 cols): Painel de Nivelamento Progressivo por Study Day */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-xl space-y-5">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 block">
                    Motor de Nivelamento Progressivo
                  </span>
                  <h3 className="font-display font-bold text-xl text-white">
                    Study Day #{currentStudyDay}
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      currentStudyDay <= 30
                        ? 'bg-red-700/20 border-red-600 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>Dias 1 a 30</span>
                    <span className="font-mono">Vocabulário Nível A1</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      currentStudyDay >= 31 && currentStudyDay <= 60
                        ? 'bg-red-700/20 border-red-600 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>Dias 31 a 60</span>
                    <span className="font-mono">Vocabulário Nível A2</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      currentStudyDay > 60
                        ? 'bg-red-700/20 border-red-600 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>Dia 61 em diante</span>
                    <span className="font-mono">Vocabulário Nível B1</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Restam <strong>{availableWords.length}</strong> palavras inéditas no nível{' '}
                  <strong>{currentTargetLevel}</strong> para sortear nos próximos dias.
                </p>
              </div>
            </aside>
          </motion.section>
        ) : (
          /* MODO 2: MODO FLASHCARDS (3D FLIP CARD INTERATIVO) */
          <motion.section
            key={`flashcard-${currentWord.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Memória Ativa • Clique no Cartão para Virar
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tente recordar a tradução e pronúncia de <strong>{wordText}</strong> antes de virar o cartão.
              </p>
            </div>

            <div
              onClick={() => setIsCardFlipped((prev) => !prev)}
              className="perspective-1000 w-full h-[380px] cursor-pointer select-none"
            >
              <div
                className={`relative w-full h-full rounded-3xl transition-transform duration-700 transform-style-3d shadow-xl ${
                  isCardFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* FRENTE DO FLASHCARD */}
                <div className="absolute inset-0 w-full h-full rounded-3xl p-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 border border-zinc-800 text-white backface-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20">
                      Nível {wordLevel} • {wordCategory}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-red-400" />
                      Virar Cartão
                    </span>
                  </div>

                  <div className="my-auto text-center space-y-3">
                    <h3 className="font-display font-bold text-5xl sm:text-6xl text-white">
                      {wordText}
                    </h3>
                    {wordIpa && (
                      <p className="font-mono text-lg text-amber-400">{wordIpa}</p>
                    )}
                  </div>

                  <p className="text-xs text-center text-zinc-400">
                    Clique para revelar a tradução e ouvir o áudio neural (fr-CA)
                  </p>
                </div>

                {/* VERSO DO FLASHCARD */}
                <div className="absolute inset-0 w-full h-full rounded-3xl p-8 bg-white dark:bg-[#111827] border-2 border-red-700/40 backface-hidden rotate-y-180 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                      Tradução & Pronúncia Oficial
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Voltar
                    </span>
                  </div>

                  <div className="my-auto space-y-4 text-center">
                    <h3 className="font-display font-bold text-4xl text-slate-900 dark:text-white">
                      {wordText}
                    </h3>
                    {wordIpa && (
                      <p className="text-base font-mono text-rose-600 dark:text-rose-400">
                        {wordIpa}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {wordTranslation}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playWordAudio(wordAudioUrl, wordText, 'word');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Ouvir Pronúncia (fr-CA)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <span>Datas de Revisão (15-30-45): </span>
                <strong className="font-mono text-slate-900 dark:text-white">
                  {reviewDates.length > 0 ? reviewDates.join(' • ') : 'Não agendado'}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => handleToggleStudiedCheckbox(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold text-sm shadow-md shadow-red-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcar como Estudado</span>
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DailyDictionaryTab;
