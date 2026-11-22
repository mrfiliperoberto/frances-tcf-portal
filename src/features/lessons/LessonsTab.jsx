import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle2, 
  Volume2, 
  Clock, 
  Sparkles, 
  HelpCircle, 
  Check, 
  X as CloseIcon,
  ChevronRight
} from 'lucide-react';
import { LESSONS_DATA } from '../../data/lessonsData';
import { CANADA_EXPRESSIONS } from '../../data/canadaExpressions';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';

export function LessonsTab({
  completedLessons = [1],
  onCompleteLesson,
  onShowToast
}) {
  const [filterLevel, setFilterLevel] = useState('all');
  const [activeLessonId, setActiveLessonId] = useState(1);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null); // { isCorrect: bool, message: string }

  const { speakText } = useFrenchAudio();

  const filteredLessons = filterLevel === 'all'
    ? LESSONS_DATA
    : LESSONS_DATA.filter(l => l.level === filterLevel);

  const activeLesson = LESSONS_DATA.find(l => l.id === activeLessonId) || LESSONS_DATA[0];
  const isLessonDone = completedLessons.includes(activeLesson.id);

  const handleSelectLesson = (id) => {
    setActiveLessonId(id);
    setSelectedQuizOption(null);
    setQuizFeedback(null);
  };

  const handleCheckQuiz = (optionIndex) => {
    setSelectedQuizOption(optionIndex);
    const isCorrect = optionIndex === activeLesson.quiz.correct;

    if (isCorrect) {
      setQuizFeedback({
        isCorrect: true,
        message: "🎉 Félicitations ! Resposta correta! Módulo dominado e concluído com sucesso."
      });
      if (onCompleteLesson) {
        onCompleteLesson(activeLesson.id);
      }
      onShowToast("🎉 Módulo concluído com sucesso!");
    } else {
      setQuizFeedback({
        isCorrect: false,
        message: "❌ Quase lá! Revise a explicação e frases modelo acima e tente novamente."
      });
      onShowToast("Resposta incorreta. Tente novamente!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Module Filter Header */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
            Trilha Estruturada Sem Enrolação
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Aulas da Semana (A1 ao B2) & Expressões do Canadá
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Explicações diretas em português, áudio nativo e mini-prova ao final de cada módulo para validar seu avanço.
          </p>
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todos os Níveis' },
            { id: 'A1', label: 'A1 • Base' },
            { id: 'A2', label: 'A2 • Cotidiano' },
            { id: 'B1', label: 'B1 • NCLC 5' },
            { id: 'B2', label: 'B2 • TCF NCLC 7+' },
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setFilterLevel(lvl.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                filterLevel === lvl.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Lessons List + Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lesson Modules List */}
        <div className="space-y-3">
          {filteredLessons.map(lesson => {
            const isDone = completedLessons.includes(lesson.id);
            const isActive = lesson.id === activeLessonId;
            return (
              <div
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson.id)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {lesson.level} • {lesson.week}
                  </span>
                  {isDone ? (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluída</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.duration}</span>
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {lesson.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {lesson.summary}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Lesson Content + Quiz */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase text-rose-500 tracking-wider">
                {activeLesson.level} • {activeLesson.week}
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {activeLesson.title}
              </h3>
            </div>
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isLessonDone
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              {isLessonDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Módulo Dominado</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Em andamento</span>
                </>
              )}
            </span>
          </div>

          {/* Explanation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Explicação Direta em Português
            </h4>
            <div className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
              {activeLesson.explanation}
            </div>
          </div>

          {/* Examples with Native Audio */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Frases Modelo com Pronúncia Nativa
            </h4>
            <div className="space-y-2.5">
              {activeLesson.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 group"
                >
                  <div>
                    <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {ex.fr}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ex.pt}
                    </p>
                  </div>
                  <button
                    onClick={() => speakText(ex.fr)}
                    className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shrink-0 shadow-sm transition"
                    title="Ouvir em Francês"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Prova da Semana */}
          <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-extrabold uppercase text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Prova Rápida da Semana (Validação)</span>
              </span>
              <span className="text-xs text-slate-400">Acerte para concluir o módulo</span>
            </div>

            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {activeLesson.quiz.question}
            </p>

            <div className="space-y-2">
              {activeLesson.quiz.options.map((opt, idx) => {
                const isSelected = selectedQuizOption === idx;
                const isCorrectOption = idx === activeLesson.quiz.correct;
                let optionStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200";

                if (selectedQuizOption !== null) {
                  if (isSelected && isCorrectOption) {
                    optionStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold";
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = "bg-rose-500/10 border-rose-500 text-rose-500 font-bold";
                  } else if (isCorrectOption) {
                    optionStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleCheckQuiz(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition flex items-center justify-between ${optionStyle}`}
                  >
                    <span>{opt}</span>
                    {selectedQuizOption !== null && isSelected && (
                      isCorrectOption ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <CloseIcon className="w-4 h-4 text-rose-500 shrink-0" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {quizFeedback && (
              <div
                className={`p-3 rounded-xl text-xs sm:text-sm font-medium ${
                  quizFeedback.isCorrect
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {quizFeedback.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bonus Section: Expressões do Canadá */}
      <div className="bg-gradient-to-br from-slate-900 via-[#121B2E] to-rose-950/60 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              🍁 Módulo Bônus Exclusivo
            </span>
            <h3 className="font-display text-xl font-extrabold text-white mt-1">
              Francês Real do Canadá (Québec & Francofonia)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Palavras e expressões que você vai ouvir nas ruas de Montréal, Québec ou Ottawa e nos áudios do TCF Canada.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="canada-expressions-grid">
          {CANADA_EXPRESSIONS.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col justify-between space-y-3 hover:border-white/20 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-base text-rose-400">
                    {item.expr}
                  </span>
                  <button
                    onClick={() => speakText(item.fr)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-rose-600 text-white text-xs transition flex items-center gap-1"
                    title="Ouvir expressão"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Ouvir</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-medium text-white mt-2 italic">
                  "{item.fr}"
                </p>
                <p className="text-xs text-emerald-300 mt-1 font-semibold">
                  {item.pt}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-white/10 pt-2">
                {item.context}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default LessonsTab;
