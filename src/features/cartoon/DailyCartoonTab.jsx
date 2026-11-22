import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  Clapperboard,
  History,
  CheckCircle2,
  BookOpen,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  PenLine,
  Subtitles,
  Flame,
  VideoOff,
  AlertTriangle
} from 'lucide-react';
import {
  getAllStudySessions,
  getAllCartoonSummaries,
  saveCartoonSummary,
  calculateCurrentStudyDay
} from '../../services/db';
import { CARTOON_SPRINTS_SEED } from '../../data/cartoonSeed';

/**
 * Extrai o ID do vídeo do YouTube a partir de uma URL (ex: https://www.youtube.com/watch?v=kYvMvkB_B98)
 */
function extractYouTubeId(urlOrId = '') {
  if (!urlOrId) return 'kYvMvkB_B98';
  const match = String(urlOrId).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : String(urlOrId).trim();
}

function formatSummaryDate(isoString) {
  if (!isoString) return 'Hoje';
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Pesquisa em CARTOON_SPRINTS_SEED iterando por `episodes` para encontrar
 * o episódio cujo `day` seja exatamente igual ao `targetDay`.
 */
function findSprintAndEpisodeByDay(targetDay) {
  for (const sprint of CARTOON_SPRINTS_SEED) {
    if (!Array.isArray(sprint.episodes)) continue;
    const matchedEpisode = sprint.episodes.find(
      (ep) => Number(ep.day) === Number(targetDay)
    );
    if (matchedEpisode) {
      return { sprint, episode: matchedEpisode };
    }
  }

  // Fallback caso o utilizador ultrapasse o último dia cadastrado
  const lastSprint =
    CARTOON_SPRINTS_SEED[CARTOON_SPRINTS_SEED.length - 1] || CARTOON_SPRINTS_SEED[0];
  const lastEpisode =
    lastSprint.episodes[lastSprint.episodes.length - 1] || lastSprint.episodes[0];
  return { sprint: lastSprint, episode: lastEpisode };
}

export function DailyCartoonTab({ onShowToast, onCompleteDayStreak }) {
  const [studySessions, setStudySessions] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selectedDayOverride, setSelectedDayOverride] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('episode'); // 'episode' | 'history'
  const [summaryText, setSummaryText] = useState('');
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const loadCartoonAndStudyDay = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sessions, storedSummaries] = await Promise.all([
        getAllStudySessions(),
        getAllCartoonSummaries()
      ]);
      setStudySessions(sessions);
      setSummaries(storedSummaries);
      if (storedSummaries.length > 0) {
        setExpandedSummaryId((prev) => prev ?? storedSummaries[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Daily Cartoon:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCartoonAndStudyDay();
  }, [loadCartoonAndStudyDay]);

  // Lógica de "Study Day": conta o número de dias únicos em studySessions + 1
  const currentStudyDay = useMemo(
    () => calculateCurrentStudyDay(studySessions),
    [studySessions]
  );

  // Dia efetivo exibido no player (por padrão é exatamente o currentStudyDay)
  const effectiveDay = selectedDayOverride ?? currentStudyDay;

  // Pesquisa em CARTOON_SPRINTS_SEED iterando por `episodes` onde `ep.day === effectiveDay`
  const { sprint: currentSprint, episode: currentEpisode } = useMemo(
    () => findSprintAndEpisodeByDay(effectiveDay),
    [effectiveDay]
  );

  // Sempre que o URL do vídeo ou o currentStudyDay mudar, faz o reset de videoError
  useEffect(() => {
    setVideoError(false);
  }, [currentStudyDay, effectiveDay, currentEpisode?.id, currentEpisode?.url]);

  // Ação de Resgate: Pular e Marcar como Concluído quando o vídeo estiver privado/indisponível
  const handleSkipAndCompleteEpisode = async () => {
    if (!currentEpisode || isSaving) return;
    try {
      setIsSaving(true);
      const fallbackNote =
        summaryText.trim() ||
        'Episódio concluído via Ação de Resgate (vídeo privado ou reprodução externa desativada pelo criador).';

      const saved = await saveCartoonSummary({
        episode_id: currentEpisode.id,
        episode_title: currentEpisode.title,
        study_day: currentEpisode.day,
        sprint_theme: currentSprint.theme,
        summary_text: fallbackNote
      });

      const updatedSummaries = await getAllCartoonSummaries();
      setSummaries(updatedSummaries);
      setExpandedSummaryId(saved.id);
      setSummaryText('');
      setVideoError(false);

      if (onCompleteDayStreak) {
        onCompleteDayStreak();
      }
      if (onShowToast) {
        onShowToast(
          `✅ "${currentEpisode.title}" marcado como concluído! Sua ofensiva no Dashboard está garantida.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Erro ao concluir episódio via resgate:', err);
      if (onShowToast) {
        onShowToast('Tarefa marcada como concluída localmente.', 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const allEpisodesById = useMemo(() => {
    const map = new Map();
    for (const sp of CARTOON_SPRINTS_SEED) {
      for (const ep of sp.episodes || []) {
        map.set(String(ep.id), { ...ep, sprint: sp });
      }
    }
    return map;
  }, []);

  const handleSaveSummary = async (e) => {
    e.preventDefault();
    if (!currentEpisode) return;

    if (!summaryText.trim()) {
      if (onShowToast) {
        onShowToast(
          'Escreva um breve resumo do episódio antes de concluir a missão!',
          'error'
        );
      }
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveCartoonSummary({
        episode_id: currentEpisode.id,
        episode_title: currentEpisode.title,
        study_day: currentEpisode.day,
        sprint_theme: currentSprint.theme,
        summary_text: summaryText
      });

      const updatedSummaries = await getAllCartoonSummaries();
      setSummaries(updatedSummaries);
      setExpandedSummaryId(saved.id);
      setSummaryText('');

      if (onShowToast) {
        onShowToast(
          `🎬 Missão do Day ${currentEpisode.day} concluída! Resumo de "${currentEpisode.title}" salvo no Histórico.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Erro ao salvar resumo no IndexedDB:', err);
      if (onShowToast) {
        onShowToast('Erro ao salvar resumo no IndexedDB.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRewatchEpisode = (dayNum) => {
    setSelectedDayOverride(Number(dayNum));
    setActiveSubTab('episode');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading || !currentEpisode) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
        Carregando Sprints do Daily Cartoon...
      </div>
    );
  }

  const youtubeId = extractYouTubeId(currentEpisode.url || currentEpisode.youtube_id);
  const videoWatchUrl =
    currentEpisode.url || `https://www.youtube.com/watch?v=${youtubeId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO EDITORIAL DO DAILY CARTOON + STUDY DAY ATUAL */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20 flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5" />
              Sprints de Desenhos (15 Dias por Série)
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Study Day Atual: Day {currentStudyDay}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {summaries.length}{' '}
              {summaries.length === 1 ? 'resumo registrado' : 'resumos registrados'}
            </span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white">
            Daily Cartoon • Sprints de Imersão
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Progressão automática por Sprints de 15 dias consecutivos baseada no seu `currentStudyDay` calculado a partir de `studySessions`.
          </p>
        </div>

        {/* Seletor das Duas Abas Internas: 'Episódio do Dia' e 'Histórico' */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('episode')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'episode'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 text-red-700 dark:text-red-400" />
            <span>Episódio do Dia (Day {currentStudyDay})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-red-700 dark:text-red-400" />
            <span>Histórico ({summaries.length})</span>
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeSubTab === 'episode' ? (
          /* ABA 1: EPISÓDIO DO DIA (BASEADO EM currentStudyDay) */
          <motion.section
            key="subtab-episode"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Seletor de Sprints e Dias para Navegação / Inspeção */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {CARTOON_SPRINTS_SEED.map((sp) => {
                    const isActiveSprint = sp.sprintId === currentSprint.sprintId;
                    return (
                      <button
                        key={sp.sprintId}
                        type="button"
                        onClick={() => {
                          const firstEp = sp.episodes?.[0];
                          if (firstEp) setSelectedDayOverride(firstEp.day);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isActiveSprint
                            ? 'bg-red-700 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        Sprint {sp.sprintId} (Dias {sp.days}) • {sp.level}
                      </button>
                    );
                  })}
                </div>

                {selectedDayOverride !== null && selectedDayOverride !== currentStudyDay && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayOverride(null)}
                    className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Voltar ao Study Day Oficial (Day {currentStudyDay})
                  </button>
                )}
              </div>

              {/* Lista horizontal dos episódios do Sprint ativo */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {(currentSprint.episodes || []).map((ep) => {
                  const isSelected = ep.day === currentEpisode.day;
                  const isTodayOfficial = ep.day === currentStudyDay;
                  const hasSummary = summaries.some(
                    (s) =>
                      String(s.episode_id) === String(ep.id) ||
                      Number(s.study_day) === Number(ep.day)
                  );

                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => setSelectedDayOverride(ep.day)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-semibold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-mono font-bold">Day {ep.day}</span>
                      <span className="truncate max-w-[160px]">{ep.title}</span>
                      {isTodayOfficial && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-700 text-white">
                          Hoje
                        </span>
                      )}
                      {hasSummary && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Player Grande do YouTube com Título do Sprint Renderizado Acima do Vídeo */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-2xl space-y-5">
              {/* TÍTULO DO SPRINT ACIMA DO VÍDEO PARA MANTER O CONTEXTO */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 block">
                    Sprint {currentSprint.sprintId} • Dias {currentSprint.days} • Nível{' '}
                    {currentSprint.level}
                  </span>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                    {currentSprint.theme}
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-xl bg-red-700/20 border border-red-600/30 text-red-300 font-mono text-xs font-bold">
                  Study Day #{currentEpisode.day}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-zinc-400 block mb-0.5">
                    Episódio ID: {currentEpisode.id} • Day {currentEpisode.day}
                  </span>
                  <h3 className="font-display font-bold text-2xl sm:text-3xl text-white">
                    {currentEpisode.title}
                  </h3>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  <Subtitles className="w-4 h-4 text-red-400" />
                  Legendas CC Ativadas (cc_load_policy=1)
                </span>
              </div>

              {videoError ? (
                <div className="aspect-video w-full rounded-2xl bg-zinc-900 border-2 border-dashed border-amber-500/40 p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-4 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <VideoOff className="w-8 h-8" />
                  </div>

                  <div className="space-y-2 max-w-lg">
                    <p className="font-display font-bold text-lg sm:text-xl text-white leading-snug">
                      ⚠️ Erro de Reprodução: Este vídeo está privado, indisponível ou a sua ligação falhou.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSkipAndCompleteEpisode}
                    className="mt-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar como Visto e Avançar</span>
                  </button>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
                  <ReactPlayer
                    key={`${currentEpisode.id}-${youtubeId}`}
                    src={videoWatchUrl}
                    url={videoWatchUrl}
                    width="100%"
                    height="100%"
                    controls={true}
                    onError={() => setVideoError(true)}
                    config={{
                      youtube: {
                        cc_load_policy: 1,
                        cc_lang_pref: 'fr',
                        hl: 'fr',
                        rel: 0,
                        modestbranding: 1
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Lembrete Visual para o Caderno Físico */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3.5 text-amber-800 dark:text-amber-200">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-base sm:text-lg">
                  Não se esqueça de anotar o vocabulário novo no seu caderno físico!
                </p>
                <p className="text-xs sm:text-sm opacity-85">
                  A escrita manual combinada ao resumo digital abaixo multiplica a consolidação da memória de longo prazo.
                </p>
              </div>
            </div>

            {/* Área de Escrita do Resumo (Active Recall) */}
            <form
              onSubmit={handleSaveSummary}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Prática de Active Recall • Day {currentEpisode.day}
                  </span>
                  <h3 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    O que você compreendeu hoje?
                  </h3>
                </div>

                <span className="text-xs font-mono text-slate-400">
                  {summaryText.trim().length} caracteres
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Escreva em francês ou em português um resumo dos acontecimentos de{' '}
                <strong>{currentEpisode.title}</strong> ({currentSprint.theme}).
              </p>

              <textarea
                rows={6}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="Ex: Dans cet épisode, Caillou prépare des cookies dans la cuisine. J'ai retenu les expressions..."
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-700 leading-relaxed resize-y"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3.5 rounded-2xl bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-red-700/20 transition flex items-center gap-2.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Resumo e Concluir Missão</span>
                </button>
              </div>
            </form>
          </motion.section>
        ) : (
          /* ABA 2: HISTÓRICO DE EPISÓDIOS ASSISTIDOS E RESUMOS */
          <motion.section
            key="subtab-history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {summaries.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <PenLine className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                  Nenhum resumo salvo ainda
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Assista ao episódio na aba <strong>Episódio do Dia</strong> e clique em &ldquo;Salvar Resumo e Concluir Missão&rdquo; para construir seu diário de imersão.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {summaries.map((summaryItem) => {
                  const matched = allEpisodesById.get(String(summaryItem.episode_id));
                  const epTitle =
                    matched?.title ||
                    summaryItem.episode_title ||
                    `Episódio ${summaryItem.episode_id}`;
                  const epDay = matched?.day || summaryItem.study_day || 1;
                  const sprintTheme =
                    matched?.sprint?.theme || summaryItem.sprint_theme || 'Sprint';
                  const isExpanded = expandedSummaryId === summaryItem.id;

                  return (
                    <div
                      key={summaryItem.id}
                      className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSummaryId((prev) =>
                            prev === summaryItem.id ? null : summaryItem.id
                          )
                        }
                        className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="px-2.5 py-0.5 rounded-md font-mono font-bold bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20">
                              Day {epDay}
                            </span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {sprintTheme}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatSummaryDate(summaryItem.date)}
                            </span>
                          </div>

                          <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                            {epTitle}
                          </h3>

                          {!isExpanded && (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                              {summaryItem.summary_text}
                            </p>
                          )}
                        </div>

                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                              Seu Resumo Escrito
                            </span>
                            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                              {summaryItem.summary_text}
                            </p>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRewatchEpisode(epDay)}
                              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Rever Vídeo deste Episódio</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DailyCartoonTab;
