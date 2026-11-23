import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookA,
  Volume2,
  Mic,
  Square,
  Sparkles,
  BookmarkPlus,
  Check,
  Search,
  Filter,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { PRONUNCIATION_DICT } from '../../data/pronunciationDict';
import { db, syncDailyDictionarySeed } from '../../services/db';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { evaluateShadowingAudio, getGeminiApiKey } from '../../services/geminiService';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const PRONUNCIATION_LEVELS = ['Todos', 'A1', 'A2', 'B1', 'B2'];

/**
 * Extrai a letra inicial normalizada (A-Z, sem acentos) a partir da palavra.
 */
function getNormalizedFirstLetter(word) {
  if (!word) return '';
  const normalized = word
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '');
  return normalized.charAt(0).toUpperCase();
}

/**
 * Remove observações entre parênteses da palavra ao enviar para fallback TTS
 */
function cleanWordForSpeech(word) {
  return (word || '').replace(/\s*\(.*?\)\s*/g, '').trim();
}

/**
 * Gera uma dica fonética automática inteligente a partir da transcrição IPA
 * caso o item do dicionário não possua um campo `tip` explícito.
 */
function getSmartPhoneticTip(item) {
  if (item.tip) return item.tip;
  const ipa = item.ipa || '';
  const hints = [];

  if (ipa.includes('ɑ̃') || ipa.includes('ɛ̃') || ipa.includes('ɔ̃') || ipa.includes('œ̃')) {
    hints.push('Contém vogal nasal: projete o ar pelo nariz sem pronunciar o "n/m" consonantal.');
  }
  if (ipa.includes('ʁ')) {
    hints.push('Contém o R uvular francês (/ʁ/) vibrado suavemente no fundo da garganta.');
  }
  if (ipa.includes('y')) {
    hints.push('Contém a vogal /y/: arredonde os lábios como "u", mas posicione a língua como "i".');
  }
  if (ipa.includes('ø') || ipa.includes('œ')) {
    hints.push('Contém vogal anterior arredondada (/ø/ ou /œ/): arredonde os lábios pronunciando "ê/é".');
  }
  if (ipa.includes('ɥ')) {
    hints.push('Contém semivogal /ɥ/ (como em "lui" / "aujourd\'hui"): transição rápida de /y/ para a vogal seguinte.');
  }
  if (ipa.includes('ʃ') || ipa.includes('ʒ')) {
    hints.push('Atenção às consoantes chiantes (/ʃ/ de "ch" ou /ʒ/ de "j/g").');
  }

  if (hints.length === 0) {
    return `Pronuncie apoiando a tonicidade suavemente na última sílaba sonora (${ipa}).`;
  }
  return hints.join(' ');
}

export function PronunciationLibraryTab({ onAddCard, onShowToast }) {
  // Lista de palavras sincronizada com o IndexedDB (incluindo reviewCount)
  const [words, setWords] = useState(() =>
    PRONUNCIATION_DICT.map((item) => ({
      ...item,
      reviewCount: item.reviewCount ?? 0
    }))
  );

  // Filtros do Topo
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedLetter, setSelectedLetter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Sincroniza reviewCount do IndexedDB (db.dailyWords) ao montar
  useEffect(() => {
    let isMounted = true;
    async function loadWordsWithReviewCounts() {
      try {
        await syncDailyDictionarySeed();
        const stored = await db.dailyWords.toArray();
        const countById = new Map();
        stored.forEach((record) => {
          if (record && record.id !== undefined) {
            countById.set(String(record.id), Number(record.reviewCount || 0));
          }
        });

        if (isMounted) {
          setWords(
            PRONUNCIATION_DICT.map((item) => ({
              ...item,
              reviewCount: countById.get(String(item.id)) ?? 0
            }))
          );
        }
      } catch (err) {
        console.error('Erro ao carregar reviewCount da Biblioteca de Pronúncia:', err);
      }
    }
    loadWordsWithReviewCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Estado de reprodução de áudio humano HTML5
  const htmlAudioRef = useRef(null);
  const [playingNativeId, setPlayingNativeId] = useState(null);
  const [audioSourceBadge, setAudioSourceBadge] = useState({}); // { [id]: 'human' | 'tts' }

  // Estado de cartões salvos no SM-2
  const [savedIds, setSavedIds] = useState({});

  // Estado de gravação e avaliação por card via Gemini
  const [activeRecordCardId, setActiveRecordCardId] = useState(null);
  const [evaluatingCardId, setEvaluatingCardId] = useState(null);
  const [evaluationsByCard, setEvaluationsByCard] = useState({});
  const [recordedAudioByCard, setRecordedAudioByCard] = useState({});

  const { speakText } = useFrenchAudio();
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    mimeType,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
    getBase64
  } = useAudioRecorder();

  const hasApiKey = Boolean(getGeminiApiKey());

  // Extrai dinamicamente todas as categorias presentes no PRONUNCIATION_DICT
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(PRONUNCIATION_DICT.map((item) => item.category).filter(Boolean))
    ).sort();
    return ['Todas', ...unique];
  }, []);

  // Letras disponíveis no dicionário para destacar no índice A-Z
  const availableLetters = useMemo(() => {
    return new Set(
      PRONUNCIATION_DICT.map((item) => item.letter || getNormalizedFirstLetter(item.word)).filter(
        Boolean
      )
    );
  }, []);

  // Sempre que o gravador finalizar um novo audioUrl, associa ao card ativo
  useEffect(() => {
    if (audioUrl && activeRecordCardId) {
      setRecordedAudioByCard((prev) => ({
        ...prev,
        [activeRecordCardId]: audioUrl
      }));
    }
  }, [audioUrl, activeRecordCardId]);

  useEffect(() => {
    if (recorderError && onShowToast) {
      onShowToast(recorderError, 'error');
    }
  }, [recorderError, onShowToast]);

  // Filtra as palavras com base em Nível, Categoria, Letra A-Z e Busca
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return words.filter((item) => {
      const itemLetter = item.letter || getNormalizedFirstLetter(item.word);
      const matchLevel = selectedLevel === 'Todos' || item.level === selectedLevel;
      const matchCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchLetter = selectedLetter === 'Todas' || itemLetter === selectedLetter;
      const matchSearch =
        !q ||
        (item.word || '').toLowerCase().includes(q) ||
        (item.translation || '').toLowerCase().includes(q) ||
        (item.ipa || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q);

      return matchLevel && matchCategory && matchLetter && matchSearch;
    });
  }, [words, selectedLevel, selectedCategory, selectedLetter, searchQuery]);

  /**
   * Toca o áudio humano nativo via tag HTML5 <audio> e incrementa reviewCount no IndexedDB.
   * Se falhar (CORS, 404, offline, URL vazia), aciona silenciosamente o fallback TTS (useFrenchAudio).
   */
  const handlePlayNativeAudio = useCallback(
    async (word) => {
      // Incrementa reviewCount no Dexie (db.dailyWords) e atualiza o estado local imediatamente
      try {
        const currentWord = await db.dailyWords.get(word.id);
        const newCount = (currentWord?.reviewCount || 0) + 1;
        if (currentWord) {
          await db.dailyWords.update(word.id, { reviewCount: newCount });
        } else {
          await db.dailyWords.put({ ...word, reviewCount: newCount });
        }
        setWords((prev) =>
          prev.map((w) => (w.id === word.id ? { ...w, reviewCount: newCount } : w))
        );
      } catch (err) {
        console.error('Erro ao atualizar reviewCount no IndexedDB:', err);
        setWords((prev) =>
          prev.map((w) =>
            w.id === word.id ? { ...w, reviewCount: (w.reviewCount || 0) + 1 } : w
          )
        );
      }

      if (htmlAudioRef.current) {
        try {
          htmlAudioRef.current.pause();
          htmlAudioRef.current.currentTime = 0;
        } catch (_) {}
      }

      const fallbackToTTS = () => {
        setPlayingNativeId(word.id);
        setAudioSourceBadge((prev) => ({ ...prev, [word.id]: 'tts' }));
        speakText(cleanWordForSpeech(word.word), 0.88);
        setTimeout(() => {
          setPlayingNativeId((curr) => (curr === word.id ? null : curr));
        }, 1200);
      };

      if (!word.humanAudioUrl) {
        fallbackToTTS();
        return;
      }

      setPlayingNativeId(word.id);

      try {
        // Se for URL do Google Translate TTS, usa o proxy local /__tts para evitar bloqueio ORB/CORS do navegador
        const isGoogleTts = word.humanAudioUrl.includes('translate.google.com/translate_tts');
        const effectiveSrc = isGoogleTts
          ? `/__tts?url=${encodeURIComponent(word.humanAudioUrl)}`
          : word.humanAudioUrl;

        const res = await fetch(effectiveSrc, { cache: 'force-cache' });
        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        if (!res.ok || (!contentType.includes('audio') && !contentType.includes('mpeg') && !contentType.includes('ogg'))) {
          fallbackToTTS();
          return;
        }

        const blob = await res.blob();
        if (!blob || blob.size < 100) {
          fallbackToTTS();
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        htmlAudioRef.current = audio;

        const cleanupBlob = () => {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (_) {}
        };

        audio.onended = () => {
          cleanupBlob();
          setPlayingNativeId((curr) => (curr === word.id ? null : curr));
        };

        audio.onerror = () => {
          cleanupBlob();
          fallbackToTTS();
        };

        await audio.play();
        setAudioSourceBadge((prev) => ({ ...prev, [word.id]: 'human' }));
      } catch (_) {
        fallbackToTTS();
      }
    },
    [speakText]
  );

  /**
   * Salva a palavra diretamente no Deck SM-2 (IndexedDB)
   */
  const handleSaveWordToDeck = (item) => {
    if (savedIds[item.id]) return;

    const smartTip = getSmartPhoneticTip(item);
    if (onAddCard) {
      onAddCard({
        category: `Pronúncia A-Z • ${item.category || 'Vocabulário'}`,
        front: `${item.word} ${item.ipa || ''}`.trim(),
        back: `${item.translation}\n\nDica Fonética: ${smartTip}`,
        phonetic: item.ipa || '',
        example: item.example || `Palavra-chave (${item.level}): ${item.word} — ${item.translation}`,
        tip: smartTip
      });
    }

    setSavedIds((prev) => ({ ...prev, [item.id]: true }));
    if (onShowToast) {
      onShowToast(`⚡ "${item.word}" adicionada ao seu Deck SM-2!`, 'success');
    }
  };

  /**
   * Inicia ou para a gravação no card selecionado
   */
  const handleToggleRecordCard = async (item) => {
    if (isRecording && activeRecordCardId === item.id) {
      stopRecording();
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    clearRecording();
    setActiveRecordCardId(item.id);
    await startRecording();
  };

  /**
   * Envia o áudio gravado da palavra para o Gemini avaliar (nota 0-100 + micro-dica fonética)
   */
  const handleEvaluateWordWithGemini = async (item) => {
    if (!audioBlob || activeRecordCardId !== item.id) {
      if (onShowToast) {
        onShowToast('Grave sua pronúncia desta palavra primeiro!', 'error');
      }
      return;
    }

    const smartTip = getSmartPhoneticTip(item);
    setEvaluatingCardId(item.id);
    try {
      const base64Audio = await getBase64();
      const result = await evaluateShadowingAudio({
        base64Audio,
        mimeType,
        targetSentence: cleanWordForSpeech(item.word),
        focusPoints: [
          `Transcrição fonética IPA esperada: ${item.ipa}`,
          `Categoria: ${item.category}`,
          `Foco fonético: ${smartTip}`
        ]
      });

      setEvaluationsByCard((prev) => ({
        ...prev,
        [item.id]: result
      }));

      if (onShowToast) {
        onShowToast(
          `🎯 Avaliação concluída: ${result.pronunciationScore}/100 em "${item.word}"!`,
          'success'
        );
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast(`Erro ao avaliar pronúncia: ${err.message}`, 'error');
      }
    } finally {
      setEvaluatingCardId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Cabeçalho Principal */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1.5">
              <BookA className="w-3.5 h-3.5" />
              Dicionário Fonético Híbrido ({PRONUNCIATION_DICT.length} palavras)
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" />
              Áudio Humano Nativo + Fallback TTS
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Biblioteca de Pronúncia A-Z
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Domine os sons mais difíceis do francês (vogais nasais, <em>/u/ vs /y/</em>, R uvular e falsos cognatos) com gravações humanas nativas e avaliação fonética via Gemini.
          </p>
        </div>

        {/* Indicador de Status da API Gemini */}
        <div className="flex items-center gap-2 self-start lg:self-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-slate-700 dark:text-slate-300">
            {hasApiKey ? 'Avaliador Fonético Gemini Ativo' : 'Modo Demonstrativo (Sem Chave)'}
          </span>
        </div>
      </div>

      {/* Painel Superior de Filtros: Busca, Nível, Categoria Fonética e Índice A-Z */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Busca Rápida */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar palavra, IPA ou tradução..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Filtro por Nível (A1-B2) */}
          <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Nível:
            </span>
            {PRONUNCIATION_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedLevel === lvl
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Seletor de Categoria Fonética */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  Categoria: {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Índice Alfabético A-Z */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedLetter('Todas')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold shrink-0 transition ${
                selectedLetter === 'Todas'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              A-Z ({PRONUNCIATION_DICT.length})
            </button>

            {ALPHABET.map((letter) => {
              const hasWords = availableLetters.has(letter);
              const isSelected = selectedLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasWords}
                  onClick={() => setSelectedLetter(isSelected ? 'Todas' : letter)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm'
                      : hasWords
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-500/15 hover:text-rose-500'
                      : 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono font-semibold text-slate-400">
            Exibindo {filteredWords.length} de {PRONUNCIATION_DICT.length} palavras
          </span>
        </div>
      </div>

      {/* Grid de Cards de Palavras */}
      {filteredWords.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhuma palavra encontrada para os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedLevel('Todos');
              setSelectedCategory('Todas');
              setSelectedLetter('Todas');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((item) => {
            const isSaved = Boolean(savedIds[item.id]);
            const isThisCardRecording = isRecording && activeRecordCardId === item.id;
            const isThisCardEvaluating = evaluatingCardId === item.id;
            const hasRecordedAudio =
              (activeRecordCardId === item.id && Boolean(audioBlob)) ||
              Boolean(recordedAudioByCard[item.id]);
            const cardAudioUrl =
              activeRecordCardId === item.id && audioUrl
                ? audioUrl
                : recordedAudioByCard[item.id];
            const cardEval = evaluationsByCard[item.id];
            const sourceBadge = audioSourceBadge[item.id];
            const smartTip = getSmartPhoneticTip(item);

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-rose-500/40 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Topo do Card: Palavra, IPA, Nível e Categoria */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white flex items-center">
                          <span>{item.word}</span>
                          {item.reviewCount > 0 && (
                            <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-full ml-2">
                              🎧 {item.reviewCount}x
                            </span>
                          )}
                        </h3>
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 font-mono text-xs sm:text-sm font-bold border border-rose-500/20">
                          {item.ipa}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                        {item.translation}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.level}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 text-right">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Explicação Fonética Cirúrgica */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
                    <p>
                      <strong className="text-rose-500 uppercase tracking-wider text-[10px] mr-1.5">
                        Dica Fonética:
                      </strong>
                      {smartTip}
                    </p>
                    {item.example && (
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="italic text-slate-500 dark:text-slate-400">
                          « {item.example} »
                        </span>
                        <button
                          type="button"
                          onClick={() => speakText(item.example, 0.92)}
                          className="shrink-0 p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition"
                          title="Ouvir frase de exemplo"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Principais do Card */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Botão Ouvir Nativo (HTML5 Audio + Fallback TTS) */}
                    <button
                      type="button"
                      onClick={() => handlePlayNativeAudio(item)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                        playingNativeId === item.id
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>
                        {playingNativeId === item.id ? 'Tocando...' : 'Ouvir Nativo'}
                      </span>
                    </button>

                    {/* 2. Botão Gravar e Avaliar */}
                    <button
                      type="button"
                      onClick={() => handleToggleRecordCard(item)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                        isThisCardRecording
                          ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isThisCardRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Parar ({recordingTime}s)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-rose-500" />
                          <span>Gravar e Avaliar</span>
                        </>
                      )}
                    </button>

                    {/* 3. Botão Salvar no Deck SM-2 */}
                    <button
                      type="button"
                      onClick={() => handleSaveWordToDeck(item)}
                      disabled={isSaved}
                      className={`ml-auto flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                        isSaved
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 cursor-default'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvo</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>⚡ SM-2</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Badge discreto informando se o áudio nativo veio do Wikimedia ou Fallback TTS */}
                  {sourceBadge && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {sourceBadge === 'human'
                          ? 'Áudio Nativo fr-CA (Google TTS / Human)'
                          : 'Voz Francesa Local (Fallback TTS)'}
                      </span>
                    </div>
                  )}

                  {/* Player da Gravação do Usuário + Botão Avaliar com Gemini */}
                  {hasRecordedAudio && !isThisCardRecording && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                      <audio src={cardAudioUrl} controls className="h-8 w-full" />

                      {activeRecordCardId === item.id && audioBlob && (
                        <button
                          type="button"
                          onClick={() => handleEvaluateWordWithGemini(item)}
                          disabled={isThisCardEvaluating}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isThisCardEvaluating
                              ? 'Avaliando som...'
                              : 'Avaliar Pronúncia (Gemini)'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Resultado da Micro-Avaliação Fonética do Gemini (0 a 100 + Micro-dica) */}
                  {cardEval && (
                    <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Diagnóstico Gemini
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-mono font-extrabold ${
                            cardEval.pronunciationScore >= 80
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : cardEval.pronunciationScore >= 60
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {cardEval.pronunciationScore}/100
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong>Micro-dica: </strong>
                        {cardEval.surgicalFeedback}
                      </p>

                      {cardEval.spokenTranscription && (
                        <p className="text-[11px] font-mono text-slate-400">
                          Detectado: {cardEval.spokenTranscription}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default PronunciationLibraryTab;
