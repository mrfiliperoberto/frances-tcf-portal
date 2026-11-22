import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, RotateCw, Plus, CheckCircle2, Sparkles, X, Layers, Clock, Zap } from 'lucide-react';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { previewInterval, isCardDue } from '../../services/sm2Algorithm';

export function FlashcardDeck({
  flashcards = [],
  currentCardIndex = 0,
  pendingReviews = 0,
  onRateCard,
  onAddCard,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newTip, setNewTip] = useState('');

  const { speakText } = useFrenchAudio();

  // Filtra cartões se usuário quiser apenas os pendentes de hoje
  const displayedCards = filterDueOnly
    ? flashcards.filter(isCardDue)
    : flashcards;

  const totalCards = displayedCards.length;
  const currentCard = totalCards > 0 ? displayedCards[currentCardIndex % totalCards] : null;

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (currentCard?.front) {
      speakText(currentCard.front);
    }
  };

  const handleRate = (quality) => {
    setIsFlipped(false);
    if (onRateCard && currentCard) {
      onRateCard(currentCard.id ?? currentCardIndex, quality);
    }
  };

  const handleSaveNewCard = (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    if (onAddCard) {
      onAddCard({
        category: "Personalizado",
        front: newFront.trim(),
        phonetic: newPhonetic.trim() || "",
        back: newBack.trim(),
        tip: newTip.trim() || "Adicionado ao seu deck pessoal de estudos.",
        example: newTip.trim() || "",
      });
    }

    setNewFront('');
    setNewPhonetic('');
    setNewBack('');
    setNewTip('');
    setIsModalOpen(false);
  };

  if (!currentCard) {
    return (
      <div id="flashcard-box" className="p-8 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center font-bold">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
          🎉 Nenhuma revisão pendente para hoje!
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Você completou seus cartões agendados pelo algoritmo SM-2. Deseja praticar o baralho completo ou adicionar novos termos?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {filterDueOnly && (
            <button
              onClick={() => setFilterDueOnly(false)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              Revisar Baralho Completo ({flashcards.length})
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Novo Cartão</span>
          </button>
        </div>
      </div>
    );
  }

  // Previsões de intervalo SM-2 dinâmicas para o cartão atual
  const previewErrei = previewInterval(currentCard, 1);
  const previewDificil = previewInterval(currentCard, 3);
  const previewBom = previewInterval(currentCard, 4);
  const previewFacil = previewInterval(currentCard, 5);

  const isFromErrors = currentCard.isFromErrorLog || currentCard.category?.includes("Caderno de Erros");

  return (
    <div id="flashcard-box" className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Passo 1 • Motor SuperMemo SM-2
            </span>
            {isFromErrors && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" />
                Caderno de Erros
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Flashcards de Revisão Espaçada (SM-2 Real)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {flashcards.length > 0 && (
            <button
              onClick={() => setFilterDueOnly(prev => !prev)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                filterDueOnly
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300'
              }`}
              title="Alternar entre ver só vencidos ou todos"
            >
              {filterDueOnly ? `Vencidos Hoje (${pendingReviews})` : `Todos (${flashcards.length})`}
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Cartão</span>
          </button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 select-none h-60 sm:h-64 w-full">
        <motion.div
          onClick={handleFlip}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full cursor-pointer rounded-2xl shadow-xl"
        >
          {/* Frente (Francês) */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex flex-col justify-between border border-slate-700 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-rose-300 backdrop-blur-sm">
                {currentCard.category || "Essencial TCF"}
              </span>
              <button
                type="button"
                onClick={handleSpeak}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition flex items-center gap-1.5 text-xs font-bold"
                title="Ouvir Pronúncia"
              >
                <Volume2 className="w-4 h-4" />
                <span>Ouvir Pronúncia</span>
              </button>
            </div>

            <div className="text-center my-auto px-2">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                {currentCard.front}
              </p>
              {currentCard.phonetic && (
                <p className="text-xs sm:text-sm text-slate-400 mt-2 font-mono italic">
                  {currentCard.phonetic}
                </p>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Toque no cartão para ver a tradução e parâmetros SM-2</span>
            </div>
          </div>

          {/* Verso (Português & Parâmetros SM-2) */}
          <div
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 text-white p-6 flex flex-col justify-between border border-blue-500/30 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
                {isFromErrors ? "Correção Gramatical" : "Tradução & Uso no Canadá"}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <span>EF: {currentCard.easeFactor ?? 2.5}</span>
                <span>•</span>
                <span>Rep: {currentCard.repetition ?? 0}</span>
                <span>•</span>
                <span>Int: {currentCard.interval ?? 0}d</span>
              </div>
            </div>

            <div className="text-center my-auto space-y-2 px-2 overflow-y-auto max-h-36">
              <p className="text-base sm:text-lg font-bold text-emerald-300 whitespace-pre-line leading-relaxed">
                "{currentCard.back}"
              </p>
              {currentCard.tip && (
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  💡 {currentCard.tip}
                </p>
              )}
            </div>

            <div className="text-center text-xs text-slate-400">
              Escolha seu nível de domínio para calcular o próximo ciclo SM-2:
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4 Níveis Oficiais do SuperMemo SM-2 com Previsão do Intervalo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        {/* Nível 1: Errei (q = 1) */}
        <button
          type="button"
          onClick={() => handleRate(1)}
          className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold transition flex flex-col items-center justify-center text-center shadow-sm"
        >
          <span className="text-xs sm:text-sm">😓 Errei</span>
          <span className="text-[11px] font-mono font-medium opacity-90 mt-0.5">
            {previewErrei}
          </span>
        </button>

        {/* Nível 3: Difícil (q = 3) */}
        <button
          type="button"
          onClick={() => handleRate(3)}
          className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold transition flex flex-col items-center justify-center text-center shadow-sm"
        >
          <span className="text-xs sm:text-sm">🤔 Difícil</span>
          <span className="text-[11px] font-mono font-medium opacity-90 mt-0.5">
            {previewDificil}
          </span>
        </button>

        {/* Nível 4: Bom (q = 4) */}
        <button
          type="button"
          onClick={() => handleRate(4)}
          className="p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-500 font-bold transition flex flex-col items-center justify-center text-center shadow-sm"
        >
          <span className="text-xs sm:text-sm">🙂 Bom</span>
          <span className="text-[11px] font-mono font-medium opacity-90 mt-0.5">
            {previewBom}
          </span>
        </button>

        {/* Nível 5: Fácil (q = 5) */}
        <button
          type="button"
          onClick={() => handleRate(5)}
          className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-bold transition flex flex-col items-center justify-center text-center shadow-sm"
        >
          <span className="text-xs sm:text-sm">⚡ Fácil</span>
          <span className="text-[11px] font-mono font-medium opacity-90 mt-0.5">
            {previewFacil}
          </span>
        </button>
      </div>

      {/* MODAL: Adicionar Novo Cartão */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-500" />
                  Novo Flashcard SM-2 em Francês
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNewCard} className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Frase ou Expressão em Francês (Frente) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="Ex: Je tiens à vous remercier..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-rose-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Pronúncia Figurada (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newPhonetic}
                    onChange={(e) => setNewPhonetic(e.target.value)}
                    placeholder="Ex: [Jê tiãn a vu rêmêrciê]"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-rose-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Tradução em Português (Verso) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    placeholder="Ex: Faço questão de agradecer a você..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-rose-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Dica de Uso no Canadá / Contexto TCF
                  </label>
                  <input
                    type="text"
                    value={newTip}
                    onChange={(e) => setNewTip(e.target.value)}
                    placeholder="Ex: Excelente para fechar cartas formais na Tâche 2"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-rose-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition"
                  >
                    Salvar no Baralho SM-2
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FlashcardDeck;
