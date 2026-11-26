import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NEWSLETTER_SEED } from '../src/data/newsletterSeed.js';
import { ArticleReader } from '../src/features/newsletter/ArticleReader.jsx';
import {
  getNextArticle,
  readArticleFromState,
  withArticleState,
  HISTORY_KEY
} from '../src/features/newsletter/articleNavigation.js';

const noop = () => {};
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');

describe('getNextArticle', () => {
  it('returns the next article in the full list', () => {
    expect(getNextArticle(NEWSLETTER_SEED, 'Todos', NEWSLETTER_SEED[0].id)).toBe(NEWSLETTER_SEED[1]);
  });

  it('respects the level filter', () => {
    const b2 = NEWSLETTER_SEED.filter((a) => a.level === 'B2');
    expect(getNextArticle(NEWSLETTER_SEED, 'B2', b2[0].id)).toBe(b2[1]);
  });

  it('returns null for the last visible article or an unknown id', () => {
    const last = NEWSLETTER_SEED[NEWSLETTER_SEED.length - 1];
    expect(getNextArticle(NEWSLETTER_SEED, 'Todos', last.id)).toBeNull();
    expect(getNextArticle(NEWSLETTER_SEED, 'Todos', 'nope')).toBeNull();
  });
});

describe('history state helpers', () => {
  it('reads the open article id from history.state', () => {
    expect(readArticleFromState({ [HISTORY_KEY]: 'news-3' })).toBe('news-3');
    expect(readArticleFromState(null)).toBeNull();
    expect(readArticleFromState({ other: 1 })).toBeNull();
    expect(readArticleFromState({ [HISTORY_KEY]: 42 })).toBeNull();
  });

  it('sets and clears the article without dropping other state', () => {
    const state = withArticleState({ keep: true }, 'news-2');
    expect(state).toEqual({ keep: true, [HISTORY_KEY]: 'news-2' });
    expect(withArticleState(state, null)).toEqual({ keep: true });
    expect(withArticleState(null, 'news-1')).toEqual({ [HISTORY_KEY]: 'news-1' });
  });
});

describe('ArticleReader (SSR)', () => {
  const article = NEWSLETTER_SEED[0];

  it('renders the article page with back button, badge, segments and next article', () => {
    const html = renderToString(
      <ArticleReader article={article} nextArticle={NEWSLETTER_SEED[1]} onBack={noop} onNext={noop} />
    );
    expect(html).toContain('Voltar às edições');
    expect(html).toContain('Ficção editorial');
    expect(html).toContain('Inspetor de Trecho');
    expect(html).toContain(escapeHtml(article.segments[0].fr));
    expect(html).toContain('Próxima matéria');
    expect(html).toContain(escapeHtml(NEWSLETTER_SEED[1].headline_fr));
  });

  it('hides "Próxima matéria" when there is no next article', () => {
    const html = renderToString(<ArticleReader article={article} nextArticle={null} onBack={noop} onNext={noop} />);
    expect(html).not.toContain('Próxima matéria');
  });
});

describe('NewsletterTab + browser history (SSR)', () => {
  it('opens the article stored in history.state (e.g. after a reload while reading)', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('window', {
      history: { state: { [HISTORY_KEY]: 'news-3' }, pushState: noop, replaceState: noop, back: noop },
      scrollY: 0
    });
    const { NewsletterTab } = await import('../src/features/newsletter/NewsletterTab.jsx');
    const html = renderToString(<NewsletterTab />);
    const news3 = NEWSLETTER_SEED.find((a) => a.id === 'news-3');
    expect(html).toContain('Voltar às edições');
    expect(html).toContain(escapeHtml(news3.headline_fr));
    vi.unstubAllGlobals();
  });

  it('ignores unknown article ids in history.state and shows the cover', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('window', {
      history: { state: { [HISTORY_KEY]: 'news-999' }, pushState: noop, replaceState: noop, back: noop },
      scrollY: 0
    });
    const { NewsletterTab } = await import('../src/features/newsletter/NewsletterTab.jsx');
    const html = renderToString(<NewsletterTab />);
    expect(html).toContain('Filtrar por nível');
    expect(html).not.toContain('Voltar às edições');
    vi.unstubAllGlobals();
  });
});
