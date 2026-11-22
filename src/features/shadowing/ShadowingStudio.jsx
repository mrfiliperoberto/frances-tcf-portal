import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  Square,
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Headphones,
  Trash2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  Check,
  Gauge,
  Radio,
  Repeat
} from 'lucide-react';
import { SHADOWING_SENTENCES, SHADOWING_CATEGORIES } from '../../data/shadowingSentences';
import { evaluateShadowingAudio, getGeminiApiKey } from '../../services/geminiService';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

const LEVEL_FILTERS = ['Todos', 'A1', 'A2', 'B1', 'B2'];

export function ShadowingStudio({ onSaveErrorToDeck, onShowToast }) {
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [savedToDeck, setSavedToDeck] = useState(false);
  const [practiceScores, setPracticeScores] = useState({}); // { [sentenceId]: score }

  const userAudioRef = useRef(null);
  const resultRef = useRef(null);

  const { speakText, stopSpeaking, isSpeaking } = useFrenchAudio();
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

  // Filtra frases conforme nível e categoria
  const filteredSentences = SHADOWING_SENTENCES.filter((item) => {
    const matchLevel = selectedLevel === 'Todos' || item.level === selectedLevel;
    const matchCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    return matchLevel && matchCategory;
  });

  const activeList = filteredSentences.length > 0 ? filteredSentences : SHADOWING_SENTENCES;
  const currentSentence = activeList[currentIndex % activeList.length] || SHADOWING_SENTENCES[0];

  // Limpa gravação e avaliação ao trocar de frase
  useEffect(() => {
    stopSpeaking();
    clearRecording();
    setEvaluationResult(null);
    setSavedToDeck(false);
  }, [currentSentence.id]);

  // Exibe erro de permissão de microfone se houver
  useEffect(() => {
    if (recorderError && onShowToast) {
      onShowToast(recorderError);
    }
  }, [recorderError]);

  const handlePrevSentence = () => {
    setCurrentIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
  };

  const handleNextSentence = () => {
    setCurrentIndex((prev) => (prev + 1) % activeList.length);
  };

  const handleRandomSentence = () => {
    if (activeList.length <= 1) return;
    const nextIdx = Math.floor(Math.random() * activeList.length);
    setCurrentIndex(nextIdx);
    if (onShowToast) onShowToast("🎲 Nova frase de Shadowing sorteada!");
  };

  const handlePlayNative = (rate = 0.94) => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    speakText(currentSentence.french, rate);
  };

  const handlePlayUserRecording = () => {
    if (!userAudioRef.current) return;
    stopSpeaking();
    userAudioRef.current.currentTime = 0;
    userAudioRef.current.play();
  };

  // Toca o nativo e, logo em seguida, toca a gravação do aluno para comparar ritmo
  const handleCompareSequence = () => {
    if (!audioUrl) return;
    speakText(currentSentence.french, 0.94);
    if (onShowToast) {
      onShowToast("🎧 Ouvindo Nativo... Dê play na sua gravação em seguida para comparar o ritmo!");
    }
  };

  const handleEvaluateShadowing = async () => {
    if (!audioBlob || isEvaluating) return;
    setIsEvaluating(true);

    try {
      const base64Audio = await getBase64();
      if (!base64Audio) throw new Error("Não foi possível converter sua gravação de voz.");

      const result = await evaluateShadowingAudio({
        base64Audio,
        mimeType,
        targetSentence: currentSentence.french,
        focusPoints: currentSentence.focusPoints || []
      });

      setEvaluationResult(result);

      if (typeof result.pronunciationScore === 'number') {
        setPracticeScores((prev) => ({
          ...prev,
          [currentSentence.id]: Math.max(prev[currentSentence.id] || 0, result.pronunciationScore)
        }));
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      if (onShowToast) {
        onShowToast(`✨ Avaliação concluída! Nota Fonética: ${result.pronunciationScore}/100`);
      }
    } catch (err) {
      console.error("[ShadowingStudio] Erro na avaliação:", err);
      if (onShowToast) {
        onShowToast(`❌ Erro Gemini: ${err.message || 'Falha ao avaliar pronúncia.'}`);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveSentenceToDeck = async () => {
    if (savedToDeck) return;
    setSavedToDeck(true);

    const feedbackNote = evaluationResult?.surgicalFeedback
      ? `Feedback Fonético: ${evaluationResult.surgicalFeedback}`
      : `Foco Fonético: ${(currentSentence.focusPoints || []).join(' • ')}`;

    if (onSaveErrorToDeck) {
      await onSaveErrorToDeck({
        original: `${currentSentence.portuguese} [${currentSentence.phoneticGuide}]`,
        corrected: currentSentence.french,
        explanation: feedbackNote,
        source: `Shadowing Studio (${currentSentence.level} • ${currentSentence.category})`
      });
    }
  };

  const recMin = String(Math.floor(recordingTime / 60)).padStart(2, '0');
  const recSec = String(recordingTime % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>Laboratório Fonético & Ritmo</span>
            </span>
            {hasApiKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Micro-Correction Gemini Ativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                🟡 Modo Offline (Sem Chave)
              </span>
            )}
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Shadowing Studio • Treino de Pronúncia e Cadência Canadense
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Ouça a frase nativa, grave sua voz imediatamente em seguida, compare lado a lado no Dual Player e receba correção fonética cirúrgica.
          </p>
        </div>

        {/* Filtros Rápidos de Nível */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
          {LEVEL_FILTERS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setSelectedLevel(lvl);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                selectedLevel === lvl
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Coluna Esquerda (Trilha de Frases) & Coluna Direita (Dual Player Studio + Avaliação) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Categorias Fonéticas e Lista de Frases */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Desafio Fonético p/ Brasileiros
              </h3>
              <span className="text-xs font-mono font-bold text-rose-500">
                {activeList.length} frases
              </span>
            </div>

            {/* Pílulas de Categoria */}
            <div className="flex flex-wrap gap-1.5">
              {SHADOWING_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                    selectedCategory === cat
                      ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de Frases Selecionáveis */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {activeList.map((item, idx) => {
                const isCurrent = item.id === currentSentence.id;
                const bestScore = practiceScores[item.id];

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                      isCurrent
                        ? 'border-2 border-rose-500 bg-rose-500/10 shadow-sm'
                        : 'border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.level}
                        </span>
                        <span className="text-[11px] font-bold text-rose-500 truncate">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                        {item.french}
                      </p>
                    </div>

                    {bestScore !== undefined && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono font-extrabold text-[11px] border border-emerald-500/30">
                        {bestScore}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita (2 cols): Card Central da Frase + Interface Dual Player + Micro-Correction */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Central da Frase Alvo */}
          <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6">
            {/* Barra de Navegação entre Frases */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 font-mono font-extrabold text-xs border border-rose-500/20">
                  Nível {currentSentence.level}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs border border-blue-500/20">
                  {currentSentence.category}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevSentence}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  title="Frase anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2 text-slate-500">
                  {(currentIndex % activeList.length) + 1} / {activeList.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextSentence}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  title="Próxima frase"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRandomSentence}
                  className="ml-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1"
                  title="Sortear frase"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sortear</span>
                </button>
              </div>
            </div>

            {/* Frase Alvo em Francês + Guia Fonético + Tradução */}
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-[#131C31] to-slate-950 text-white border border-slate-800 space-y-4 shadow-inner">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 block">
                  Frase Alvo em Francês (Leia e Imite o Ritmo):
                </span>
                <p
                  id="shadowing-target-sentence"
                  className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug tracking-tight text-white"
                >
                  "{currentSentence.french}"
                </p>
              </div>

              {/* Guia Fonético e de Liaisons */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block mb-0.5">
                  Guia de Pronúncia & Liaisons (‿):
                </span>
                <p className="font-mono text-xs sm:text-sm text-rose-300 font-semibold">
                  [{currentSentence.phoneticGuide}]
                </p>
              </div>

              {/* Tradução abaixo */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-300 italic">
                  🇧🇷 "{currentSentence.portuguese}"
                </p>
                <button
                  type="button"
                  onClick={handleSaveSentenceToDeck}
                  disabled={savedToDeck}
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                    savedToDeck
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10'
                  }`}
                >
                  {savedToDeck ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvo no SM-2</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      <span>⚡ Salvar no Deck</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pontos de Atenção Fonética da Frase */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                🎯 Desafios Fonéticos Desta Frase:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(currentSentence.focusPoints || []).map((pt, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* INTERFACE DUAL PLAYER: Player Nativo vs Gravador do Aluno (Comparação Lado a Lado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* PLAYER 1: Áudio Nativo (Referência) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4" />
                      1. Player Nativo (Referência)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                      fr-CA / fr-FR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ouça a entonação e as liaisons antes de gravar sua tentativa.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-shadowing-native"
                    onClick={() => handlePlayNative(0.94)}
                    className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md ${
                      isSpeaking
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span>Parar Áudio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Ouvir Nativo (1.0x)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayNative(0.75)}
                    className="py-3 px-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5"
                    title="Ouvir em velocidade reduzida (0.75x) para perceber as ligações"
                  >
                    <Gauge className="w-4 h-4 text-blue-500" />
                    <span>0.75x</span>
                  </button>
                </div>
              </div>

              {/* PLAYER 2: Gravador do Aluno */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                      <Mic className="w-4 h-4" />
                      2. Sua Voz (Gravação Shadowing)
                    </span>
                    {isRecording && (
                      <span className="text-[11px] font-mono font-bold text-rose-500 animate-pulse">
                        ● {recMin}:{recSec}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Repita em voz alta imitando a melodia da frase nativa.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      id="btn-shadowing-record"
                      onClick={startRecording}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-600/25 transition flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{audioBlob ? 'Regravar Minha Voz' : 'Gravar Minha Voz'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm animate-pulse shadow-lg shadow-red-600/35 transition flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Parar ({recMin}:{recSec})</span>
                    </button>
                  )}

                  {audioBlob && !isRecording && (
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:text-rose-500 text-slate-500 transition"
                      title="Descartar gravação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BARRA DE COMPARAÇÃO LADO A LADO (Exibida após o aluno gravar a voz) */}
            <AnimatePresence>
              {audioUrl && !isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-rose-950/40 border border-blue-500/30 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white">
                          Comparação Lado a Lado (Nativo vs. Sua Gravação)
                        </h4>
                        <p className="text-xs text-slate-300">
                          Dê play nos dois áudios abaixo para comparar seu ritmo, cadência e pronúncia:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCompareSequence}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/15 shrink-0"
                    >
                      <Repeat className="w-3.5 h-3.5 text-blue-300" />
                      <span>Ouvir Nativo + Comparar</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Botão rápido para tocar Nativo novamente */}
                    <button
                      type="button"
                      onClick={() => handlePlayNative(0.94)}
                      className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <span>▶️ Tocar Áudio Nativo (IA)</span>
                    </button>

                    {/* Player nativo HTML5 com a gravação do aluno */}
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center gap-2">
                      <audio
                        ref={userAudioRef}
                        src={audioUrl}
                        controls
                        className="w-full h-8"
                      />
                    </div>
                  </div>

                  {/* Botão Principal: Avaliar minha Pronúncia (Gemini) */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="btn-evaluate-shadowing"
                      onClick={handleEvaluateShadowing}
                      disabled={isEvaluating}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-blue-600 hover:from-rose-500 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-2"
                    >
                      {isEvaluating ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Analisando Fonética da Frase com Gemini...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Avaliar minha Pronúncia (Gemini)</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CARD DE RESULTADO: Micro-Correction Fonética via Gemini */}
          <AnimatePresence>
            {evaluationResult && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-2xl border border-emerald-500/30 shadow-xl space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      Micro-Correction Fonética • Gemini Multimodal
                    </span>
                    <h4 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Diagnóstico Cirúrgico da Sua Pronúncia
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`px-4 py-2.5 rounded-2xl border text-center ${
                        evaluationResult.pronunciationScore >= 80
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                          : evaluationResult.pronunciationScore >= 60
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold opacity-80">
                        Pronunciation Score
                      </span>
                      <span className="text-2xl font-extrabold font-mono">
                        {evaluationResult.pronunciationScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* O que a IA ouviu (Transcrição) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    O que o Gemini ouviu na sua gravação:
                  </span>
                  <p className="text-xs sm:text-sm font-mono p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 italic">
                    "{evaluationResult.spokenTranscription}"
                  </p>
                </div>

                {/* Feedback Cirúrgico Principal */}
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Onde Ajustar na Fonética Desta Frase:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {evaluationResult.surgicalFeedback}
                  </p>
                </div>

                {/* Ajustes Pontuais & Ritmo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block">
                      🔍 Ajustes Fonéticos Pontuais:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {(evaluationResult.specificCorrections || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                        🎼 Ritmo & Prosódia:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {evaluationResult.rhythmTip}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveSentenceToDeck}
                      disabled={savedToDeck}
                      className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                        savedToDeck
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      {savedToDeck ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvo no Deck SM-2 ✓</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-amber-500" />
                          <span>⚡ Salvar Frase + Feedback no Deck SM-2</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default ShadowingStudio;

