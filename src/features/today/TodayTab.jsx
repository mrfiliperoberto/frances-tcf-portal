import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Flame, 
  Mic, 
  Layers, 
  Compass, 
  ListChecks, 
  Calculator, 
  Headphones, 
  TrendingUp, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import FlashcardDeck from '../flashcards/FlashcardDeck';

export function TodayTab({
  state,
  onToggleDailyStep,
  onCompleteDayStreak,
  onRateCard,
  onAddCard,
  onNavigateTab,
  onShowToast
}) {
  const [hoursPerWeek, setHoursPerWeek] = useState(7);

  // Formata data atual
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  // Cálculo de pontuação e nível estimado
  const completedLessonsCount = state.completedLessons?.length || 0;
  const aiSessions = state.aiSessions || 0;
  const studyStreak = state.studyStreak || 1;
  const score = (completedLessonsCount * 15) + (aiSessions * 5) + (studyStreak * 2);

  let levelLabel = "A1 • NCLC 1-2";
  let percent = Math.min(100, Math.max(15, score));
  if (score > 80) levelLabel = "B2 • NCLC 7+";
  else if (score > 55) levelLabel = "B1 • NCLC 5-6";
  else if (score > 30) levelLabel = "A2 • NCLC 4";

  // Progresso dos 4 passos
  const completedSteps = [1, 2, 3, 4].filter(num => !!state.dailySteps?.[num]).length;
  const stepsPercentage = Math.round((completedSteps / 4) * 100);

  // Estimativa da Calculadora
  const hoursPerDay = (hoursPerWeek / 7).toFixed(1).replace('.0', '');
  const monthsB1 = Math.max(2, Math.round(150 / (hoursPerWeek * 4.3)));
  const monthsB2 = Math.max(4, Math.round(290 / (hoursPerWeek * 4.3)));

  const handleImmersionToggle = (e) => {
    if (e.target.checked) {
      onToggleDailyStep(4, true);
      onShowToast("🍁 Hábito de imersão canadense registrado!");
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
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#131C31] to-rose-950 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium text-rose-300 border border-white/10">
              <span>🇫🇷 🇨🇦 Método Guiado sem Decoreba</span>
              <span>•</span>
              <span className="capitalize">{todayFormatted}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour ! Pronto para avançar rumo ao Canadá hoje?
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Você não precisa descobrir o que estudar. Siga os 4 blocos da sua rotina diária na ordem
              abaixo para destravar a fala e construir base para o TCF.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={onCompleteDayStreak}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Concluir Meta de Hoje</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ofensiva de Estudo
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5 fill-amber-500" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span id="kpi-study-days" className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {studyStreak}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">dias seguidos</span>
          </div>
          <p className="text-xs text-emerald-500 mt-2 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Consistência ativa
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Falando com a IA
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Mic className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span id="kpi-ai-days" className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {aiSessions}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">sessões práticas</span>
          </div>
          <p className="text-xs text-blue-400 mt-2 font-medium">Destravando o ouvido e a fala</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Revisões de Hoje
            </span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <Layers className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span id="kpi-pending-reviews" className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {state.pendingReviews ?? 6}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">cartões pendentes</span>
          </div>
          <p id="kpi-reviews-status" className="text-xs text-rose-400 mt-2 font-medium">
            {state.pendingReviews === 0 ? "🎉 Revisões de hoje concluídas!" : "Memória espaçada ativa"}
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nível Estimado
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Compass className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span id="kpi-level" className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-500">
              {levelLabel}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              id="kpi-level-bar"
              className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Rotina + Flashcard), Right Column (Calculadora + Imersão) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Barra de Progresso da Rotina Diária */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <ListChecks className="w-5 h-5 text-rose-500" />
                  Sua Rotina Guiada de Hoje (Na Ordem Certa)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Marque cada etapa conforme concluir seu estudo diário
                </p>
              </div>
              <span
                id="daily-progress-badge"
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500"
              >
                {completedSteps} de 4 concluídos ({stepsPercentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
              <div
                id="daily-progress-bar"
                className="h-full bg-gradient-to-r from-rose-500 to-blue-600 transition-all duration-500"
                style={{ width: `${stepsPercentage}%` }}
              />
            </div>

            {/* Checklist Interactive Steps */}
            <div className="space-y-3">
              {/* Passo 1 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 transition hover:border-slate-300 dark:hover:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    id="check-step-1"
                    checked={!!state.dailySteps?.[1]}
                    onChange={(e) => onToggleDailyStep(1, e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-slate-900 dark:text-white">
                      1. Revisão Espaçada (Flashcards com Áudio)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      5 min • Nunca esqueça as estruturas e palavras dos dias anteriores.
                    </span>
                  </div>
                </label>
                <a
                  href="#flashcard-box"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                >
                  Revisar
                </a>
              </div>

              {/* Passo 2 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 transition hover:border-slate-300 dark:hover:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    id="check-step-2"
                    checked={!!state.dailySteps?.[2]}
                    onChange={(e) => onToggleDailyStep(2, e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-slate-900 dark:text-white">
                      2. Micro-Aula Estruturada do Dia
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      15 min • Gramática descomplicada em português + frases modelo.
                    </span>
                  </div>
                </label>
                <button
                  onClick={() => onNavigateTab('aulas')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition flex items-center gap-1"
                >
                  <span>Ir p/ Aula</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Passo 3 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 transition hover:border-slate-300 dark:hover:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    id="check-step-3"
                    checked={!!state.dailySteps?.[3]}
                    onChange={(e) => onToggleDailyStep(3, e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-slate-900 dark:text-white">
                      3. Prática de Fala com a Professora IA
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      10 min • Destrave a fala sem medo de julgamento na sua etapa atual.
                    </span>
                  </div>
                </label>
                <button
                  onClick={() => onNavigateTab('ia')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition flex items-center gap-1"
                >
                  <span>Praticar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Passo 4 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 transition hover:border-slate-300 dark:hover:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    id="check-step-4"
                    checked={!!state.dailySteps?.[4]}
                    onChange={(e) => onToggleDailyStep(4, e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm sm:text-base block text-slate-900 dark:text-white">
                      4. Imersão Canadense no Cotidiano
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      10 min • Ouvir 1 áudio da Radio-Canada ou narrar seu dia em francês.
                    </span>
                  </div>
                </label>
                <span className="text-xs font-medium text-slate-400 px-2 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-md">
                  Hábito
                </span>
              </div>
            </div>
          </div>

          {/* Flashcards Deck Component */}
          <FlashcardDeck
            flashcards={state.flashcards}
            currentCardIndex={state.currentCardIndex}
            pendingReviews={state.pendingReviews}
            onRateCard={onRateCard}
            onAddCard={onAddCard}
          />
        </div>

        {/* Right Column (1 col): Calculadora de Meta & Hábitos de Imersão */}
        <div className="space-y-6">
          {/* Calculadora de Meta Semanal (NCLC) */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>Planejador Realista</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Quando vou chegar no nível do Canadá?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Defina quantas horas por semana você pode dedicar ao portal e veja sua previsão real para
              atingir <strong className="text-slate-800 dark:text-slate-200">NCLC 5</strong> (Francophone Mobility) e <strong className="text-slate-800 dark:text-slate-200">NCLC 7</strong> (Express Entry).
            </p>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Dedicação Semanal:</span>
                <span id="calc-hours-label" className="text-rose-500 font-extrabold font-mono">
                  {hoursPerWeek} horas / sem (~{hoursPerDay}h/dia)
                </span>
              </div>
              <input
                type="range"
                id="calc-hours-slider"
                min="3"
                max="20"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(parseInt(e.target.value, 10))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>3h/sem (Leve)</span>
                <span>10h/sem (Focado)</span>
                <span>20h/sem (Intensivo)</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase block">
                    Meta 1 • Nível B1 (NCLC 5)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Permissão de trabalho Francophone
                  </span>
                </div>
                <span id="calc-b1-result" className="text-sm font-extrabold font-mono bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg">
                  ~{monthsB1} meses
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-500 uppercase block">
                    Meta 2 • Nível B2 (NCLC 7+)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    +50 pts bônus no Express Entry
                  </span>
                </div>
                <span id="calc-b2-result" className="text-sm font-extrabold font-mono bg-rose-500/15 text-rose-400 px-3 py-1 rounded-lg">
                  ~{monthsB2} meses
                </span>
              </div>
            </div>
          </div>

          {/* Checklist de Imersão Diária Canadense */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Headphones className="w-4 h-4 text-blue-500" />
                Hábitos de Imersão no Brasil
              </h3>
              <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                Bônus Diário
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Transforme seu ambiente para acostumar seu cérebro com o francês falado no Canadá:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  onChange={handleImmersionToggle}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Ouvir 10 min do app <strong className="text-slate-900 dark:text-white">Ohdio (Radio-Canada)</strong>
                </span>
              </label>
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  onChange={handleImmersionToggle}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Narrar em voz alta 3 coisas que estou fazendo agora
                </span>
              </label>
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  onChange={handleImmersionToggle}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Ler 1 notícia rápida no <em className="text-slate-900 dark:text-white font-medium">La Presse</em> ou <em className="text-slate-900 dark:text-white font-medium">Le Devoir</em>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default TodayTab;
