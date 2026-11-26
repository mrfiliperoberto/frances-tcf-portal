import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Volume2,
  CheckCircle2,
  PenTool,
  Sparkles,
  Plus
} from 'lucide-react';
import {
  getAllGuidedReadingChapters,
  completeGuidedReadingChapter
} from '../../services/db';
import { LE_PETIT_PRINCE_SENTENCES, LE_PETIT_PRINCE_BOOK } from '../../data/lePetitPrince';
import { playFrench, stopFrench } from '../../services/ttsService';

export function GuidedReadingTab({ onAddCard, onShowToast }) {
  const [sentences] = useState(LE_PETIT_PRINCE_SENTENCES);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);

  // Proxy /__tts first, speechSynthesis fallback; the service logs the real error.
  const playTextAudio = useCallback(
    (text) => {
      playFrench(text).catch(() => {
        if (onShowToast) {
          onShowToast('Não foi possível reproduzir o áudio desta frase.', 'error');
        }
      });
    },
    [onShowToast]
  );

  // Sincroniza status de conclusão do capítulo no IndexedDB
  const loadCompletionState = useCallback(async () => {
    try {
      const chapters = await getAllGuidedReadingChapters();
      if (chapters.length > 0) {
        setIsChapterCompleted(Boolean(chapters[0].is_completed));
      }
    } catch (err) {
      console.error('Erro ao ler guidedReading no IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadCompletionState();
    return () => {
      stopFrench();
    };
  }, [loadCompletionState]);

  const handleMouseEnter = (item) => {
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleCompleteChapter = async () => {
    try {
      const nextState = !isChapterCompleted;
      await completeGuidedReadingChapter(1, nextState);
      setIsChapterCompleted(nextState);
      if (onShowToast && nextState) {
        onShowToast(
          `📖 Parabéns! "${LE_PETIT_PRINCE_BOOK.chapterTitle}" concluído no IndexedDB!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Erro ao concluir capítulo:', err);
    }
  };

  const handleSavePhraseToDeck = (e, item) => {
    e.stopPropagation();
    if (!onAddCard) return;
    onAddCard({
      category: 'Leitura Guiada • Le Petit Prince',
      front: item.french,
      back: item.translation,
      example: item.french,
      tip: item.translation
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO EDITORIAL DO MÓDULO DE LEITURA GUIADA */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-700/10 text-red-700 dark:text-red-400 border border-red-700/20 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Leitura Guiada Interativa • Hover + TTS (fr-CA)
            </span>
            {isChapterCompleted && (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Capítulo Concluído
              </span>
            )}
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white">
            {LE_PETIT_PRINCE_BOOK.title}
          </h1>
          <p className="font-display italic text-lg text-slate-600 dark:text-slate-300">
            {LE_PETIT_PRINCE_BOOK.chapterTitle} — {LE_PETIT_PRINCE_BOOK.author}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Passe o rato sobre qualquer frase em francês para exibir a tradução instantânea em um Tooltip flutuante e ouvir a leitura neural com sotaque do Québec (`fr-CA`).
        </p>
      </header>

      {/* PÁGINA DO LIVRO INTERATIVA + PAINEL LATERAL EDITORIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA (8 cols): Texto Literário Contínuo com Spans Interativos */}
        <article className="lg:col-span-8 p-6 sm:p-10 md:p-12 rounded-3xl bg-[#FCFBF7] dark:bg-[#111827] border border-stone-200/90 dark:border-slate-800/90 shadow-sm space-y-8">
          <div className="border-b border-stone-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-slate-500 block">
                Texto Original Interativo
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-0.5">
                Chapitre I
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-400 dark:text-slate-500">
              {sentences.length} segmentos
            </span>
          </div>

          {/* Aviso de interação (Hover para traduzir + Clique para ouvir a pronúncia) */}
          <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium flex items-center gap-2">
            <span>💡 Passe o rato para traduzir, clique na frase para ouvir a pronúncia.</span>
          </div>

          {/* Renderização através de .map() de { id, french, translation } em <span> inline */}
          <div className="font-display text-xl sm:text-2xl leading-loose text-slate-800 dark:text-slate-100 space-y-2">
            {sentences.map((item) => {
              const isHovered = hoveredItem?.id === item.id;

              return (
                <span
                  key={item.id}
                  onMouseEnter={() => handleMouseEnter(item)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => playTextAudio(item.french)}
                  className="relative inline-block mr-1.5 mb-1 cursor-pointer transition-colors duration-200 hover:bg-zinc-800 hover:text-white p-1 rounded"
                >
                  {item.french}

                  {/* Tooltip Flutuante Elegante ao passar o rato */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.14 }}
                        className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 sm:w-80 p-4 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xl font-sans text-left pointer-events-auto block"
                      >
                        <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            Tradução & Áudio Québec (fr-CA)
                          </span>
                          <span>#{item.id}</span>
                        </span>

                        <span className="text-xs sm:text-sm font-medium text-zinc-100 leading-relaxed block">
                          {item.translation}
                        </span>

                        {onAddCard && (
                          <span className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleSavePhraseToDeck(e, item)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-red-700 text-zinc-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Salvar Frase</span>
                            </button>
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              );
            })}
          </div>
        </article>

        {/* COLUNA DIREITA (4 cols): Inspetor do Segmento Ativo, Lembrete de Caderno e Conclusão */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          {/* Card Inspetor Instantâneo */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                Leitor Neural Québec (fr-CA)
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {hoveredItem ? `Frase #${hoveredItem.id}` : 'Hover Ativo'}
              </span>
            </div>

            {hoveredItem ? (
              <div className="space-y-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                <p className="font-display italic text-base text-white leading-relaxed">
                  « {hoveredItem.french} »
                </p>
                <p className="text-xs sm:text-sm text-emerald-400 font-medium leading-relaxed border-t border-zinc-800 pt-2.5">
                  {hoveredItem.translation}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
                Posicione o cursor sobre qualquer frase na página ao lado para ouvir imediatamente a pronúncia em francês canadense e visualizar a tradução.
              </div>
            )}
          </div>

          {/* Lembrete Visual para o Caderno Físico */}
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <PenTool className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 block">
                Ritual de Estudo Editorial
              </span>
              <p className="font-display font-bold text-base leading-snug">
                Anote no caderno o vocabulário desconhecido antes de prosseguir
              </p>
              <p className="text-xs opacity-85 leading-relaxed">
                Transcrever à mão expressões literárias consolida a retenção de longo prazo para o ciclo 15-30-45 dias.
              </p>
            </div>
          </div>

          {/* Card de Conclusão do Capítulo no IndexedDB */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Progresso da Obra
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isChapterCompleted ? '100% Concluído' : 'Em andamento'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCompleteChapter}
              className={`w-full py-3.5 px-5 rounded-2xl font-semibold text-sm transition flex items-center justify-center gap-2.5 cursor-pointer shadow-md ${
                isChapterCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isChapterCompleted
                  ? 'Capítulo Concluído no IndexedDB ✓'
                  : 'Concluir Capítulo'}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

export default GuidedReadingTab;
