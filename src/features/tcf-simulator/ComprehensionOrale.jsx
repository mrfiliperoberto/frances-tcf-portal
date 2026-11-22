import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Volume2,
  Square,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Award,
  Zap,
  Check,
  Save,
  BookOpen,
  Gauge
} from 'lucide-react';
import {
  generateTCFListeningQuestion,
  calculateTCFComprehensionScore
} from '../../services/geminiService';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';

const LEVELS = [
  { id: 'A1', label: 'A1 • Iniciante', pts: '330–345 pts' },
  { id: 'A2', label: 'A2 • Elementar', pts: '331–368 pts (NCLC 4)' },
  { id: 'B1', label: 'B1 • Intermediário', pts: '369–457 pts (NCLC 5-6)' },
  { id: 'B2', label: 'B2 • Meta Canadá', pts: '458–522 pts (NCLC 7-8)' },
  { id: 'C1', label: 'C1 • Avançado', pts: '523–699 pts (NCLC 9-10)' }
];

const TOPICS = [
  'Cotidiano em Montréal & Québec',
  'Ambiente de Trabalho & Entrevista',
  'Serviços Públicos & Transporte (STM)',
  'Crônica Radio-Canada & Sociedade',
  'Imigração & Vida Universitária'
];

export function ComprehensionOrale({
  onSaveHistory,
  onSaveErrorToDeck,
  onShowToast
}) {
  const [selectedLevel, setSelectedLevel] = useState('B2');
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [questionData, setQuestionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [vocabSaved, setVocabSaved] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  const { speakText, stopSpeaking, isSpeaking } = useFrenchAudio();

  const loadNewQuestion = async (lvl = selectedLevel, tpc = selectedTopic) => {
    stopSpeaking();
    setIsLoading(true);
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowTranscript(false);
    setVocabSaved(false);
    setHasPlayedAudio(false);

    try {
      const data = await generateTCFListeningQuestion({
        level: lvl,
        topic: tpc
      });
      setQuestionData(data);
    } catch (err) {
      console.error("[ComprehensionOrale] Erro ao gerar questão:", err);
      if (onShowToast) {
        onShowToast(`❌ Erro Gemini: ${err.message || 'Falha ao gerar questão de escuta.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewQuestion(selectedLevel, selectedTopic);
    return () => stopSpeaking();
  }, []);

  const handlePlayDialogue = (rate = 0.94) => {
    if (!questionData) return;
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    setHasPlayedAudio(true);
    const fullAudioText = `${questionData.audioScript}. Question : ${questionData.question}`;
    speakText(fullAudioText, rate);
  };

  const handleConfirmAnswer = () => {
    if (!selectedOption || isSubmitted || !questionData) return;
    const isCorrect = selectedOption === questionData.correctOption;
    setIsSubmitted(true);
    setShowTranscript(true);

    const updatedHistory = [
      ...sessionHistory,
      {
        level: questionData.level || selectedLevel,
        isCorrect,
        question: questionData.question
      }
    ];
    setSessionHistory(updatedHistory);

    if (onShowToast) {
      onShowToast(
        isCorrect
          ? '✅ Bonne réponse ! Pontuação TCF atualizada.'
          : `❌ Resposta incorreta. A alternativa correta era a ${questionData.correctOption}.`
      );
    }
  };

  const handleSaveVocabToSM2 = async () => {
    if (!questionData?.keyVocabulary || vocabSaved) return;
    setVocabSaved(true);
    if (onSaveErrorToDeck) {
      await onSaveErrorToDeck({
        original: questionData.keyVocabulary.portuguese,
        corrected: questionData.keyVocabulary.french,
        explanation: `Exemplo no TCF CO (${questionData.level}): "${questionData.keyVocabulary.example}"`,
        source: `TCF Compréhension Orale (${questionData.level})`
      });
    }
  };

  const scoreSummary = calculateTCFComprehensionScore(sessionHistory, 'co');

  const handleSaveSessionScore = () => {
    if (sessionHistory.length === 0) {
      if (onShowToast) onShowToast("Responda pelo menos 1 questão de áudio para registrar sua pontuação.");
      return;
    }
    if (onSaveHistory) {
      onSaveHistory({
        date: new Date().toLocaleDateString('pt-BR'),
        mode: `Compréhension Orale (${sessionHistory.length}Q)`,
        score: `${scoreSummary.points}/699 pts`,
        nclc: `${scoreSummary.nclc} (${scoreSummary.cefr})`
      });
    }
    if (onShowToast) {
      onShowToast(`🏆 Resultado CO (${scoreSummary.points}/699 pts • ${scoreSummary.nclc}) salvo no histórico!`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna Esquerda: Controles de Nível, Escala 330-699 e Histórico da Sessão */}
      <div className="space-y-6">
        {/* Seletor de Nível e Contexto */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              1. Nível de Dificuldade (CEFR)
            </h3>
            <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
              IA Dinâmica
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setSelectedLevel(lvl.id);
                  loadNewQuestion(lvl.id, selectedTopic);
                }}
                className={`py-2.5 rounded-xl font-extrabold text-xs border transition ${
                  selectedLevel === lvl.id
                    ? 'border-2 border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {lvl.id}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cenário / Situação Canadense:
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                loadNewQuestion(selectedLevel, e.target.value);
              }}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {TOPICS.map((tpc) => (
                <option key={tpc} value={tpc}>
                  {tpc}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadNewQuestion(selectedLevel, selectedTopic)}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Gerar Novo Diálogo de Áudio ({selectedLevel})</span>
          </button>
        </div>

        {/* Painel Oficial de Pontuação TCF (330 a 699 pontos) */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-rose-500" />
              <span>Escala Oficial TCF (330–699)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {sessionHistory.length} {sessionHistory.length === 1 ? 'questão' : 'questões'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-[#131C31] to-rose-950 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Pontuação Estimada CO
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-mono font-extrabold text-white">
                    {scoreSummary.points}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 699 pts</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-rose-300 font-bold block">
                  Nível Equivalente
                </span>
                <span className="inline-block mt-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono font-extrabold text-sm">
                  {scoreSummary.nclc} ({scoreSummary.cefr})
                </span>
              </div>
            </div>

            {/* Barra de Progresso 330 -> 699 */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, Math.round(((scoreSummary.points - 330) / (699 - 330)) * 100)))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>330 (A1)</span>
                <span>458 (NCLC 7)</span>
                <span>523 (NCLC 9)</span>
                <span>699 (C2)</span>
              </div>
            </div>
          </div>

          {/* Tabela Rápida de Referência IRCC CO */}
          <div className="space-y-1.5 text-[11px]">
            <p className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Régua Oficial IRCC (Compréhension Orale):
            </p>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">NCLC 4 (A2):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">331–368</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between">
                <span className="text-blue-400">NCLC 5-6 (B1):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">369–457</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex justify-between">
                <span className="text-emerald-500 font-bold">NCLC 7-8 (B2):</span>
                <span className="font-bold text-emerald-500">458–522</span>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 flex justify-between">
                <span className="text-purple-400 font-bold">NCLC 9-10 (C1+):</span>
                <span className="font-bold text-purple-400">523–699</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSessionScore}
            disabled={sessionHistory.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Nota CO ({scoreSummary.points} pts) no Histórico</span>
          </button>
        </div>
      </div>

      {/* Coluna Direita (2 cols): Player de Áudio TTS + Questão de Múltipla Escolha (A, B, C, D) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Elaborando situação auditiva inédita ({selectedLevel})...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Criando diálogo em francês canadense e alternativas no formato oficial do TCF.
                </p>
              </div>
            </div>
          ) : questionData ? (
            <>
              {/* Cabeçalho da Questão */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500">
                        Compréhension Orale • Nível {questionData.level || selectedLevel}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {questionData.context}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTranscript((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5"
                >
                  {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showTranscript ? 'Ocultar Transcrição' : 'Ver Transcrição (Estudo)'}</span>
                </button>
              </div>

              {/* Console de Reprodução do Áudio (TTS Web Speech API) */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131C31] to-blue-950 text-white border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      Simulador de Áudio Oficial TCF (Voz Francófona)
                    </span>
                    <p className="text-xs text-slate-300">
                      No exame real, você ouve o diálogo e a pergunta antes de marcar a alternativa.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayDialogue(0.94)}
                      className={`px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg ${
                        isSpeaking
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
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
                          <span>{hasPlayedAudio ? 'Ouvir Novamente (1.0x)' : 'Reproduzir Áudio da Prova'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlayDialogue(0.76)}
                      className="px-3.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/10"
                      title="Ouvir mais devagar para treinar a escuta"
                    >
                      <Gauge className="w-3.5 h-3.5 text-blue-300" />
                      <span>0.75x</span>
                    </button>
                  </div>
                </div>

                {/* Transcrição Oculta por padrão (Modo Exame Real) */}
                <AnimatePresence>
                  {showTranscript && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-3 border-t border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-black/20 p-3.5 rounded-xl"
                    >
                      <span className="block not-italic font-bold text-[11px] uppercase text-rose-300 mb-1">
                        Transcrição do Áudio (Script):
                      </span>
                      "{questionData.audioScript}"
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Enunciado da Pergunta */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {questionData.question}
                  </h4>
                  <button
                    type="button"
                    onClick={() => speakText(questionData.question)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition"
                    title="Ouvir pergunta"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Alternativas A, B, C, D */}
                <div className="space-y-2.5">
                  {(questionData.options || []).map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    const isCorrectOpt = opt.id === questionData.correctOption;

                    let cardStyle =
                      'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200';

                    if (isSubmitted) {
                      if (isCorrectOpt) {
                        cardStyle =
                          'border-2 border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200';
                      } else if (isSelected && !isCorrectOpt) {
                        cardStyle =
                          'border-2 border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200';
                      }
                    } else if (isSelected) {
                      cardStyle =
                        'border-2 border-rose-500 bg-rose-500/10 text-slate-900 dark:text-white shadow-sm';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => setSelectedOption(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between gap-3 ${cardStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-lg font-mono font-extrabold text-xs flex items-center justify-center shrink-0 ${
                              isSubmitted && isCorrectOpt
                                ? 'bg-emerald-500 text-white'
                                : isSubmitted && isSelected && !isCorrectOpt
                                ? 'bg-rose-500 text-white'
                                : isSelected
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="text-xs sm:text-sm font-medium leading-relaxed">
                            {opt.text}
                          </span>
                        </div>

                        {isSubmitted && isCorrectOpt && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                        {isSubmitted && isSelected && !isCorrectOpt && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {!isSubmitted ? (
                  <button
                    type="button"
                    onClick={handleConfirmAnswer}
                    disabled={!selectedOption}
                    className="w-full sm:w-auto ml-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-blue-600 hover:from-rose-500 hover:to-blue-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Resposta</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => loadNewQuestion(selectedLevel, selectedTopic)}
                    className="w-full sm:w-auto ml-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Próxima Questão de Áudio</span>
                  </button>
                )}
              </div>

              {/* Gabarito Comentado e Botão SM-2 após Responder */}
              <AnimatePresence>
                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        Explicação Oficial & Análise do Áudio
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {questionData.explanation}
                      </p>
                    </div>

                    {questionData.keyVocabulary && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase text-amber-500">
                            Expressão-Chave do Áudio:
                          </span>
                          <p className="font-mono font-bold text-slate-900 dark:text-white">
                            🇫🇷 {questionData.keyVocabulary.french}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            🇧🇷 {questionData.keyVocabulary.portuguese}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveVocabToSM2}
                          disabled={vocabSaved}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition ${
                            vocabSaved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          }`}
                        >
                          {vocabSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvo no Deck SM-2 ✓</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 fill-amber-500" />
                              <span>⚡ Salvar no Deck SM-2</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ComprehensionOrale;

