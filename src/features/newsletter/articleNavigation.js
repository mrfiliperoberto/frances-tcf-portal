import { filterArticlesByLevel } from './ArticlePicker';

/** Key used in window.history.state to remember which article page is open. */
export const HISTORY_KEY = 'newsletterArticle';

/** Next article after `currentId` among the ones visible with `levelFilter`, or null. */
export function getNextArticle(articles, levelFilter, currentId) {
  const visible = filterArticlesByLevel(articles, levelFilter);
  const index = visible.findIndex((article) => article.id === currentId);
  if (index === -1 || index === visible.length - 1) return null;
  return visible[index + 1];
}

/** Article id stored in a history state object, or null. */
export function readArticleFromState(state) {
  const id = state && typeof state === 'object' ? state[HISTORY_KEY] : null;
  return typeof id === 'string' && id ? id : null;
}

/** Copy of `state` with the open article set (or removed when `articleId` is null). */
export function withArticleState(state, articleId) {
  const base = state && typeof state === 'object' ? { ...state } : {};
  if (articleId) base[HISTORY_KEY] = articleId;
  else delete base[HISTORY_KEY];
  return base;
}
