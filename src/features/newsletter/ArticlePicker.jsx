import React from 'react';
import { Clock } from 'lucide-react';

export const LEVEL_FILTERS = ['Todos', 'A2', 'B1', 'B2'];

/** Returns the articles matching `level` ("Todos" or empty returns all of them). */
export function filterArticlesByLevel(articles, level) {
  if (!Array.isArray(articles)) return [];
  if (!level || level === 'Todos') return articles;
  return articles.filter((article) => article.level === level);
}

export function ArticlePicker({ articles, selectedId, levelFilter, onLevelChange, onSelect }) {
  const visibleArticles = filterArticlesByLevel(articles, levelFilter);

  return (
    <div className="space-y-4">
      {/* Filtro por nível */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por nível">
        {LEVEL_FILTERS.map((level) => {
          const isActive = level === levelFilter;
          const count = filterArticlesByLevel(articles, level).length;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={isActive}
              onClick={() => onLevelChange(level)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {level} <span className="opacity-70 font-medium">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Lista de matérias: rolagem horizontal no celular, grade a partir de sm */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
        {visibleArticles.map((article) => {
          const isSelected = article.id === selectedId;
          return (
            <button
              key={article.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(article.id)}
              className={`snap-start shrink-0 w-64 sm:w-auto text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? 'border-red-700 bg-red-700/5 dark:bg-red-400/10 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-red-700/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                <span className="truncate">{article.category}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono normal-case tracking-normal shrink-0">
                  {article.level}
                </span>
              </span>
              <span className="font-display font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-3">
                {article.headline_fr}
              </span>
              <span className="mt-auto flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {article.readingTime}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ArticlePicker;
