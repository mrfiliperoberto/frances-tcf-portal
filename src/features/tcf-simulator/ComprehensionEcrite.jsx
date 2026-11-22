import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Volume2,
  Zap,
  Check,
  Save,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import {
  generateTCFReadingQuestion,
  calculateTCFComprehensionScore
} from '../../services/geminiService';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';

const LEVELS = [
  { id: 'A1', label: 'A1', timeSeconds: 75 },
  { id: 'A2', label: 'A2', timeSeconds: 90 },
  { id: 'B1', label: 'B1', timeSeconds: 120 },
  { id: 'B2', label: 'B2', timeSeconds: 150 },
  { id: 'C1', label: 'C1', timeSeconds: 180 }
];

const CATEGORIES = [
  'Ofertas de Emprego no Québec',
  'E-mails Profissionais & Corporativos',
  'Artigos de Imigração & Sociedade Canadense',
  'Comunicados Municipais (Montréal / Québec)',
  'Editoriais Críticos (La Presse / Le Devoir)'
];

export function ComprehensionEcrite({
  onSaveHistory,
  onSaveErrorToDeck,
  onShowToast
}) {
  const [selectedLevel, setSelectedLevel] = useState('B2');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [questionData, setQuestionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [vocabSaved, setVocabSaved] = useState(false);

  // Cronômetro rigoroso por questão de leitura
  const currentLevelMeta = LEVELS.find((l) => l.id === selectedLevel) || LEVELS[3];
  const [secondsLeft, setSecondsLeft] = useState(currentLevelMeta.timeSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const timerRef = useRef(null);

  const { speakText } = useFrenchAudio();

  const loadNewReading = async (lvl = selectedLevel, cat = selectedCategory) => {
    setIsLoading(true);
    setSelectedOption(null);
    setIsSubmitted(false);
    setVocabSaved(false);
    setIsTimeExpired(false);

    const lvlObj = LEVELS.find((l) => l.id === lvl) || LEVELS[3];
    setSecondsLeft(lvlObj.timeSeconds);
    setIsTimerRunning(false);

    try {
      const data = await generateTCFReadingQuestion({
        level: lvl,
        category: cat
      });
      setQuestionData(data);
      setIsTimerRunning(true);
    } catch (err) {
      console.error("[ComprehensionEcrite] Erro ao gerar texto:", err);
      if (onShowToast) {
        onShowToast(`❌ Erro Gemini: ${err.message || 'Falha ao gerar texto de leitura.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewReading(selectedLevel, selectedCategory);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Gerencia cronômetro rigoroso
  useEffect(() => {
    if (isTimerRunning && !isSubmitted && !isLoading) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            setIsTimeExpired(true);
            if (onShowToast) {
              onShowToast("⏰ Tempo da questão esgotado! Selecione sua resposta imediatamente.");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, isSubmitted, isLoading]);

  const handleConfirmAnswer = () => {
    if (!selectedOption || isSubmitted || !questionData) return;
    setIsTimerRunning(false);
    setIsSubmitted(true);

    const isCorrect = selectedOption === questionData.correctOption;
    const updatedHistory = [
      ...sessionHistory,
      {
        level: questionData.level || selectedLevel,
        isCorrect,
        title: questionData.title
      }
    ];
    setSessionHistory(updatedHistory);

    if (onShowToast) {
      onShowToast(
        isCorrect
          ? '✅ Resposta correta! Pontuação TCF CE atualizada.'
          : `❌ Resposta incorreta. A alternativa certa era a ${questionData.correctOption}.`
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
        explanation: `Contexto TCF CE (${questionData.level}): "${questionData.keyVocabulary.example}"`,
        source: `TCF Compréhension Écrite (${questionData.level})`
      });
    }
  };

  const scoreSummary = calculateTCFComprehensionScore(sessionHistory, 'ce');

  const handleSaveSessionScore = () => {
    if (sessionHistory.length === 0) {
      if (onShowToast) onShowToast("Responda pelo menos 1 questão de leitura para salvar sua nota.");
      return;
    }
    if (onSaveHistory) {
      onSaveHistory({
        date: new Date().toLocaleDateString('pt-BR'),
        mode: `Compréhension Écrite (${sessionHistory.length}Q)`,
        score: `${scoreSummary.points}/699 pts`,
        nclc: `${scoreSummary.nclc} (${scoreSummary.cefr})`
      });
    }
    if (onShowToast) {
      onShowToast(`🏆 Resultado CE (${scoreSummary.points}/699 pts • ${scoreSummary.nclc}) salvo no histórico!`);
    }
  };

  const min = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const sec = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna Esquerda: Nível, Cronômetro Rigoroso e Escala 330–699 */}
      <div className="space-y-6">
        {/* Seletor de Nível e Categoria */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              1. Nível & Tipo de Documento
            </h3>
            <span className="text-[11px] font-bold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
              Leitura TCF
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setSelectedLevel(lvl.id);
                  loadNewReading(lvl.id, selectedCategory);
                }}
                className={`py-2.5 rounded-xl font-extrabold text-xs border transition ${
                  selectedLevel === lvl.id
                    ? 'border-2 border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gênero Textual Canadense:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                loadNewReading(selectedLevel, e.target.value);
              }}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadNewReading(selectedLevel, selectedCategory)}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Gerar Novo Texto de Leitura ({selectedLevel})</span>
          </button>
        </div>

        {/* Cronômetro Rigoroso de Leitura */}
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-500" />
              <span>2. Cronômetro Rigoroso</span>
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isTimeExpired
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  : isTimerRunning
                  ? 'bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {isTimeExpired ? 'Tempo Esgotado!' : isTimerRunning ? 'Contando ⏱️' : 'Pausado'}
            </span>
          </div>

          <div className="text-center py-1">
            <div
              className={`text-4xl font-mono font-extrabold tracking-wider ${
                secondsLeft <= 20
                  ? 'text-rose-500 animate-pulse'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {min}:{sec}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Meta recomendada para leitura de nível {selectedLevel}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsTimerRunning((prev) => !prev)}
              disabled={isSubmitted}
              className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTimerRunning ? 'Pausar' : 'Retomar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTimeExpired(false);
                setSecondsLeft(currentLevelMeta.timeSeconds);
                setIsTimerRunning(true);
              }}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>
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

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-[#131C31] to-blue-950 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Pontuação Estimada CE
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-mono font-extrabold text-white">
                    {scoreSummary.points}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 699 pts</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block">
                  Nível Equivalente
                </span>
                <span className="inline-block mt-1 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono font-extrabold text-sm">
                  {scoreSummary.nclc} ({scoreSummary.cefr})
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, Math.round(((scoreSummary.points - 330) / (699 - 330)) * 100)))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>330 (A1)</span>
                <span>453 (NCLC 7)</span>
                <span>524 (NCLC 9)</span>
                <span>699 (C2)</span>
              </div>
            </div>
          </div>

          {/* Tabela Rápida de Referência IRCC CE */}
          <div className="space-y-1.5 text-[11px]">
            <p className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Régua Oficial IRCC (Compréhension Écrite):
            </p>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">NCLC 4 (A2):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">342–374</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between">
                <span className="text-blue-400">NCLC 5-6 (B1):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">375–452</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex justify-between">
                <span className="text-emerald-500 font-bold">NCLC 7-8 (B2):</span>
                <span className="font-bold text-emerald-500">453–523</span>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 flex justify-between">
                <span className="text-purple-400 font-bold">NCLC 9-10 (C1+):</span>
                <span className="font-bold text-purple-400">524–699</span>
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
            <span>Salvar Nota CE ({scoreSummary.points} pts) no Histórico</span>
          </button>
        </div>
      </div>

      {/* Coluna Direita (2 cols): Documento de Leitura + Pergunta (A, B, C, D) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Redigindo documento oficial de leitura ({selectedLevel})...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Preparando texto autêntico e questão interpretativa no padrão TCF Canada.
                </p>
              </div>
            </div>
          ) : questionData ? (
            <>
              {/* Alerta se o tempo esgotou */}
              {isTimeExpired && !isSubmitted && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs font-bold text-rose-500">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    O tempo recomendado para esta questão esgotou! No exame real do TCF, gerencie seu ritmo para responder todas as 39 questões em 60 minutos.
                  </span>
                </div>
              )}

              {/* Cabeçalho do Documento */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500 block">
                      {questionData.documentType} • Nível {questionData.level || selectedLevel}
                    </span>
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      {questionData.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => speakText(questionData.passage)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-500 transition flex items-center gap-1.5"
                  title="Ouvir leitura do texto em francês"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ouvir Texto</span>
                </button>
              </div>

              {/* Corpo do Documento de Leitura Editorial */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 shadow-inner">
                <p className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-normal">
                  {questionData.passage}
                </p>
              </div>

              {/* Pergunta de Múltipla Escolha */}
              <div className="space-y-3 pt-2">
                <h4 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  {questionData.question}
                </h4>

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

              {/* Botão Confirmar / Próximo */}
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
                    onClick={() => loadNewReading(selectedLevel, selectedCategory)}
                    className="w-full sm:w-auto ml-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Próximo Texto de Leitura</span>
                  </button>
                )}
              </div>

              {/* Explicação Comentada e Botão SM-2 */}
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
                        Justificativa no Texto & Análise das Alternativas
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {questionData.explanation}
                      </p>
                    </div>

                    {questionData.keyVocabulary && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase text-amber-500">
                            Vocabulário de Alto Valor (NCLC 7+):
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

export default ComprehensionEcrite;

