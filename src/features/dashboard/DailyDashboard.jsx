import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  BookOpen,
  Tv,
  BookMarked,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  NotebookPen,
  Award,
  Volume2,
  X
} from 'lucide-react';
import { DAILY_DICTIONARY_SEED } from '../../data/dailyDictionarySeed';
import { CARTOON_SPRINTS_SEED } from '../../data/cartoonSeed';
import { VIDEO_LESSON_SEED } from '../../data/videoLessonSeed';
import { LE_PETIT_PRINCE_BOOK } from '../../data/lePetitPrince';
import {
  getAllStudySessions,
  saveStudySession,
  calculateCurrentStudyDay,
  getAllDailyWords
} from '../../services/db';

function toDateKey(dateInput) {
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

function calculateStreakFromSessions(sessions, fallbackStreak = 0) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return fallbackStreak || 0;
  }

  const completedDates = new Set(
    sessions
      .filter((s) => s.is_completed !== false && s.date)
      .map((s) => toDateKey(s.date))
      .filter(Boolean)
  );

  if (completedDates.size === 0) {
    return fallbackStreak || 0;
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let cursorDate = null;
  if (completedDates.has(todayKey)) {
    cursorDate = new Date(today);
  } else if (completedDates.has(yesterdayKey)) {
    cursorDate = new Date(yesterday);
  } else {
    return completedDates.size;
  }

  let streakCount = 0;
  while (cursorDate) {
    const key = toDateKey(cursorDate);
    if (completedDates.has(key)) {
      streakCount += 1;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  return Math.max(streakCount, fallbackStreak || 0);
}

function getTargetLevelForDay(studyDay) {
  if (studyDay <= 30) return 'A1';
  if (studyDay <= 60) return 'A2';
  return 'B1';
}

function findEpisodeForDay(studyDay) {
  for (const sprint of CARTOON_SPRINTS_SEED) {
    const found = (sprint.episodes || []).find(
      (ep) => Number(ep.day) === Number(studyDay)
    );
    if (found) {
      return {
        episode: found,
        sprint
      };
    }
  }
  const fallbackSprint = CARTOON_SPRINTS_SEED[0];
  return {
    episode: fallbackSprint?.episodes?.[0] || {
      id: 'ep_1',
      day: 1,
      title: "Caillou - L'anniversaire de Caillou",
      url: 'https://www.youtube.com/watch?v=_CfHjzWCRUU'
    },
    sprint: fallbackSprint
  };
}

function findVideoLessonForDay(studyDay) {
  return (
    VIDEO_LESSON_SEED.find((lesson) => Number(lesson.day) === Number(studyDay)) ||
    VIDEO_LESSON_SEED[(Math.max(1, studyDay) - 1) % VIDEO_LESSON_SEED.length] ||
    VIDEO_LESSON_SEED[0]
  );
}

/**
 * Modal de Fricção Positiva (<NotebookValidationModal />)
 * Exige a confirmação da anotação física no caderno pessoal de 10 matérias e revisão em voz alta.
 */
export function NotebookValidationModal({
  isOpen,
  pillar,
  onCancel,
  onConfirm
}) {
  if (!isOpen || !pillar) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-amber-500/40 p-6 sm:p-8 text-white shadow-2xl space-y-6"
        >
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 pr-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <NotebookPen className="w-3.5 h-3.5" />
                Validação de Caderno Físico • {pillar.badge}
              </span>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                {pillar.title}
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Tópico validado: <span className="text-zinc-200">{pillar.topicTitle}</span>
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm sm:text-base leading-relaxed font-medium">
            ⚠️ Ação Física Requerida: Para consolidar a sua memória, anote este tópico no seu caderno pessoal de 10 matérias. Você já anotou em voz alta?
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Ainda Não
            </button>

            <button
              type="button"
              onClick={() => onConfirm(pillar.id)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sim, já anotei</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function DailyDashboard({
  onNavigateTab,
  onCompleteDayStreak,
  onShowToast,
  fallbackStreak = 0
}) {
  const [sessions, setSessions] = useState([]);
  const [dailyWords, setDailyWords] = useState([]);
  const [currentStudyDay, setCurrentStudyDay] = useState(1);
  const [completedPillars, setCompletedPillars] = useState({
    dictionary: false,
    cartoon: false,
    reading: false,
    videoLesson: false
  });
  const [activeValidationPillar, setActiveValidationPillar] = useState(null);
  const [isFinishingDay, setIsFinishingDay] = useState(false);
  const [showVictoryCelebration, setShowVictoryCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedSessions, storedWords] = await Promise.all([
        getAllStudySessions(),
        getAllDailyWords()
      ]);

      setSessions(storedSessions || []);
      setDailyWords(storedWords || []);

      const computedDay = calculateCurrentStudyDay(storedSessions || []);
      setCurrentStudyDay(computedDay);
    } catch (err) {
      console.error('Erro ao carregar dados do DailyDashboard:', err);
      setCurrentStudyDay(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Nível adequado para o currentStudyDay
  const targetLevel = useMemo(
    () => getTargetLevelForDay(currentStudyDay),
    [currentStudyDay]
  );

  // Pilar 1: A Palavra do Dia do nível adequado
  const wordOfTheDay = useMemo(() => {
    const sourceWords =
      dailyWords.length > 0 ? dailyWords : DAILY_DICTIONARY_SEED;
    const levelPool = sourceWords.filter(
      (w) =>
        String(w.level || w.nivel || 'A1').toUpperCase() === targetLevel &&
        !w.isMastered
    );
    const pool = levelPool.length > 0 ? levelPool : sourceWords;
    return (
      pool[(Math.max(1, currentStudyDay) - 1) % pool.length] ||
      DAILY_DICTIONARY_SEED[0]
    );
  }, [dailyWords, targetLevel, currentStudyDay]);

  // Pilar 2: Episódio de Cartoon correspondente ao currentStudyDay
  const { episode: cartoonOfTheDay, sprint: currentCartoonSprint } = useMemo(
    () => findEpisodeForDay(currentStudyDay),
    [currentStudyDay]
  );

  // Pilar 3: Leitura Guiada - Le Petit Prince
  const readingBook = LE_PETIT_PRINCE_BOOK;

  // Pilar 4: Videoaula correspondente ao currentStudyDay
  const videoLessonOfTheDay = useMemo(
    () => findVideoLessonForDay(currentStudyDay),
    [currentStudyDay]
  );

  const streakCount = useMemo(
    () => calculateStreakFromSessions(sessions, fallbackStreak),
    [sessions, fallbackStreak]
  );

  const completedCount = Object.values(completedPillars).filter(Boolean).length;
  const allFourPillarsCompleted = completedCount === 4;

  const playWordPreviewAudio = (text) => {
    if (!text) return;
    try {
      const url =
        'https://translate.google.com/translate_tts?ie=UTF-8&q=' +
        encodeURIComponent(text) +
        '&tl=fr-CA&client=tw-ob';
      new Audio(url).play().catch(() => {});
    } catch {
      // noop
    }
  };

  const pillars = [
    {
      id: 'dictionary',
      badge: `Pilar 1 • Dicionário (${targetLevel})`,
      title: 'A Palavra do Dia',
      topicTitle: `${wordOfTheDay?.word || wordOfTheDay?.palavra || 'Bonjour'} ${
        wordOfTheDay?.ipa ? `[${wordOfTheDay.ipa}]` : ''
      } — ${wordOfTheDay?.translation || wordOfTheDay?.traducao || 'Bom dia'}`,
      subtitle: `Vocabulário nivelado ${targetLevel} • Ciclo 15-30-45 dias`,
      notebookSubject: 'Matéria 1 • Vocabulário & Fonética IPA',
      tabId: 'dicionario',
      ctaLabel: 'Abrir Dicionário',
      icon: BookOpen,
      extraAudioWord: wordOfTheDay?.word || wordOfTheDay?.palavra
    },
    {
      id: 'cartoon',
      badge: `Pilar 2 • Imersão (Jour ${currentStudyDay})`,
      title: 'Daily Cartoon',
      topicTitle: cartoonOfTheDay?.title || "Caillou - L'anniversaire de Caillou",
      subtitle: `${currentCartoonSprint?.theme || 'Sprint 1: Caillou'} • ${
        currentCartoonSprint?.days || 'Dias 1 a 15'
      }`,
      notebookSubject: 'Matéria 2 • Escuta Ativa & Expressões Orais',
      tabId: 'cartoon',
      ctaLabel: 'Assistir Episódio',
      icon: Tv
    },
    {
      id: 'reading',
      badge: 'Pilar 3 • Leitura',
      title: readingBook?.title || 'Le Petit Prince',
      topicTitle: `${readingBook?.chapterTitle || 'Chapitre I'} — ${
        readingBook?.author || 'Antoine de Saint-Exupéry'
      }`,
      subtitle: '💡 Passe o rato para traduzir, clique na frase para ouvir a pronúncia.',
      notebookSubject: 'Matéria 3 • Literatura & Estruturas Narrativas',
      tabId: 'leitura',
      ctaLabel: 'Abrir Leitura Guiada',
      icon: BookMarked
    },
    {
      id: 'videoLesson',
      badge: `Pilar 4 • Gramática (${videoLessonOfTheDay?.level || targetLevel})`,
      title: 'Videoaula',
      topicTitle:
        videoLessonOfTheDay?.title || 'O Alfabeto Francês e Sons Essenciais',
      subtitle: `Aula técnica do Jour ${currentStudyDay} • Nível ${
        videoLessonOfTheDay?.level || targetLevel
      }`,
      notebookSubject: 'Matéria 4 • Gramática Estrutural & Regras',
      tabId: 'videoaula',
      ctaLabel: 'Assistir Videoaula',
      icon: GraduationCap
    }
  ];

  const handleOpenValidationModal = (pillar) => {
    if (completedPillars[pillar.id]) return;
    setActiveValidationPillar(pillar);
  };

  const handleConfirmNotebookValidation = (pillarId) => {
    setCompletedPillars((prev) => ({
      ...prev,
      [pillarId]: true
    }));
    setActiveValidationPillar(null);
    if (onShowToast) {
      onShowToast('📓 Tópico validado no caderno de 10 matérias!');
    }
  };

  const handleFinishDaySession = async () => {
    if (!allFourPillarsCompleted || isFinishingDay) return;

    try {
      setIsFinishingDay(true);
      await saveStudySession({
        notebook_photo_data_url: null,
        lesson_id: videoLessonOfTheDay?.id || `day_${currentStudyDay}`,
        lesson_title: `Jour ${currentStudyDay} Completo: ${videoLessonOfTheDay?.title || '4 Pilares'}`
      });

      const updatedSessions = await getAllStudySessions();
      setSessions(updatedSessions);
      const nextDay = calculateCurrentStudyDay(updatedSessions);
      setCurrentStudyDay(nextDay);
      setShowVictoryCelebration(true);

      if (onCompleteDayStreak) {
        onCompleteDayStreak();
      } else if (onShowToast) {
        onShowToast(
          `🚀 Sessão do Jour ${currentStudyDay} encerrada com sucesso! Ofensiva incrementada!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Erro ao encerrar sessão do dia no IndexedDB:', err);
      if (onShowToast) {
        onShowToast('Erro ao gravar sessão no IndexedDB.', 'error');
      }
    } finally {
      setIsFinishingDay(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO DO MAESTRO DA ROTINA */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-10 text-white shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-red-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Jour {currentStudyDay}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-zinc-900 text-amber-400 border border-zinc-800 flex items-center gap-1.5">
                <NotebookPen className="w-3.5 h-3.5" />
                Caderno Físico de 10 Matérias
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
                Nível Foco: {targetLevel}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              Salut, Filipe! Voici ta mission du jour.
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              O Maestro da Rotina guia os seus 4 pilares diários. Estude cada bloco, escreva à mão no seu caderno de 10 matérias e revise em voz alta para liberar o encerramento do <strong className="text-white">Jour {currentStudyDay}</strong>.
            </p>
          </div>

          {/* CARD DE OFENSIVA (STREAK) & STATUS DO JOUR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                <Flame className="w-9 h-9 text-white fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 block">
                  Ofensiva Diária
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-display font-black text-3xl sm:text-4xl text-white">
                    {isLoading ? '...' : streakCount}
                  </span>
                  <span className="text-sm font-semibold text-zinc-300">
                    {streakCount === 1 ? 'dia seguido' : 'dias seguidos'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Jour {currentStudyDay} • {completedCount}/4 pilares validados no caderno
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CELEBRAÇÃO DE VITÓRIA E CONFETES QUANDO A SESSÃO DO DIA É ENCERRADA */}
      <AnimatePresence>
        {showVictoryCelebration && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white shadow-2xl border border-emerald-400/40"
          >
            {/* Confetes visuais */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {['🎉', '✨', '🇫🇷', '🍁', '🚀', '📓', '🔥', '🏆'].map((emoji, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: 30, scale: 0.6 }}
                  animate={{
                    opacity: [0, 1, 0.85],
                    y: [-10, -28, -14],
                    scale: [0.8, 1.15, 1]
                  }}
                  transition={{
                    duration: 1.6,
                    delay: idx * 0.08,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                  style={{ left: `${10 + idx * 11}%`, top: `${18 + (idx % 3) * 24}%` }}
                  className="absolute text-xl sm:text-2xl select-none opacity-30"
                >
                  {emoji}
                </motion.span>
              ))}
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-100 block">
                    🎉 Félicitations, Filipe ! Missão Diária Concluída
                  </span>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    Sessão Registrada no IndexedDB & Ofensiva Incrementada!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-50">
                    Os 4 pilares e suas anotações manuscritas no caderno de 10 matérias foram consolidados. Você avançou para o <strong>Jour {currentStudyDay}</strong>!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVictoryCelebration(false)}
                className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold uppercase tracking-wider text-white transition cursor-pointer shrink-0"
              >
                Continuar
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* GRID DOS 4 PILARES DIÁRIOS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
              Os 4 Pilares Diários • Jour {currentStudyDay}
            </h2>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {completedCount} de 4 pilares anotados no caderno físico
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pillars.map((pillar) => {
            const IconComponent = pillar.icon;
            const isDone = Boolean(completedPillars[pillar.id]);

            return (
              <div
                key={pillar.id}
                className={`rounded-3xl border p-6 sm:p-7 transition-all flex flex-col justify-between gap-6 ${
                  isDone
                    ? 'bg-emerald-950/25 border-emerald-500/50 dark:bg-emerald-950/30 dark:border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800/80 hover:border-red-700/50 shadow-xs'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <IconComponent className="w-6 h-6" />
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isDone ? '✓ Anotado no Caderno' : pillar.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400 block">
                      {pillar.notebookSubject}
                    </span>
                    <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                      {pillar.title}
                    </h3>
                  </div>

                  {/* Destaque do Conteúdo Puxado da Semente */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDone
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
                        : 'bg-slate-50 dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-bold text-base sm:text-lg leading-snug">
                        {pillar.topicTitle}
                      </p>

                      {pillar.extraAudioWord && (
                        <button
                          type="button"
                          onClick={() => playWordPreviewAudio(pillar.extraAudioWord)}
                          className="p-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-500 dark:text-red-400 transition cursor-pointer shrink-0"
                          title="Ouvir pronúncia fr-CA"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5">
                      {pillar.subtitle}
                    </p>
                  </div>
                </div>

                {/* Ações do Card: Ir para a ferramenta + Botão Concluir (abre Modal de Fricção Positiva) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onNavigateTab && onNavigateTab(pillar.tabId)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{pillar.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={isDone}
                    onClick={() => handleOpenValidationModal(pillar)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition ${
                      isDone
                        ? 'bg-emerald-600 text-white cursor-default shadow-sm'
                        : 'bg-red-700 hover:bg-red-600 text-white shadow-md shadow-red-700/20 cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isDone ? 'Concluído' : 'Marcar como Concluído'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONCLUSÃO DO DIA: LIBERADO APENAS QUANDO OS 4 PILARES ESTIVEREM VERDES/CONCLUÍDOS */}
      <section className="pt-2">
        {allFourPillarsCompleted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-zinc-950 to-emerald-950 border-2 border-emerald-500/60 shadow-2xl space-y-4 text-center"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                ✓ Todos os 4 Pilares Anotados no Caderno de 10 Matérias
              </span>
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white">
                Pronto para consolidar o Jour {currentStudyDay}!
              </h3>
            </div>

            <button
              type="button"
              disabled={isFinishingDay}
              onClick={handleFinishDaySession}
              className="w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-display font-bold text-xl sm:text-2xl shadow-2xl shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <span>
                {isFinishingDay
                  ? 'Gravando Sessão no IndexedDB...'
                  : '🚀 Encerrar Sessão do Dia'}
              </span>
            </button>
          </motion.div>
        ) : (
          <div className="p-6 rounded-3xl bg-white/60 dark:bg-[#111827]/60 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-1.5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Complete e valide os 4 pilares no seu caderno de 10 matérias ({completedCount}/4 concluídos) para desbloquear o botão <span className="text-emerald-500 font-bold">&ldquo;🚀 Encerrar Sessão do Dia&rdquo;</span>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clique em &ldquo;Marcar como Concluído&rdquo; em cada card após anotar o tópico à mão em voz alta.
            </p>
          </div>
        )}
      </section>

      {/* MODAL DE FRICÇÃO POSITIVA (<NotebookValidationModal />) */}
      <NotebookValidationModal
        isOpen={Boolean(activeValidationPillar)}
        pillar={activeValidationPillar}
        onCancel={() => setActiveValidationPillar(null)}
        onConfirm={handleConfirmNotebookValidation}
      />
    </motion.div>
  );
}

export default DailyDashboard;

