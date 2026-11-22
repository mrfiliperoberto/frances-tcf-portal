import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  CheckCircle2,
  UploadCloud,
  Camera,
  Sparkles,
  Trash2,
  GraduationCap,
  Calendar,
  Award,
  Image as ImageIcon,
  VideoOff,
  AlertTriangle
} from 'lucide-react';
import {
  getAllVideoLessons,
  getAllStudySessions,
  saveStudySession,
  calculateCurrentStudyDay
} from '../../services/db';
import { VIDEO_LESSON_SEED } from '../../data/videoLessonSeed';

function extractYoutubeId(urlOrId) {
  if (!urlOrId) return '5U-Oia3GDBA';
  try {
    const str = String(urlOrId).trim();
    if (!str.includes('http') && !str.includes('/')) return str;
    const match = str.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
    );
    return match?.[1] || '5U-Oia3GDBA';
  } catch {
    return '5U-Oia3GDBA';
  }
}

function formatSessionDate(isoString) {
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

export function VideoLessonTab({ onCompleteDayStreak, onShowToast }) {
  const [lessons, setLessons] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentStudyDay, setCurrentStudyDay] = useState(1);
  const [selectedLessonId, setSelectedLessonId] = useState('vl_1');
  const [notebookPhotoDataUrl, setNotebookPhotoDataUrl] = useState('');
  const [notebookFileName, setNotebookFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [celebrationBanner, setCelebrationBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const fileInputRef = useRef(null);

  const loadLessonData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedLessons, storedSessions] = await Promise.all([
        getAllVideoLessons(),
        getAllStudySessions()
      ]);
      const studyDay = calculateCurrentStudyDay(storedSessions);
      setCurrentStudyDay(studyDay);

      const effectiveLessons =
        storedLessons.length >= VIDEO_LESSON_SEED.length ? storedLessons : VIDEO_LESSON_SEED;
      setLessons(effectiveLessons);
      setSessions(storedSessions);

      const dayMatch =
        effectiveLessons.find((l) => Number(l.day) === Number(studyDay)) ||
        effectiveLessons[0];
      if (dayMatch) {
        setSelectedLessonId(dayMatch.id);
      }
    } catch (err) {
      console.error('Erro ao carregar Videoaulas do IndexedDB:', err);
      setLessons(VIDEO_LESSON_SEED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);

  const currentLesson =
    lessons.find((l) => String(l.id) === String(selectedLessonId)) ||
    lessons.find((l) => Number(l.day) === Number(currentStudyDay)) ||
    lessons[0] ||
    VIDEO_LESSON_SEED[0];

  // Sempre que o URL do vídeo ou o currentStudyDay mudar, faz o reset de videoError
  useEffect(() => {
    setVideoError(false);
  }, [currentStudyDay, selectedLessonId, currentLesson?.id, currentLesson?.url]);

  // Ação de Resgate: Pular e Marcar como Concluído quando o vídeo estiver privado/indisponível
  const handleSkipAndCompleteLesson = async () => {
    if (!currentLesson || isSaving) return;
    try {
      setIsSaving(true);
      await saveStudySession({
        notebook_photo_data_url: notebookPhotoDataUrl || null,
        lesson_id: currentLesson.id,
        lesson_title: `${currentLesson.title} (Concluído via Resgate de Vídeo)`
      });

      const updatedSessions = await getAllStudySessions();
      setSessions(updatedSessions);
      setCelebrationBanner(true);
      setVideoError(false);

      if (onCompleteDayStreak) {
        onCompleteDayStreak();
      }
      if (onShowToast) {
        onShowToast(
          `✅ "${currentLesson.title}" marcada como concluída! Sua ofensiva no Dashboard está garantida.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Erro ao concluir aula via resgate:', err);
      if (onShowToast) {
        onShowToast('Aula marcada como concluída localmente.', 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Converte o arquivo de imagem em DataURL (base64) via FileReader
   */
  const processImageFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        if (onShowToast) {
          onShowToast('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).', 'error');
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultDataUrl = event.target?.result;
        if (typeof resultDataUrl === 'string') {
          setNotebookPhotoDataUrl(resultDataUrl);
          setNotebookFileName(file.name);
          setCelebrationBanner(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [onShowToast]
  );

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleClearPhoto = (e) => {
    e.stopPropagation();
    setNotebookPhotoDataUrl('');
    setNotebookFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Salva a sessão na store studySessions do IndexedDB e exibe celebração
   */
  const handleFinishStudySession = async () => {
    if (!notebookPhotoDataUrl || isSaving) return;

    try {
      setIsSaving(true);
      await saveStudySession({
        notebook_photo_data_url: notebookPhotoDataUrl,
        lesson_id: currentLesson.id,
        lesson_title: currentLesson.title
      });

      const updatedSessions = await getAllStudySessions();
      setSessions(updatedSessions);
      setCelebrationBanner(true);
      setNotebookPhotoDataUrl('');
      setNotebookFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onCompleteDayStreak) {
        onCompleteDayStreak();
      } else if (onShowToast) {
        onShowToast('🎉 Missão Cumprida! Seu progresso foi salvo.', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar sessão em studySessions:', err);
      if (onShowToast) {
        onShowToast('Erro ao salvar sessão no IndexedDB.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !currentLesson) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-sans">
        Carregando Videoaula e Fechamento do IndexedDB...
      </div>
    );
  }

  const youtubeId = extractYoutubeId(currentLesson.url || currentLesson.youtube_id);
  const videoWatchUrl =
    currentLesson.url || `https://www.youtube.com/watch?v=${youtubeId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO EDITORIAL DA ABA VIDEOAULA E FECHAMENTO */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Técnica, Gramática & Check-in Analógico
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {sessions.length} {sessions.length === 1 ? 'sessão encerrada' : 'sessões encerradas'}
            </span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white">
            Videoaula e Fechamento
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Assista à aula técnica do dia, tome notas à mão em seu caderno físico e anexe o registro fotográfico para selar sua missão diária no IndexedDB.
          </p>
        </div>

        {/* Seletor de Aulas da Store videoLessons */}
        <div className="flex flex-wrap items-center gap-2 max-h-32 overflow-y-auto">
          {lessons.slice(0, 15).map((lesson) => {
            const isSelected = String(lesson.id) === String(currentLesson.id);
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setSelectedLessonId(lesson.id)}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-semibold shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] mr-1.5 opacity-75">
                  [Jour {lesson.day || 1} • {lesson.level}]
                </span>
                <span className="font-display">{lesson.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* TOPO: PLAYER DO YOUTUBE EXIBINDO A VIDEOAULA DO DIA COM TÍTULO E TÓPICO */}
      <section className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-red-700/20 text-red-400 border border-red-600/30">
                {currentLesson.topic || `Jour ${currentLesson.day || currentStudyDay} • Fundamentos e Gramática`}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-zinc-900 text-amber-400 border border-zinc-800">
                Nível {currentLesson.level}
              </span>
            </div>

            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
              {currentLesson.title}
            </h2>
          </div>
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
              onClick={handleSkipAndCompleteLesson}
              className="mt-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Marcar como Visto e Avançar</span>
            </button>
          </div>
        ) : (
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
            <ReactPlayer
              key={youtubeId}
              src={videoWatchUrl}
              url={videoWatchUrl}
              width="100%"
              height="100%"
              controls={true}
              onError={() => setVideoError(true)}
              config={{
                youtube: {
                  rel: 0,
                  modestbranding: 1
                }
              }}
            />
          </div>
        )}

        {currentLesson.summary && (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {currentLesson.summary}
          </p>
        )}
      </section>

      {/* BANNER DE CELEBRAÇÃO APÓS SALVAR A SESSÃO */}
      <AnimatePresence>
        {celebrationBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-100 block">
                  Check-in Analógico Confirmado no IndexedDB
                </span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl">
                  Missão Cumprida! Seu progresso foi salvo.
                </h3>
                <p className="text-xs sm:text-sm text-emerald-50 mt-0.5">
                  A foto das suas anotações manuscritas foi arquivada com sucesso na sua linha do tempo de estudos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCelebrationBanner(false)}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0"
            >
              Fechar Aviso
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA DE UPLOAD (O CHECK-IN ANALÓGICO) + O GRANDE BOTÃO FINAL */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            O Check-in Analógico Obrigatório
          </span>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Anexe a Foto do seu Caderno Físico
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Arraste uma imagem ou clique na área abaixo para carregar a foto das suas anotações da aula de hoje e habilitar o encerramento da sessão.
          </p>
        </div>

        {/* Input de Arquivo Oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Dropzone Claro e Editorial */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-red-700 bg-red-50/60 dark:bg-red-950/20'
              : notebookPhotoDataUrl
              ? 'border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 hover:border-red-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-900'
          }`}
        >
          {notebookPhotoDataUrl ? (
            /* Preview (Miniatura) da Foto Carregada via FileReader */
            <div className="space-y-4 max-w-md mx-auto">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg bg-black aspect-video">
                <img
                  src={notebookPhotoDataUrl}
                  alt="Preview das anotações do caderno"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/75 hover:bg-red-700 text-white transition cursor-pointer"
                  title="Remover foto e selecionar outra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Foto pronta para validação ({notebookFileName || 'Caderno anexado'})
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center mx-auto text-red-700 dark:text-red-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                  Arraste a foto do seu caderno aqui ou clique para selecionar
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Suporta JPG, PNG ou WEBP • Convertido localmente em Base64 (DataURL) via FileReader
                </p>
              </div>
            </div>
          )}
        </div>

        {/* O GRANDE BOTÃO FINAL: 'Encerrar Sessão de Estudos' */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!notebookPhotoDataUrl || isSaving}
            onClick={handleFinishStudySession}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
              notebookPhotoDataUrl && !isSaving
                ? 'bg-red-700 hover:bg-red-600 text-white shadow-xl shadow-red-700/25 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Encerrar Sessão de Estudos</span>
          </button>
          {!notebookPhotoDataUrl && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
              * O botão acima será habilitado assim que você anexar a foto das anotações do seu caderno.
            </p>
          )}
        </div>
      </section>

      {/* GALERIA DE SESSÕES ANTERIORES SALVAS EM studySessions NO INDEXEDDB */}
      {sessions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-700 dark:text-red-400" />
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                Diário Visual de Cadernos ({sessions.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Armazenado localmente no IndexedDB
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((sessionItem) => (
              <div
                key={sessionItem.id}
                className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="aspect-video w-full bg-slate-950 overflow-hidden relative">
                  {sessionItem.notebook_photo_data_url ? (
                    <img
                      src={sessionItem.notebook_photo_data_url}
                      alt={`Caderno em ${formatSessionDate(sessionItem.date)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Concluída
                  </span>
                </div>

                <div className="p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                    <span>{formatSessionDate(sessionItem.date)}</span>
                  </div>
                  {sessionItem.lesson_title && (
                    <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {sessionItem.lesson_title}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

export default VideoLessonTab;

