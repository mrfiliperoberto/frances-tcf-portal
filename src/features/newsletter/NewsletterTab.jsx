import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  Volume2,
  VolumeX,
  Plus,
  Sparkles,
  Clock,
  Languages
} from 'lucide-react';
import { NEWSLETTER_SEED } from '../../data/newsletterSeed';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { ArticlePicker, filterArticlesByLevel } from './ArticlePicker';

export function NewsletterTab({ onAddCard, onShowToast }) {
  const [selectedId, setSelectedId] = useState(NEWSLETTER_SEED[0]?.id);
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState(null);
  const [pinnedSegmentIndex, setPinnedSegmentIndex] = useState(0);
  const [autoSpeakOnHover, setAutoSpeakOnHover] = useState(false);
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  const { speakText, stopSpeaking } = useFrenchAudio();

  const currentArticle =
    NEWSLETTER_SEED.find((article) => article.id === selectedId) || NEWSLETTER_SEED[0];

  const selectArticle = (articleId) => {
    stopSpeaking();
    setSelectedId(articleId);
    setHoveredSegmentIndex(null);
    setPinnedSegmentIndex(0);
  };

  const handleLevelChange = (level) => {
    setLevelFilter(level);
    const visible = filterArticlesByLevel(NEWSLETTER_SEED, level);
    if (visible.length > 0 && !visible.some((article) => article.id === currentArticle.id)) {
      selectArticle(visible[0].id);
    }
  };
  const activeSegmentIndex =
    hoveredSegmentIndex !== null ? hoveredSegmentIndex : pinnedSegmentIndex;
  const activeSegment =
    currentArticle.segments[activeSegmentIndex] || currentArticle.segments[0];

  const handleSegmentMouseEnter = (segment, index) => {
    setHoveredSegmentIndex(index);
    setPinnedSegmentIndex(index);
    if (autoSpeakOnHover && segment?.fr) {
      speakText(segment.fr, 0.94);
    }
  };

  const handleSegmentMouseLeave = () => {
    setHoveredSegmentIndex(null);
  };

  const handlePlaySegmentAudio = (text, e) => {
    if (e) e.stopPropagation();
    if (!text) return;
    speakText(text, 0.92);
  };

  const handlePlayFullArticle = () => {
    const fullText = `${currentArticle.headline_fr}. ${currentArticle.segments
      .map((s) => s.fr)
      .join(' ')}`;
    speakText(fullText, 0.92);
    if (onShowToast) {
      onShowToast('🔊 Lendo a matéria completa em francês...');
    }
  };

  const handleAddSegmentToDeck = (segment, e) => {
    if (e) e.stopPropagation();
    if (!segment || !onAddCard) return;

    onAddCard({
      front: segment.fr,
      back: segment.pt,
      context: `Le Courrier Francophone • ${currentArticle.headline_fr}`,
      level: currentArticle.level || 'B1'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CABEÇALHO DE JORNAL DIGITAL ("LE COURRIER FRANCOPHONE") */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
        {/* Topo Editorial Estilo Gazeta */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-red-700 dark:text-red-400" />
            <span className="uppercase tracking-widest font-bold text-red-700 dark:text-red-400">
              {currentArticle.edition}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>{currentArticle.date}</span>
            <span>•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              Nível {currentArticle.level}
            </span>
          </div>
        </div>

        {/* Título Clássico do Jornal */}
        <div className="text-center space-y-2 py-2 border-b-2 border-double border-slate-200 dark:border-slate-800 pb-6">
          <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-slate-900 dark:text-white">
            Le Courrier Francophone
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Jornal digital interativo • Passe o mouse sobre qualquer trecho em francês para revelar a tradução e ouvir a pronúncia nativa.
          </p>
        </div>

        {/* Seletor de Edições: filtro por nível + cards */}
        <ArticlePicker
          articles={NEWSLETTER_SEED}
          selectedId={currentArticle.id}
          levelFilter={levelFilter}
          onLevelChange={handleLevelChange}
          onSelect={selectArticle}
        />

        {/* Barra de Controles */}
        <div className="flex flex-wrap items-center justify-end gap-4">
          {/* Controles de Áudio no Hover e Tradução */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoSpeakOnHover((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                autoSpeakOnHover
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Tocar pronúncia automaticamente ao passar o mouse sobre um trecho"
            >
              {autoSpeakOnHover ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>Áudio no Hover: {autoSpeakOnHover ? 'Ativo' : 'Clique'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFullTranslation((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showFullTranslation
                  ? 'bg-red-700/10 border-red-700/30 text-red-700 dark:text-red-400'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{showFullTranslation ? 'Ocultar Tradução Fixa' : 'Ver Tradução Completa'}</span>
            </button>

            <button
              type="button"
              onClick={handlePlayFullArticle}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Ouvir Notícia</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORPO DO JORNAL DIGITAL */}
      <article className="p-6 sm:p-10 lg:p-12 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-8">
        {/* Metadados e Manchete em Playfair Display */}
        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
            <span>{currentArticle.category}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium normal-case">
              <Clock className="w-3.5 h-3.5" />
              Leitura de {currentArticle.readingTime}
            </span>
          </div>

          <h2
            onClick={(e) => handlePlaySegmentAudio(currentArticle.headline_fr, e)}
            className="font-display font-bold text-2xl sm:text-4xl text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-red-700 dark:hover:text-red-400 transition-colors"
            title="Clique para ouvir a manchete em francês"
          >
            {currentArticle.headline_fr}
          </h2>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 italic">
            {currentArticle.headline_pt}
          </p>

          {currentArticle.subheadline_fr && (
            <div className="pt-2 pl-4 border-l-2 border-red-700/60 space-y-1">
              <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200">
                {currentArticle.subheadline_fr}
              </p>
              {showFullTranslation && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {currentArticle.subheadline_pt}
                </p>
              )}
            </div>
          )}
        </div>

        {/* PARÁGRAFO INTERATIVO COM SEGMENTOS MAPEADOS (HOVER TOOLTIP + ÁUDIO) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Passe o mouse sobre os trechos para tradução instantânea e áudio
            </span>
          </div>

          <div className="font-serif text-xl sm:text-2xl leading-loose text-slate-800 dark:text-slate-100 select-text">
            {currentArticle.segments.map((segment, index) => {
              const isHovered = hoveredSegmentIndex === index;
              const isPinned = pinnedSegmentIndex === index;

              return (
                <span
                  key={`${currentArticle.id}-seg-${index}`}
                  onMouseEnter={() => handleSegmentMouseEnter(segment, index)}
                  onMouseLeave={handleSegmentMouseLeave}
                  onClick={(e) => {
                    setPinnedSegmentIndex(index);
                    handlePlaySegmentAudio(segment.fr, e);
                  }}
                  className={`relative inline-block rounded-lg px-1.5 py-0.5 mx-0.5 transition-all duration-150 cursor-pointer ${
                    isHovered
                      ? 'bg-red-700 text-white shadow-sm'
                      : isPinned
                      ? 'bg-amber-500/15 dark:bg-amber-500/20 text-slate-900 dark:text-white underline decoration-red-700/50 decoration-2 underline-offset-4'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {segment.fr}

                  {/* Card Flutuante (Tooltip) ao passar o mouse */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.14 }}
                        className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 sm:w-72 p-3.5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xl font-sans text-left pointer-events-auto block"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
                          Tradução Contextual
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-white leading-snug block mb-2.5">
                          {segment.pt}
                        </span>

                        <span className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={(e) => handlePlaySegmentAudio(segment.fr, e)}
                            className="px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Ouvir Pronúncia</span>
                          </button>

                          {onAddCard && (
                            <button
                              type="button"
                              onClick={(e) => handleAddSegmentToDeck(segment, e)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ SM-2</span>
                            </button>
                          )}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              );
            })}
          </div>
        </div>

        {/* BARRA INFERIOR FIXA DE INSPEÇÃO DO TRECHO ATIVO (FR <-> PT + ÁUDIO) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400 block">
              Inspetor de Trecho Selecionado ({activeSegmentIndex + 1}/{currentArticle.segments.length})
            </span>
            <p className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
              “{activeSegment?.fr}”
            </p>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              → {activeSegment?.pt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => handlePlaySegmentAudio(activeSegment?.fr, e)}
              className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-xs"
            >
              <Volume2 className="w-4 h-4" />
              <span>Pronunciar Trecho</span>
            </button>

            {onAddCard && (
              <button
                type="button"
                onClick={(e) => handleAddSegmentToDeck(activeSegment, e)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-red-700 dark:text-red-400" />
                <span>Salvar no Deck SM-2</span>
              </button>
            )}
          </div>
        </div>

        {/* VISÃO OPCIONAL DE TRADUÇÃO COMPLETA LADO A LADO */}
        <AnimatePresence>
          {showFullTranslation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 overflow-hidden"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Mapa Completo de Segmentos (Francês • Português)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentArticle.segments.map((seg, idx) => (
                  <div
                    key={`map-${idx}`}
                    onClick={(e) => handlePlaySegmentAudio(seg.fr, e)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:border-red-700/40 transition cursor-pointer flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <p className="font-serif font-semibold text-sm text-slate-900 dark:text-white">
                        {seg.fr}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {seg.pt}
                      </p>
                    </div>
                    <Volume2 className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    </motion.div>
  );
}

export default NewsletterTab;

