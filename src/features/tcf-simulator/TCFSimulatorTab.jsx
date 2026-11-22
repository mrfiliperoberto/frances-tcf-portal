import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  PenTool, 
  Mic, 
  Play, 
  Pause, 
  RotateCcw, 
  RefreshCw, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  History,
  AlertTriangle,
  Zap,
  Check,
  Square,
  Trash2,
  Activity,
  Headphones,
  FileText
} from 'lucide-react';
import { TCF_PROMPTS, TCF_TASK_METAS } from '../../data/tcfPrompts';
import { evaluateTCFProduction, evaluateTCFOralAudio } from '../../services/geminiService';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import ComprehensionOrale from './ComprehensionOrale';
import ComprehensionEcrite from './ComprehensionEcrite';

export function TCFSimulatorTab({
  initialMode = 'co',
  history = [],
  onSaveHistory,
  onSaveErrorToDeck,
  onShowToast
}) {
  const [activeMode, setActiveMode] = useState(initialMode); // 'co' | 'ce' | 'orale' | 'ecrite'

  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode]);
  const [activeTask, setActiveTask] = useState(1);
  const [promptIndex, setPromptIndex] = useState(0);
  const [userText, setUserText] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [savedCorrections, setSavedCorrections] = useState([]);

  const textareaRef = useRef(null);
  const resultRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const { speakText, startListening, stopListening, isListening: isSttListening } = useFrenchAudio();
  
  // Gravador de áudio bruto (MediaRecorder API) para modo Oral Multimodal
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

  const expressionKey = activeMode === 'orale' ? 'orale' : 'ecrite';
  const currentMeta = TCF_TASK_METAS[expressionKey][activeTask];
  const promptsList = TCF_PROMPTS[expressionKey][activeTask];
  const currentPrompt = promptsList[promptIndex % promptsList.length];

  // Reseta cronômetro ao mudar modo ou tarefa
  useEffect(() => {
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSecondsLeft(currentMeta.seconds);
    setPromptIndex(0);
    setEvaluationResult(null);
    clearRecording();
  }, [activeMode, activeTask]);

  // Alerta se houver erro de permissão no gravador
  useEffect(() => {
    if (recorderError && onShowToast) {
      onShowToast(recorderError);
    }
  }, [recorderError]);

  // Gerencia contagem regressiva oficial
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            if (isRecording) stopRecording();
            onShowToast("⏰ Tempo esgotado! Envie sua resposta para avaliação da IA.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, isRecording]);

  const handleToggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setSecondsLeft(currentMeta.seconds);
  };

  const handleRandomizePrompt = () => {
    setPromptIndex((prev) => prev + 1);
    onShowToast("Novo tema oficial sorteado!");
  };

  const handleInsertChar = (char) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = userText;
    const newText = text.substring(0, start) + char + text.substring(end);
    setUserText(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + char.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleToggleVoiceDictation = () => {
    if (isSttListening) {
      stopListening();
    } else {
      const started = startListening(
        (transcript) => {
          setUserText((prev) => (prev ? prev + ' ' : '') + transcript);
          onShowToast("Fala transcrita com sucesso!");
        },
        (errMsg) => onShowToast(errMsg)
      );
      if (started) {
        onShowToast("🎙️ Gravando sua fala em francês...");
      }
    }
  };

  const handleFillSample = () => {
    const sample = `Bonjour Maxime,\n\nJ'espère que tu vas bien ! Je t'écris ce courriel parce que je viens d'arriver à Montréal il y a une semaine pour suivre mon cours intensif de français.\n\nLa ville est vraiment magnifique et très accueillante, même s'il commence déjà à faire un peu froid. J'habite dans un petit appartement chaleureux situé près du métro Mont-Royal.\n\nEst-ce que tu serais disponible pour venir me rendre visite le mois prochain ? Nous pourrions visiter le Vieux-Port et goûter à la fameuse poutine ensemble !\n\nJ'ai hâte d'avoir de tes nouvelles.\n\nAmicalement,\nLucas`;
    setUserText(sample);
  };

  // Avaliação com IA (Escrita ou Oral com Áudio Multimodal)
  const handleEvaluate = async () => {
    // Modo Oral com Áudio Gravado
    if (activeMode === 'orale' && audioBlob) {
      setIsEvaluating(true);
      try {
        const base64Audio = await getBase64();
        if (!base64Audio) throw new Error("Áudio não pôde ser convertido.");

        const result = await evaluateTCFOralAudio({
          base64Audio,
          mimeType,
          prompt: currentPrompt,
          task: activeTask
        });

        setEvaluationResult({
          scoreOutOf20: result.score20 || "14/20",
          nclcLevel: result.nclcLevel || "NCLC 7",
          cefrLevel: result.cefrLevel || "B2",
          transcription: result.transcription || "",
          phoneticAnalysis: result.phoneticAnalysis || null,
          strengths: Array.isArray(result.strengths) ? result.strengths.join(' ') : result.strengths,
          corrections: result.corrections || [],
          upgradedVersionB2: result.upgradedResponse || result.upgradedVersionB2 || ""
        });

        if (result.transcription) {
          setUserText(result.transcription);
        }

        if (onSaveHistory) {
          onSaveHistory({
            date: new Date().toLocaleDateString('pt-BR'),
            mode: `Oral T${activeTask} (Áudio)`,
            score: result.score20 || "14/20",
            nclc: `${result.nclcLevel} (${result.cefrLevel})`,
            pronunciationScore: result.phoneticAnalysis?.pronunciationScore || null
          });
        }

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        onShowToast("✨ Avaliação Fonética Multimodal concluída!");
      } catch (err) {
        console.error("[TCFSimulatorTab] Erro detalhado na avaliação oral:", err);
        onShowToast(`❌ Erro Gemini: ${err.message || "Erro ao processar áudio com Gemini."}`);
      } finally {
        setIsEvaluating(false);
      }
      return;
    }

    // Modo Escrito ou Oral com Texto
    if (userText.trim().length < 15) {
      onShowToast(
        activeMode === 'orale'
          ? "Grave um áudio ou dite pelo menos 1 frase em francês para avaliar."
          : "Escreva pelo menos 1 frase em francês para ser avaliado."
      );
      return;
    }

    setIsEvaluating(true);
    try {
      const result = await evaluateTCFProduction({
        text: userText,
        prompt: currentPrompt,
        mode: activeMode,
        task: activeTask
      });

      setEvaluationResult(result);

      if (onSaveHistory) {
        onSaveHistory({
          date: new Date().toLocaleDateString('pt-BR'),
          mode: `${activeMode === 'ecrite' ? 'Escrita' : 'Oral'} T${activeTask}`,
          score: result.scoreOutOf20,
          nclc: `${result.nclcLevel} (${result.cefrLevel})`
        });
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      onShowToast("Relatório oficial de correção gerado!");
    } catch (err) {
      console.error("[TCFSimulatorTab] Erro detalhado na avaliação:", err);
      onShowToast(`❌ Erro Gemini: ${err.message || "Erro na avaliação."}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveCorrection = async (c, idx) => {
    if (savedCorrections.includes(idx)) return;
    setSavedCorrections((prev) => [...prev, idx]);
    if (onSaveErrorToDeck) {
      await onSaveErrorToDeck({
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
        source: `TCF ${activeMode === 'orale' ? 'Oral' : 'Escrita'} T${activeTask}`
      });
    }
    if (onShowToast) {
      onShowToast("⚡ Adicionado às revisões do Deck SM-2!");
    }
  };

  // Formatação do tempo do cronômetro da prova
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  // Formatação do tempo de gravação do áudio
  const recMin = String(Math.floor(recordingTime / 60)).padStart(2, '0');
  const recSec = String(recordingTime % 60).padStart(2, '0');

  // Contagem de palavras
  const wordsCount = userText.trim() ? userText.trim().split(/\s+/).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Header & 4-Exam Navigation Menu */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                4 Provas Oficiais • TCF Canada
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Meta Express Entry: NCLC 7+ (CO ≥ 458 • CE ≥ 453 • EO/EE ≥ 10/20)
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Simulador Completo TCF Canada (CO, CE, EO & EE)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Pratique as 4 competências oficiais: Compreensão Oral com TTS, Compreensão Escrita cronometrada (330–699 pts) e Expressão Oral/Escrita (0–20 pts).
            </p>
          </div>
        </div>

        {/* 4 Official TCF Exams Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-100 dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            id="tcf-nav-co"
            onClick={() => setActiveMode('co')}
            className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-between gap-2 ${
              activeMode === 'co'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">Compréhension Orale</span>
                <span className={`text-[10px] font-mono ${activeMode === 'co' ? 'text-rose-100' : 'text-slate-400'}`}>
                  Escuta • 330–699 pts
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${
              activeMode === 'co' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              CO
            </span>
          </button>

          <button
            type="button"
            id="tcf-nav-ce"
            onClick={() => setActiveMode('ce')}
            className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-between gap-2 ${
              activeMode === 'ce'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">Compréhension Écrite</span>
                <span className={`text-[10px] font-mono ${activeMode === 'ce' ? 'text-rose-100' : 'text-slate-400'}`}>
                  Leitura • 330–699 pts
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${
              activeMode === 'ce' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              CE
            </span>
          </button>

          <button
            type="button"
            id="tcf-nav-eo"
            onClick={() => setActiveMode('orale')}
            className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-between gap-2 ${
              activeMode === 'orale'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">Expression Orale</span>
                <span className={`text-[10px] font-mono ${activeMode === 'orale' ? 'text-rose-100' : 'text-slate-400'}`}>
                  Fala • 0–20 pts
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${
              activeMode === 'orale' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              EO
            </span>
          </button>

          <button
            type="button"
            id="tcf-nav-ee"
            onClick={() => setActiveMode('ecrite')}
            className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-between gap-2 ${
              activeMode === 'ecrite'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="block leading-tight">Expression Écrite</span>
                <span className={`text-[10px] font-mono ${activeMode === 'ecrite' ? 'text-rose-100' : 'text-slate-400'}`}>
                  Redação • 0–20 pts
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md ${
              activeMode === 'ecrite' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              EE
            </span>
          </button>
        </div>
      </div>

      {/* PROVA 1: COMPRÉHENSION ORALE (CO) */}
      {activeMode === 'co' && (
        <ComprehensionOrale
          onSaveHistory={onSaveHistory}
          onSaveErrorToDeck={onSaveErrorToDeck}
          onShowToast={onShowToast}
        />
      )}

      {/* PROVA 2: COMPRÉHENSION ÉCRITE (CE) */}
      {activeMode === 'ce' && (
        <ComprehensionEcrite
          onSaveHistory={onSaveHistory}
          onSaveErrorToDeck={onSaveErrorToDeck}
          onShowToast={onShowToast}
        />
      )}

      {/* Histórico Consolidado quando estiver em CO ou CE */}
      {(activeMode === 'co' || activeMode === 'ce') && (
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-4 h-4 text-rose-500" />
            <span>Histórico Oficial de Simulados TCF (IndexedDB)</span>
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">
              Nenhum simulado registrado ainda. Responda às questões acima e clique em "Salvar Nota no Histórico".
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {history.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">
                      {item.mode}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-500 block font-mono">
                      {item.nclc}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROVAS 3 e 4: EXPRESSION ORALE (EO) & EXPRESSION ÉCRITE (EE) */}
      {(activeMode === 'orale' || activeMode === 'ecrite') && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Seletor de Tarefa */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              1. Escolha a Tarefa (Tâche)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((taskNum) => (
                <button
                  key={taskNum}
                  onClick={() => setActiveTask(taskNum)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition ${
                    activeTask === taskNum
                      ? 'border-2 border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tâche {taskNum}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-500">
                  {currentMeta.label}
                </span>
                <button
                  onClick={handleRandomizePrompt}
                  className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Outro Tema</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                {currentPrompt}
              </p>
            </div>
          </div>

          {/* Cronômetro Oficial */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                2. Cronômetro de Prova
              </h3>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  isTimerRunning
                    ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}
              >
                {isTimerRunning ? 'Em Prova ⏱️' : 'Pronto'}
              </span>
            </div>

            <div className="text-center py-2">
              <div className="text-4xl font-mono font-extrabold tracking-wider text-slate-900 dark:text-white">
                {minutes}:{seconds}
              </div>
              <p className="text-xs text-slate-400 mt-1">Tempo oficial para esta Tâche</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleTimer}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
              </button>
              <button
                onClick={handleResetTimer}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
              >
                Resetar
              </button>
            </div>
          </div>

          {/* Histórico de Simulados */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>Histórico de Simulados</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs pr-1">
              {history.length === 0 ? (
                <p className="text-slate-400 text-center py-2">Nenhum simulado registrado ainda.</p>
              ) : (
                history.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold block text-slate-800 dark:text-slate-200">
                        {item.mode}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-500 block font-mono">
                        {item.nclc}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span>{item.score}</span>
                        {item.pronunciationScore && (
                          <span className="text-blue-400">• Fonética: {item.pronunciationScore}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Audio Recorder / Text Editor & Multimodal AI Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  {activeMode === 'ecrite' ? (
                    <>
                      <PenTool className="w-5 h-5 text-rose-500" />
                      <span>Sua Redação (Expression Écrite)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 text-rose-500" />
                      <span>Produção Oral com Gravação de Voz Real</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeMode === 'ecrite'
                    ? 'Escreva respeitando a contagem de palavras e use conectores formais.'
                    : 'Grave sua voz nativamente pelo microfone para receber nota oficial NCLC + Raio-X de pronúncia.'}
                </p>
              </div>

              {activeMode === 'ecrite' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleVoiceDictation}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isSttListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isSttListening ? 'Parar Ditado' : 'Ditar por Voz (FR)'}</span>
                  </button>

                  <span className="text-xs font-extrabold font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {wordsCount} palavras
                  </span>
                </div>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Multimodal Gemini 2.5 Flash
                </span>
              )}
            </div>

            {/* SEÇÃO ORAL: Gravador de Áudio Bruto (MediaRecorder) */}
            {activeMode === 'orale' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/90 dark:to-[#0B0F19] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Botão de Gravação Principal */}
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/30 transition flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>{audioBlob ? "Gravar Novo Áudio" : "Iniciar Gravação de Voz"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm animate-pulse shadow-lg shadow-red-600/40 transition flex items-center gap-2"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span>Parar Gravação ({recMin}:{recSec})</span>
                      </button>
                    )}

                    {isRecording && (
                      <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        Gravando seu francês...
                      </span>
                    )}
                  </div>

                  {audioBlob && !isRecording && (
                    <button
                      type="button"
                      onClick={clearRecording}
                      className="text-xs font-semibold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Descartar Áudio</span>
                    </button>
                  )}
                </div>

                {/* Player de Preview do Áudio Gravado */}
                {audioUrl && !isRecording && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Headphones className="w-4 h-4 text-rose-500" />
                      <span>Ouça seu áudio antes de enviar:</span>
                    </div>
                    <audio src={audioUrl} controls className="w-full sm:w-72 h-8" />
                  </div>
                )}
              </div>
            )}

            {/* Acentos Franceses Rápidos (Modo Escrito) */}
            {activeMode === 'ecrite' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400 self-center mr-1 font-medium">Acentos:</span>
                {['é', 'è', 'ê', 'à', 'ù', 'ç', 'œ', '’'].map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => handleInsertChar(char)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-xs font-mono font-bold text-slate-700 dark:text-slate-300 transition"
                  >
                    {char}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea para Escrita ou Transcrição Oral */}
            <div className="space-y-1.5">
              {activeMode === 'orale' && (
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Transcrição da Fala / Rascunho (Opcional):</span>
                  {userText && <span className="font-mono">{wordsCount} palavras</span>}
                </label>
              )}
              <textarea
                ref={textareaRef}
                rows={activeMode === 'ecrite' ? 8 : 4}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder={
                  activeMode === 'ecrite'
                    ? "Redija sua resposta em francês aqui respeitando as regras do TCF..."
                    : "Grave seu áudio acima ou transcreva suas anotações aqui..."
                }
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {/* Ações Inferiores de Envio */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleFillSample}
                className="text-xs text-slate-400 hover:text-blue-400 underline transition"
              >
                Preencher com resposta exemplo para testar
              </button>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating || isRecording}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-blue-600 hover:from-rose-500 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                {isEvaluating ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>{activeMode === 'orale' && audioBlob ? "Analisando Fonética com Gemini..." : "Corrigindo na régua NCLC..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {activeMode === 'orale' && audioBlob
                        ? "Avaliar Áudio Real (Nota NCLC + Fonética)"
                        : "Avaliar com IA Oficial (Nota NCLC)"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resultado da Avaliação IA (com Raio-X de Pronúncia se for Oral) */}
          <AnimatePresence>
            {evaluationResult && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-2xl border border-emerald-500/30 shadow-xl space-y-6"
              >
                {/* Header de Notas */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Relatório Oficial de Correção IA Multimodal
                    </span>
                    <h4 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Resultado Estimado da sua Tâche {activeTask}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <span className="block text-[10px] uppercase font-bold text-rose-400">Nota TCF</span>
                      <span className="text-xl font-extrabold font-mono text-rose-500">
                        {evaluationResult.scoreOutOf20}
                      </span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="block text-[10px] uppercase font-bold text-emerald-400">Equivalência</span>
                      <span className="text-xl font-extrabold font-mono text-emerald-500">
                        {evaluationResult.nclcLevel} ({evaluationResult.cefrLevel})
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD EXCLUSIVO: Raio-X de Pronúncia Francesa (Se houver análise fonética) */}
                {evaluationResult.phoneticAnalysis && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-purple-950/40 border border-blue-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-4 h-4" />
                          Raio-X de Pronúncia Francesa (Análise Fonética do Áudio)
                        </span>
                        <h5 className="font-display text-base font-extrabold text-white mt-0.5">
                          Diagnóstico dos 4 Pilares Fonéticos
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 font-medium">Índice Fonético:</span>
                        <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 font-mono font-extrabold text-base border border-blue-500/30">
                          {evaluationResult.phoneticAnalysis.pronunciationScore ?? 80}/100
                        </span>
                      </div>
                    </div>

                    {/* 4 Pilares da Pronúncia Francesa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* 1. Vogais Nasais */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="font-bold text-rose-400 block">
                          🗣️ 1. Vogais Nasais (AN, EN, IN, ON)
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {evaluationResult.phoneticAnalysis.nasalVowels}
                        </p>
                      </div>

                      {/* 2. Ligações & Elisões */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="font-bold text-blue-400 block">
                          🔗 2. Ligações & Elisões (Liaisons)
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {evaluationResult.phoneticAnalysis.liaisonsAndElisions}
                        </p>
                      </div>

                      {/* 3. Ritmo & Entonação */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="font-bold text-emerald-400 block">
                          🎼 3. Ritmo & Entonação Frasal
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {evaluationResult.phoneticAnalysis.rhythmAndIntonation}
                        </p>
                      </div>

                      {/* 4. R Uvular Francês */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="font-bold text-amber-400 block">
                          🍁 4. R Uvular Francês (R guttural)
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {evaluationResult.phoneticAnalysis.uvularR}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcrição da fala se houver */}
                {evaluationResult.transcription && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Transcrição da sua Fala no Áudio
                    </h5>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed italic">
                      "{evaluationResult.transcription}"
                    </p>
                  </div>
                )}

                {/* Pontos Fortes */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pontos Fortes
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed">
                    {evaluationResult.strengths}
                  </p>
                </div>

                {/* Correções Linha a Linha com botão SM-2 */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Correções Linha a Linha & Caderno de Erros
                  </h5>
                  <div className="space-y-2">
                    {(evaluationResult.corrections || []).map((c, idx) => {
                      const isSaved = savedCorrections.includes(idx);
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <p className="text-rose-400 line-through font-mono">{c.original}</p>
                            <p className="text-emerald-400 font-bold font-mono">✓ {c.corrected}</p>
                            <p className="text-slate-400">{c.explanation}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveCorrection(c, idx)}
                            disabled={isSaved}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition self-start sm:self-center ${
                              isSaved
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-sm'
                            }`}
                            title="Salvar no Caderno de Erros e Flashcards SM-2"
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvo no Deck ✓</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 fill-amber-500" />
                                <span>⚡ Salvar no Deck SM-2</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Versão Reescrita NCLC 8+ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Versão Reescrita Padrão NCLC 8+ (Modelo para Estudo)
                    </h5>
                    <button
                      type="button"
                      onClick={() => speakText(evaluationResult.upgradedVersionB2)}
                      className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Ouvir Versão NCLC 8+</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm italic leading-relaxed text-slate-800 dark:text-slate-200 bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl whitespace-pre-line">
                    {evaluationResult.upgradedVersionB2}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </motion.div>
  );
}

export default TCFSimulatorTab;
