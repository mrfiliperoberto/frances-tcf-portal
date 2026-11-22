import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  MonitorPlay,
  Play,
  Tv,
  BookmarkPlus,
  Link2,
  Rewind,
  FastForward,
  PlusCircle,
  LayoutTemplate,
  PanelRight,
  VideoOff,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { YOUTUBE_CURRICULUM } from '../../data/youtubeCurriculum';
import { MOCK_TRANSCRIPT } from '../../data/mockTranscript';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import InteractiveTranscript from './InteractiveTranscript';

/**
 * Extrai o ID de 11 caracteres de qualquer URL ou string do YouTube.
 */
function extractYouTubeId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = trimmed.match(regex);
  return match ? match[1] : trimmed;
}

/**
 * Helper compatível com ReactPlayer v2 (seekTo) e v3 (HTMLMediaElement currentTime)
 */
function seekPlayerNode(node, seconds) {
  if (!node) return;
  try {
    if (typeof node.seekTo === 'function') {
      node.seekTo(seconds, 'seconds');
    } else if ('currentTime' in node) {
      node.currentTime = seconds;
    }
  } catch (_) {}
}

/**
 * Painel Isolado de Captura Rápida SM-2 no Cinema Mode
 */
const CinemaNoteCapturePanel = React.memo(function CinemaNoteCapturePanel({
  selectedCinemaItem,
  onAddCard,
  onShowToast
}) {
  const [noteFront, setNoteFront] = useState('');
  const [noteBack, setNoteBack] = useState('');

  const handleSaveCinemaNoteToSM2 = (e) => {
    e.preventDefault();
    if (!noteFront.trim() || !noteBack.trim()) return;
    if (onAddCard) {
      onAddCard({
        category: 'YouTube Cinema • Imersão',
        front: noteFront.trim(),
        back: noteBack.trim(),
        phonetic: '',
        example: selectedCinemaItem
          ? `Canal: ${selectedCinemaItem.channelName}`
          : 'Capturado no YouTube Cinema Mode'
      });
    }
    setNoteFront('');
    setNoteBack('');
    if (onShowToast) {
      onShowToast('⚡ Expressão do vídeo adicionada ao Deck SM-2!', 'success');
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <PlusCircle className="w-4 h-4" />
        <h3 className="text-xs font-extrabold uppercase tracking-wider">
          Captura Rápida para o Deck SM-2
        </h3>
      </div>
      <p className="text-xs text-zinc-400">
        Ouviu uma expressão nova no vídeo? Anote abaixo e envie direto para a fila de repetição espaçada.
      </p>

      {selectedCinemaItem?.suggestedNote && (
        <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
              Expressão Destaque do Canal
            </span>
            <button
              type="button"
              onClick={() => {
                setNoteFront(selectedCinemaItem.suggestedNote.front);
                setNoteBack(selectedCinemaItem.suggestedNote.back);
              }}
              className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
            >
              Usar nos campos ↓
            </button>
          </div>
          <p className="text-xs font-bold text-zinc-100">
            « {selectedCinemaItem.suggestedNote.front} »
          </p>
          <p className="text-[11px] text-zinc-400">
            {selectedCinemaItem.suggestedNote.back}
          </p>
        </div>
      )}

      <form onSubmit={handleSaveCinemaNoteToSM2} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Frase ou Expressão em Francês (Frente)
          </label>
          <input
            type="text"
            value={noteFront}
            onChange={(e) => setNoteFront(e.target.value)}
            placeholder="Ex: Du premier coup d'œil"
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-600"
          />
        </div>

        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Tradução / Explicação (Verso)
          </label>
          <input
            type="text"
            value={noteBack}
            onChange={(e) => setNoteBack(e.target.value)}
            placeholder="Ex: À primeira vista / num primeiro olhar"
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-600"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookmarkPlus className="w-4 h-4 shrink-0" />
            <span>⚡ SM-2</span>
          </button>
        </div>
      </form>
    </div>
  );
});

const CHANNEL_VIDEO_PRESETS = {
  'the perfect french with dylane': {
    videoId: '_CfHjzWCRUU',
    level: 'A1 • B1',
    duration: 'Curso Completo',
    description: 'Pronúncia, fonética e gramática francesa passo a passo com Dylane.',
    suggestedNote: {
      front: 'Je suis en train de réviser la grammaire',
      back: 'Estou revisando a gramática agora (être en train de + infinitivo)'
    }
  },
  'learn french with alexa': {
    videoId: 'eq--V9P4rmM',
    level: 'A1 • A2',
    duration: 'Aula Essencial',
    description: 'Cumprimentos, apresentações e verbos fundamentais com Alexa Polidoro.',
    suggestedNote: {
      front: 'Enchanté de faire votre connaissance',
      back: 'Prazer em conhecê-lo(a) (saudação formal para Tâche 1)'
    }
  },
  'francês autêntico': {
    videoId: '9cjTYUrzNRg',
    level: 'A2 • B2',
    duration: 'Método Natural',
    description: 'Aprenda a pensar em francês com o método de escuta natural do Français Authentique.',
    suggestedNote: {
      front: 'Ça coule de source',
      back: 'Isso é óbvio / flui naturalmente (expressão idiomática francesa)'
    }
  },
  'maprofdefrancais (sotaque québécois)': {
    videoId: 'ATEV9NGDpAU',
    level: 'B1 • B2',
    duration: 'Francês do Québec',
    description: 'Expressões, sotaque québécois e preparação específica para imigração no Canadá.',
    suggestedNote: {
      front: "C'est pas piqué des vers !",
      back: 'Isso é excelente / muito bom! (expressão típica do Québec)'
    }
  },
  'wandering french (compreensão oral)': {
    videoId: 'Q6kSOn5k8Hs',
    level: 'A2 • B2',
    duration: 'Escuta Québécoise',
    description: 'Cápsulas de compreensão oral com sotaque autêntico do Québec por Hélène.',
    suggestedNote: {
      front: "Il fait frette aujourd'hui au Québec",
      back: 'Está fazendo muito frio hoje no Québec'
    }
  },
  'parlez-vous french?': {
    videoId: 'RHp47OeFwV4',
    level: 'B1 • B2',
    duration: 'Gramática & Erros',
    description: 'Evite os erros mais comuns na fala e na escrita formal com Anne.',
    suggestedNote: {
      front: 'Bien que ce soit difficile, je persévère',
      back: 'Embora seja difícil, eu persevero (bien que + subjonctif)'
    }
  },
  'easy french (entrevistas reais)': {
    videoId: 'bb4zvZdrMz4',
    level: 'B1 • B2',
    duration: 'Imersão de Rua',
    description: 'Entrevistas reais nas ruas com legendas duplas para destravar a Compréhension Orale.',
    suggestedNote: {
      front: 'Franchement, ça dépend du contexte',
      back: 'Francamente, isso depende do contexto'
    }
  },
  'innerfrench (podcasts b1+)': {
    videoId: 'idcUTDJWCEk',
    level: 'B1 • B2',
    duration: 'Podcast Claro',
    description: 'Temas culturais, sociais e históricos narrados em velocidade ideal para nível intermediário.',
    suggestedNote: {
      front: 'Il faut prendre du recul sur cette question',
      back: 'É preciso ganhar perspectiva / analisar com calma essa questão'
    }
  },
  'français avec pierre': {
    videoId: 'cSvC_aYvoAg',
    level: 'B1 • B2',
    duration: 'Dicas & Exames',
    description: 'Estratégias avançadas de vocabulário, escrita e compreensão com Pierre.',
    suggestedNote: {
      front: 'En revanche, il existe une autre solution',
      back: 'Em compensação / Por outro lado, existe outra solução'
    }
  },
  'france 24 (atualidades)': {
    videoId: 'a47ckXKZjxI',
    level: 'B2 • C1',
    duration: 'Jornalismo Internacional',
    description: 'Notícias globais em francês formal para dominar o vocabulário da Tâche 3 do TCF.',
    suggestedNote: {
      front: "À l'échelle internationale, ce phénomène s'accentue",
      back: 'Em escala internacional, esse fenômeno se acentua'
    }
  },
  'hugo décrypte (resumo de notícias)': {
    videoId: '2PTDHU5sNiM',
    level: 'B2 • C1',
    duration: 'Resumo Diário',
    description: 'As principais notícias do dia resumidas em ritmo dinâmico e vocabulário atual.',
    suggestedNote: {
      front: "Faisons le point sur l'actualité du jour",
      back: 'Vamos fazer um balanço das notícias do dia'
    }
  },
  'rfi en français': {
    videoId: '5rL3PLPaemI',
    level: 'B2 • C1',
    duration: 'Rádio França Internacional',
    description: 'Reportagens e debates radiofônicos no formato exato da Compréhension Orale do TCF.',
    suggestedNote: {
      front: "D'après les spécialistes interrogés",
      back: 'Segundo os especialistas entrevistados'
    }
  },
  'le monde': {
    videoId: 'OchiVCdrK7s',
    level: 'B2 • C1',
    duration: 'Análise & Documentário',
    description: 'Mini-documentários explicativos com gráficos e linguagem jornalística de alto nível.',
    suggestedNote: {
      front: 'Cela soulève une question fondamentale',
      back: 'Isso levanta uma questão fundamental (ótimo para Tâche 3)'
    }
  },
  'caillou en français (canadá)': {
    videoId: 'FI1jKc3qqq8',
    level: 'A1 • A2',
    duration: 'Episódio Completo',
    description: 'Desenho canadense com dicção clara sobre rotina familiar, escola e cotidiano.',
    suggestedNote: {
      front: "C'est l'heure de se préparer pour partir",
      back: 'É hora de se preparar para sair'
    }
  },
  "t'choupi et doudou": {
    videoId: 'rVSp069-LPI',
    level: 'A1 • A2',
    duration: 'Episódio Completo',
    description: 'Diálogos curtos e cotidianos no presente e passé composé para assimilação rápida.',
    suggestedNote: {
      front: "Ne t'inquiète pas, je vais t'aider",
      back: 'Não se preocupe, eu vou te ajudar'
    }
  },
  'peppa pig français': {
    videoId: '12SDDsi471U',
    level: 'A1 • A2',
    duration: 'Compilação FR',
    description: 'Situações práticas (compras, passeios, médico) ideais para fixar vocabulário base.',
    suggestedNote: {
      front: "Qu'est-ce qu'on fait cet après-midi ?",
      back: 'O que vamos fazer esta tarde?'
    }
  }
};

function normalizeCurriculumRows(rawCurriculum) {
  if (!Array.isArray(rawCurriculum)) return [];
  return rawCurriculum.map((row, rIdx) => {
    const rawList = Array.isArray(row.items)
      ? row.items
      : Array.isArray(row.channels)
      ? row.channels
      : [];

    const normalizedItems = rawList.map((entry, eIdx) => {
      const channelName = entry.channelName || entry.name || 'Canal Francês';
      const lookupKey = channelName.trim().toLowerCase();
      const preset = CHANNEL_VIDEO_PRESETS[lookupKey] || {
        videoId: '_CfHjzWCRUU',
        level: 'A1 • B2',
        duration: 'Imersão FR',
        description: `Conteúdo selecionado do canal ${channelName} para prática auditiva em francês.`,
        suggestedNote: {
          front: 'Je pratique ma compréhension orale tous les jours',
          back: 'Eu pratico minha compreensão oral todos os dias'
        }
      };

      const videoId = entry.videoId || preset.videoId;
      const videoUrl = entry.videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
      const channelUrl = entry.channelUrl || entry.url || videoUrl;

      return {
        id: entry.id || `yt-item-${rIdx}-${eIdx}`,
        title: entry.title || `${channelName} — Aula & Imersão Selecionada`,
        channelName,
        channelUrl,
        videoId,
        videoUrl,
        thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        level: entry.level || preset.level,
        duration: entry.duration || preset.duration,
        description: entry.description || preset.description,
        suggestedNote: entry.suggestedNote || preset.suggestedNote
      };
    });

    return {
      id: row.id || `cat-row-${rIdx}`,
      category: row.category || `Trilha ${rIdx + 1}`,
      badge: row.badge || 'Curadoria TCF',
      subtitle:
        row.subtitle ||
        'Clique em qualquer card abaixo para carregar um episódio deste canal no player acima.',
      items: normalizedItems
    };
  });
}

export function YouTubeCinemaTab({ onAddCard, onShowToast, onCompleteDayStreak }) {
  const curriculumRows = useMemo(() => normalizeCurriculumRows(YOUTUBE_CURRICULUM), []);

  const playerRef = useRef(null);
  const cinemaTopRef = useRef(null);
  const lastThrottleRef = useRef(0);

  const initialCinemaItem = curriculumRows[0]?.items?.[0] || {
    id: 'default-yt',
    title: 'The perfect French with Dylane',
    channelName: 'The perfect French with Dylane',
    videoId: '_CfHjzWCRUU',
    videoUrl: 'https://www.youtube.com/watch?v=_CfHjzWCRUU'
  };

  const [selectedCinemaItem, setSelectedCinemaItem] = useState(initialCinemaItem);
  const [cinemaUrlInput, setCinemaUrlInput] = useState(initialCinemaItem.videoUrl);
  const [activeCinemaUrl, setActiveCinemaUrl] = useState(initialCinemaItem.videoUrl);
  const [cinemaPlaying, setCinemaPlaying] = useState(false);
  const [cinemaSpeed, setCinemaSpeed] = useState(1);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [layoutPosition, setLayoutPosition] = useState('side'); // 'side' | 'bottom'
  const [videoError, setVideoError] = useState(false);

  // Sempre que o vídeo mudar, faz o reset de videoError
  useEffect(() => {
    setVideoError(false);
  }, [activeCinemaUrl, selectedCinemaItem]);

  const handleSkipAndCompleteCinema = () => {
    setVideoError(false);
    setCinemaPlaying(false);
    if (selectedCinemaItem?.suggestedNote && onAddCard) {
      onAddCard({
        category: 'YouTube Cinema • Imersão',
        front: selectedCinemaItem.suggestedNote.front,
        back: selectedCinemaItem.suggestedNote.back,
        phonetic: '',
        example: `Canal: ${selectedCinemaItem.channelName}`
      });
    }
    if (onCompleteDayStreak) {
      onCompleteDayStreak();
    }
    if (onShowToast) {
      onShowToast(
        '✅ Conteúdo marcado como concluído! Sua ofensiva no Dashboard está garantida.',
        'success'
      );
    }
  };

  const { speakFrench } = useFrenchAudio();

  const cinemaPlayerConfig = useMemo(
    () => ({
      youtube: {
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3
      }
    }),
    []
  );

  // Throttling de 500ms no onProgress / onTimeUpdate para atualizar currentSeconds
  const handleProgress = useCallback((stateOrEvent) => {
    const now = performance.now();
    if (now - lastThrottleRef.current < 500) return;
    lastThrottleRef.current = now;

    const node = stateOrEvent?.currentTarget || playerRef.current;
    const played =
      typeof stateOrEvent?.playedSeconds === 'number'
        ? stateOrEvent.playedSeconds
        : typeof node?.currentTime === 'number'
        ? node.currentTime
        : typeof node?.getCurrentTime === 'function'
        ? node.getCurrentTime()
        : null;

    if (typeof played === 'number' && !Number.isNaN(played)) {
      setCurrentSeconds(played);
    }
  }, []);

  // Click-to-Seek acionado pelo clique em uma frase do InteractiveTranscript
  const handleSeek = useCallback((seconds) => {
    if (playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seconds, 'seconds');
      } else {
        seekPlayerNode(playerRef.current, seconds);
      }
    }
    setCurrentSeconds(seconds);
    setCinemaPlaying(true);
  }, []);

  const handleLoadCinemaVideo = (e) => {
    e.preventDefault();
    if (!cinemaUrlInput.trim()) return;
    const vidId = extractYouTubeId(cinemaUrlInput);
    const normalizedUrl = `https://www.youtube.com/watch?v=${vidId}`;
    setSelectedCinemaItem(null);
    setActiveCinemaUrl(normalizedUrl);
    setCurrentSeconds(0);
    setCinemaPlaying(true);
  };

  const handleSelectCurriculumCard = useCallback(
    (item) => {
      setSelectedCinemaItem(item);
      setCinemaUrlInput(item.videoUrl);
      setActiveCinemaUrl(item.videoUrl);
      setCurrentSeconds(0);
      setCinemaPlaying(true);
      if (cinemaTopRef.current) {
        cinemaTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (onShowToast) {
        onShowToast(`🎬 Reproduzindo: ${item.channelName}`, 'success');
      }
    },
    [onShowToast]
  );

  const handleCinemaSkip = useCallback(
    (deltaSeconds) => {
      const node = playerRef.current;
      if (!node) return;
      try {
        const current =
          typeof node.getCurrentTime === 'function'
            ? node.getCurrentTime()
            : Number(node.currentTime || currentSeconds || 0);
        const target = Math.max(0, current + deltaSeconds);
        seekPlayerNode(node, target);
        setCurrentSeconds(target);
      } catch (_) {}
    },
    [currentSeconds]
  );

  return (
    <motion.div
      ref={cinemaTopRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Cabeçalho do Módulo YouTube Cinema */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5">
              <MonitorPlay className="w-3.5 h-3.5" />
              Imersão Audiovisual & Legendas Sincronizadas
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            YouTube Cinema Mode
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Assista a conteúdos selecionados em francês com legendas interativas (Click-to-Seek), sem distrações ou recomendações.
          </p>
        </div>
      </div>

      {/* Container Escuro do Cinema Mode */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl space-y-8">
        {/* Barra de Endereço do Cinema Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-red-500 text-xs font-extrabold uppercase tracking-wider mb-1">
              <Tv className="w-4 h-4" />
              <span>YouTube Cinema • Motor de Legendas Interativas</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {selectedCinemaItem
                ? `${selectedCinemaItem.channelName} — ${selectedCinemaItem.title}`
                : 'Assista sem comentários, sem barra lateral e sem algoritmo'}
            </h2>
          </div>

          <form onSubmit={handleLoadCinemaVideo} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cinemaUrlInput}
                onChange={(e) => setCinemaUrlInput(e.target.value)}
                placeholder="Cole qualquer URL ou ID de vídeo do YouTube..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold transition shrink-0 cursor-pointer"
            >
              Carregar Vídeo
            </button>
          </form>
        </div>

        {/* Container Flex Dinâmico: Vídeo + InteractiveTranscript ('bottom' -> flex-col | 'side' -> flex-row w-2/3 + w-1/3) */}
        <div
          className={`flex gap-6 ${
            layoutPosition === 'bottom'
              ? 'flex-col'
              : 'flex-col lg:flex-row items-start'
          }`}
        >
          {/* Coluna do Player Principal */}
          <div
            className={`space-y-4 ${
              layoutPosition === 'side' ? 'w-full lg:w-2/3' : 'w-full'
            }`}
          >
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
                  onClick={handleSkipAndCompleteCinema}
                  className="mt-1 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar como Visto e Avançar</span>
                </button>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
                <ReactPlayer
                  ref={playerRef}
                  src={activeCinemaUrl}
                  url={activeCinemaUrl}
                  width="100%"
                  height="100%"
                  playing={cinemaPlaying}
                  playbackRate={cinemaSpeed}
                  progressInterval={500}
                  controls={true}
                  onProgress={handleProgress}
                  onTimeUpdate={handleProgress}
                  onPlay={() => setCinemaPlaying(true)}
                  onPause={() => setCinemaPlaying(false)}
                  onError={() => setVideoError(true)}
                  config={cinemaPlayerConfig}
                />
              </div>
            )}

            {/* Barra de Ferramentas do Player + Alternância de Layout */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCinemaSkip(-5)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition cursor-pointer"
                  title="Voltar 5 segundos para ouvir a frase novamente"
                >
                  <Rewind className="w-3.5 h-3.5 text-red-400" />
                  <span>-5s (Repetir Frase)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCinemaSkip(5)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition cursor-pointer"
                >
                  <span>+5s</span>
                  <FastForward className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400 mr-1">Velocidade:</span>
                  {[0.75, 1, 1.25].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setCinemaSpeed(spd)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        cinemaSpeed === spd
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setLayoutPosition((prev) => (prev === 'bottom' ? 'side' : 'bottom'))
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-100 transition cursor-pointer"
                  title="Alternar posição das legendas (Ao Lado ou Abaixo do Vídeo)"
                >
                  {layoutPosition === 'bottom' ? (
                    <>
                      <PanelRight className="w-4 h-4 text-red-400" />
                      <span>Alternar Layout (Lado a Lado)</span>
                    </>
                  ) : (
                    <>
                      <LayoutTemplate className="w-4 h-4 text-red-400" />
                      <span>Alternar Layout (Legenda Abaixo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Subcomponente InteractiveTranscript (w-1/3 ao lado ou w-full abaixo) */}
          <div className={layoutPosition === 'side' ? 'w-full lg:w-1/3' : 'w-full'}>
            <InteractiveTranscript
              transcript={MOCK_TRANSCRIPT}
              currentSeconds={currentSeconds}
              onSeek={handleSeek}
              layoutPosition={layoutPosition}
              onToggleLayout={() =>
                setLayoutPosition((prev) => (prev === 'bottom' ? 'side' : 'bottom'))
              }
              onSpeakFrench={speakFrench}
              onAddCard={onAddCard}
              onShowToast={onShowToast}
            />
          </div>
        </div>

        {/* Painel de Captura Rápida para o Deck SM-2 */}
        <CinemaNoteCapturePanel
          selectedCinemaItem={selectedCinemaItem}
          onAddCard={onAddCard}
          onShowToast={onShowToast}
        />

        {/* CATÁLOGO CURADO EM FORMATO STREAMING ROWS */}
        <div className="pt-6 border-t border-zinc-800/80 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
                Catálogo Curado • Zero Algoritmo
              </span>
              <h3 className="text-lg sm:text-xl font-display font-extrabold text-white">
                Canais & Episódios Selecionados por Nível (A1 ao B2)
              </h3>
            </div>
            <span className="text-xs text-zinc-400">
              Clique em qualquer card para carregar imediatamente no player acima
            </span>
          </div>

          {curriculumRows.map((row) => (
            <div key={row.id} className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-bold text-base sm:text-lg text-white">
                      {row.category}
                    </h4>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                      {row.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{row.subtitle}</p>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-thin">
                {row.items.map((item) => {
                  const isCurrentVideo = activeCinemaUrl.includes(item.videoId);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectCurriculumCard(item)}
                      className={`group snap-start shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isCurrentVideo
                          ? 'bg-zinc-900 border-red-600 ring-2 ring-red-600/30 shadow-xl shadow-red-600/10'
                          : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 hover:-translate-y-0.5'
                      }`}
                    >
                      <div>
                        <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                              {item.level}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/80 text-zinc-200 backdrop-blur-sm">
                              {item.duration}
                            </span>
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center">
                            {isCurrentVideo ? (
                              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                <Play className="w-3 h-3 fill-white" />
                                No Player
                              </span>
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-red-600/40">
                                <Play className="w-5 h-5 fill-white ml-0.5" />
                              </div>
                            )}
                          </div>

                          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                            <span className="text-xs font-bold text-red-400 truncate">
                              {item.channelName}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-1.5">
                          <h5 className="font-bold text-sm text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h5>
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-3.5 pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-zinc-300 group-hover:text-white flex items-center gap-1">
                          <Play className="w-3 h-3 text-red-500 fill-red-500" />
                          {isCurrentVideo ? 'Assistindo agora' : 'Assistir no Cinema Mode'}
                        </span>
                        <a
                          href={item.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-zinc-300 underline"
                          title="Abrir canal oficial no YouTube em nova aba"
                        >
                          Canal Oficial ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default YouTubeCinemaTab;

