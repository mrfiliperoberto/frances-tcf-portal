import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';
import { NEWSLETTER_SEED } from '../../data/newsletterSeed';
import { ArticlePicker } from './ArticlePicker';
import { ArticleReader } from './ArticleReader';
import { getNextArticle } from './articleNavigation';

const scrollWindowTo = (top) => {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top, behavior: 'auto' });
  }
};

/**
 * Le Courrier Francophone: capa (filtro + cards) e página da matéria.
 * Abrir uma matéria troca a capa pela página de leitura, já no topo; voltar restaura a capa
 * na mesma posição de rolagem e com o mesmo filtro.
 */
export function NewsletterTab({ onAddCard, onShowToast }) {
  const [openArticleId, setOpenArticleId] = useState(null);
  const [lastOpenedId, setLastOpenedId] = useState(null);
  const [levelFilter, setLevelFilter] = useState('Todos');
  const coverScrollRef = useRef(0);
  const pendingScrollRef = useRef(null);

  const openArticle = NEWSLETTER_SEED.find((article) => article.id === openArticleId) || null;
  const nextArticle = openArticle ? getNextArticle(NEWSLETTER_SEED, levelFilter, openArticle.id) : null;

  // Aplica a rolagem pedida depois que a nova "página" foi renderizada
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null) {
      scrollWindowTo(pendingScrollRef.current);
      pendingScrollRef.current = null;
    }
  }, [openArticleId]);

  const showArticle = (articleId) => {
    if (!openArticleId && typeof window !== 'undefined') {
      coverScrollRef.current = window.scrollY || 0;
    }
    pendingScrollRef.current = 0;
    setLastOpenedId(articleId);
    setOpenArticleId(articleId);
  };

  const showCover = () => {
    pendingScrollRef.current = coverScrollRef.current;
    setOpenArticleId(null);
  };

  if (openArticle) {
    return (
      <ArticleReader
        key={openArticle.id}
        article={openArticle}
        nextArticle={nextArticle}
        onBack={showCover}
        onNext={() => nextArticle && showArticle(nextArticle.id)}
        onAddCard={onAddCard}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 font-sans"
    >
      {/* CAPA DO JORNAL DIGITAL ("LE COURRIER FRANCOPHONE") */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-red-700 dark:text-red-400" />
            <span className="uppercase tracking-widest font-bold text-red-700 dark:text-red-400">
              Édition Canada francophone
            </span>
          </div>
          <span>{NEWSLETTER_SEED.length} matérias • A2 a B2</span>
        </div>

        <div className="text-center space-y-2 py-2 border-b-2 border-double border-slate-200 dark:border-slate-800 pb-6">
          <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-slate-900 dark:text-white">
            Le Courrier Francophone
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Jornal digital interativo • Escolha uma matéria para ler com tradução por trecho e pronúncia nativa.
          </p>
        </div>

        {/* Seletor de Edições: filtro por nível + cards */}
        <ArticlePicker
          articles={NEWSLETTER_SEED}
          selectedId={lastOpenedId}
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          onSelect={showArticle}
        />
      </header>
    </motion.div>
  );
}

export default NewsletterTab;
