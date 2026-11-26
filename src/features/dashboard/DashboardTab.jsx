import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  BookMarked,
  Clapperboard,
  BookOpen,
  GraduationCap,
  Award,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  Newspaper,
  CalendarClock
} from 'lucide-react';
import {
  getAllStudySessions,
  getAllDailyWords,
  getDailyWordsDueToday,
  completeDailyWordReview,
  getAllCartoonSummaries,
  getAllGuidedReadingChapters,
  getTCFHistory
} from '../../services/db';
import { formatDateYYYYMMDD } from '../../services/sm2Algorithm';

/**
 * Calcula quantos dias consecutivos o usuário encerrou sessões na store studySessions.
 */
function calculateConsecutiveStreak(sessions = [], fallbackStreak = 0) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return fallbackStreak;
  }

  const uniqueDays = new Set(
    sessions
      .filter((s) => s && s.date && s.is_completed !== false)
      .map((s) => formatDateYYYYMMDD(new Date(s.date)))
  );

  if (uniqueDays.size === 0) return fallbackStreak;

  const cursor = new Date();
  const todayKey = formatDateYYYYMMDD(cursor);

  if (!uniqueDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!uniqueDays.has(formatDateYYYYMMDD(cursor))) {
      return 0;
    }
  }

  let streakCount = 0;
  while (uniqueDays.has(formatDateYYYYMMDD(cursor))) {
    streakCount += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return Math.max(streakCount, fallbackStreak);
}

function isSameLocalDay(isoOrDateString) {
  if (!isoOrDateString) return false;
  try {
    const todayKey = formatDateYYYYMMDD(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateString)) {
      return isoOrDateString === todayKey;
    }
    return formatDateYYYYMMDD(new Date(isoOrDateString)) === todayKey;
  } catch {
    return false;
  }
}

export function DashboardTab({ onNavigateTab, fallbackStreak = 0 }) {
  const [streak, setStreak] = useState(fallbackStreak);
  const [missionStatus, setMissionStatus] = useState({
    dicionario: false,
    cartoon: false,
    leitura: false,
    videoaula: false
  });
  const [dueWordsToday, setDueWordsToday] = useState([]);
  const [scheduledWords, setScheduledWords] = useState([]);
  const [masteredWordsCount, setMasteredWordsCount] = useState(0);
  const [latestTcf, setLatestTcf] = useState(null);
  const [totalSessionsCount, setTotalSessionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = formatDateYYYYMMDD(new Date());

  const loadDashboardMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        sessions,
        dailyWords,
        dueTodayList,
        cartoonSummaries,
        guidedChapters,
        tcfHistory
      ] = await Promise.all([
        getAllStudySessions(),
        getAllDailyWords(),
        getDailyWordsDueToday(todayStr),
        getAllCartoonSummaries(),
        getAllGuidedReadingChapters(),
        getTCFHistory()
      ]);

      setTotalSessionsCount(sessions.length);

      // 1. Cálculo da Ofensiva (Streak) a partir de studySessions
      const computedStreak = calculateConsecutiveStreak(sessions, fallbackStreak);
      setStreak(computedStreak);

      // 2. Cobrança Estrita 15-30-45: palavras cujo array reviewDates contém a string de hoje
      setDueWordsToday(dueTodayList);
      setScheduledWords(
        dailyWords.filter(
          (w) => !w.isMastered && Array.isArray(w.reviewDates) && w.reviewDates.length > 0
        )
      );
      setMasteredWordsCount(dailyWords.filter((w) => w.isMastered).length);

      // 3. Status do Dia
      const hasStudySessionToday = sessions.some(
        (s) => s.is_completed !== false && isSameLocalDay(s.date)
      );
      const hasWordStudiedToday = dailyWords.some(
        (w) =>
          w.estudado &&
          (isSameLocalDay(w.studiedAt) || isSameLocalDay(w.ultima_revisao))
      );
      const hasCartoonToday = cartoonSummaries.some((c) => isSameLocalDay(c.date));
      const hasReadingCompleted = guidedChapters.some((ch) => ch.is_completed);

      setMissionStatus({
        dicionario: hasStudySessionToday || hasWordStudiedToday,
        cartoon: hasStudySessionToday || hasCartoonToday,
        leitura: hasStudySessionToday || hasReadingCompleted,
        videoaula: hasStudySessionToday
      });

      // 4. Último resultado na store tcfHistory
      if (Array.isArray(tcfHistory) && tcfHistory.length > 0) {
        setLatestTcf(tcfHistory[0]);
      } else {
        setLatestTcf(null);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas do Dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fallbackStreak, todayStr]);

  useEffect(() => {
    loadDashboardMetrics();
  }, [loadDashboardMetrics]);

  const handleCompleteDueReview = async (wordId, targetDate = todayStr) => {
    try {
      await completeDailyWordReview(wordId, targetDate);
      await loadDashboardMetrics();
    } catch (err) {
      console.error('Erro ao concluir revisão no Dashboard:', err);
    }
  };

  const missions = [
    {
      id: 'dicionario',
      step: 'Missão 01',
      title: 'Dicionário Diário (Ciclo 15-30-45)',
      subtitle: 'Palavra do Dia, áudio nativo, vídeo contextual e agendamento 15-30-45d',
      icon: BookMarked,
      done: missionStatus.dicionario
    },
    {
      id: 'cartoon',
      step: 'Missão 02',
      title: 'Daily Cartoon',
      subtitle: 'Episódio em francês com legendas CC e resumo de Active Recall',
      icon: Clapperboard,
      done: missionStatus.cartoon
    },
    {
      id: 'leitura',
      step: 'Missão 03',
      title: 'Leitura Guiada Interativa',
      subtitle: 'Le Petit Prince com tradução no Hover e Google Neural TTS (fr-CA)',
      icon: BookOpen,
      done: missionStatus.leitura
    },
    {
      id: 'videoaula',
      step: 'Missão 04',
      title: 'Teoria em Vídeo',
      subtitle: 'Aula técnica + foto do caderno físico para encerrar o dia',
      icon: GraduationCap,
      done: missionStatus.videoaula
    }
  ];

  const completedCount = missions.filter((m) => m.done).length;
  const progressPercentage = Math.round((completedCount / missions.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* HERO EDITORIAL + DESTAQUE DE OFENSIVA (STREAK 🔥) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Boas-vindas Editorial (8 cols) */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" />
                Painel Central de Imersão
              </span>
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                Hoje: {todayStr}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-slate-900 dark:text-white">
              Bonjour ! Prêt pour votre mission ?
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Complete as 4 etapas metodológicas do seu ritual diário e acompanhe suas revisões estritas de 15, 30 e 45 dias.
            </p>
          </div>

          {/* Barra de Progresso do Dia */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Progresso das Missões de Hoje
              </span>
              <span className="text-red-700 dark:text-red-400 font-mono font-bold">
                {completedCount}/4 Concluídas ({progressPercentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card de Gamificação: Ofensiva (Streak 🔥) lida de studySessions (4 cols) */}
        <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 border border-zinc-800 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Ofensiva de Estudos
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {totalSessionsCount} check-ins
            </span>
          </div>

          <div className="my-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
              <span role="img" aria-label="Fogo">
                🔥
              </span>
            </div>
            <div>
              <div className="font-display font-extrabold text-4xl sm:text-5xl text-white leading-none">
                {isLoading ? '...' : streak}
              </div>
              <p className="text-sm sm:text-base font-bold text-amber-400 mt-1">
                {streak === 1 ? '1 dia seguido' : `${streak} dias seguidos`}
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {missionStatus.videoaula
              ? '✅ Sua sessão de hoje já foi registrada com foto do caderno!'
              : 'Encerre a sessão na aba "Teoria em Vídeo" hoje para ampliar sua sequência.'}
          </p>
        </div>
      </section>

      {/* COBRANÇA DE REVISÕES DO DIA (MOTOR ESTRITO 15, 30 E 45 DIAS) */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-700/10 text-red-700 dark:text-red-400">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400 block">
                Motor de Revisão Estrita • 15, 30 e 45 Dias
              </span>
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                Cobrança de Hoje ({todayStr})
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              Para Hoje: {dueWordsToday.length}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              No Ciclo: {scheduledWords.length}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
              Dominadas (45d): {masteredWordsCount}
            </span>
          </div>
        </div>

        {dueWordsToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueWordsToday.map((word) => {
              const isDay45 =
                Array.isArray(word.reviewDates) &&
                (word.reviewDates.length === 1 ||
                  word.reviewDates[word.reviewDates.length - 1] === todayStr);

              return (
                <div
                  key={word.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-red-700/30 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-xl text-slate-900 dark:text-white">
                        {word.palavra}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        ({word.nivel})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {word.traducao} • Estudada em: {word.studiedAt}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteDueReview(word.id, todayStr)}
                    className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold shrink-0 cursor-pointer transition"
                  >
                    {isDay45 ? 'Concluir 45d (Dominar)' : 'Concluir Revisão'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                Nenhuma palavra agendada para revisão na data de hoje ({todayStr})
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {scheduledWords.length > 0
                  ? `Você possui ${scheduledWords.length} palavra(s) agendada(s) para suas próximas janelas de +15, +30 e +45 dias.`
                  : 'Vá até o Dicionário Diário e marque o checkbox da Palavra do Dia para iniciar o ciclo 15-30-45.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('dicionario')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 cursor-pointer"
            >
              Abrir Dicionário Diário
            </button>
          </div>
        )}
      </section>

      {/* CHECKLIST DAS 4 MISSÕES DO DIA */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
              Checklist de Missões Diárias
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Clique em qualquer etapa abaixo para iniciar ou revisar sua atividade do dia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map((mission) => {
            const Icon = mission.icon;
            return (
              <div
                key={mission.id}
                onClick={() => onNavigateTab && onNavigateTab(mission.id)}
                className={`group p-6 rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  mission.done
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-500/40 shadow-xs'
                    : 'bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800/80 hover:border-red-700/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      mission.done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-red-700 dark:text-red-400 group-hover:bg-red-700 group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {mission.step}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          mission.done
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {mission.done ? 'Concluída Hoje ✓' : 'Pendente'}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                      {mission.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {mission.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-1">
                  {mission.done ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 dark:text-slate-700 group-hover:text-red-700 transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RODAPÉ DO DASHBOARD: RESUMO DO TCF (tcfHistory) + NEWSLETTER */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card Resumo do TCF */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-red-700/10 text-red-700 dark:text-red-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                  Histórico Oficial IndexedDB
                </span>
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                  Desempenho no Simulador TCF Canada
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('tcf')}
              className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir Simulador</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {latestTcf ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Última Simulação ({latestTcf.mode || 'Expressão'}) • {latestTcf.date || 'Recente'}
                </span>
                <p className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                  Nível Alcançado:{' '}
                  <span className="text-red-700 dark:text-red-400">
                    {latestTcf.nclc || 'NCLC 7'}
                  </span>
                </p>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pontuação
                </span>
                <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                  {latestTcf.score || '450/699'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Nenhum simulado registrado ainda
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Realize uma prova cronometrada de Compreensão ou Expressão para registrar seu primeiro nível NCLC.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('tcf')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 cursor-pointer"
              >
                Iniciar Simulado
              </button>
            </div>
          )}
        </div>

        {/* Card Bônus: Leitura de Jornal (Newsletter) */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400 block">
              Leitura Bônus
            </span>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Le Courrier Francophone
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('newsletter')}
            className="w-full p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Newspaper className="w-6 h-6 text-red-700 dark:text-red-400" />
              <div>
                <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Abrir Edição da Newsletter
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notícias bilíngues com tradução contextual e áudio no hover
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>
    </motion.div>
  );
}

export default DashboardTab;
