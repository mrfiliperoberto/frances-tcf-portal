import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NEWSLETTER_SEED } from '../src/data/newsletterSeed.js';
import {
  ArticlePicker,
  filterArticlesByLevel,
  LEVEL_FILTERS
} from '../src/features/newsletter/ArticlePicker.jsx';

const noop = () => {};

describe('filterArticlesByLevel', () => {
  it('returns every article for "Todos" or an empty level', () => {
    expect(filterArticlesByLevel(NEWSLETTER_SEED, 'Todos')).toHaveLength(NEWSLETTER_SEED.length);
    expect(filterArticlesByLevel(NEWSLETTER_SEED, '')).toHaveLength(NEWSLETTER_SEED.length);
  });

  it.each(['A2', 'B1', 'B2'])('returns only %s articles', (level) => {
    const result = filterArticlesByLevel(NEWSLETTER_SEED, level);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((article) => article.level === level)).toBe(true);
  });

  it('level counts add up to the total', () => {
    const total = ['A2', 'B1', 'B2']
      .map((level) => filterArticlesByLevel(NEWSLETTER_SEED, level).length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(NEWSLETTER_SEED.length);
  });

  it('handles a missing list', () => {
    expect(filterArticlesByLevel(undefined, 'A2')).toEqual([]);
  });
});

describe('ArticlePicker (SSR)', () => {
  it('renders all level filters and only the filtered cards', () => {
    const html = renderToString(
      <ArticlePicker
        articles={NEWSLETTER_SEED}
        selectedId="news-3"
        levelFilter="A2"
        onLevelChange={noop}
        onSelect={noop}
      />
    );
    LEVEL_FILTERS.forEach((level) => expect(html).toContain(level));
    const a2 = filterArticlesByLevel(NEWSLETTER_SEED, 'A2');
    const notA2 = NEWSLETTER_SEED.filter((article) => article.level !== 'A2');
    // Count cards by their aria-pressed buttons minus the 4 filter buttons.
    const pressedButtons = html.match(/aria-pressed=/g) || [];
    expect(pressedButtons.length).toBe(LEVEL_FILTERS.length + a2.length);
    expect(notA2.length).toBeGreaterThan(0);
  });

  it('NewsletterTab renders the picker', async () => {
    const { NewsletterTab } = await import('../src/features/newsletter/NewsletterTab.jsx');
    const html = renderToString(<NewsletterTab />);
    expect(html).toContain('Filtrar por nível');
    expect(html).toContain(NEWSLETTER_SEED[0].headline_fr.slice(0, 20));
  });

  it('NewsletterTab shows the editorial fiction badge for fictional articles', async () => {
    const { NewsletterTab } = await import('../src/features/newsletter/NewsletterTab.jsx');
    expect(NEWSLETTER_SEED[0].isFictional).toBe(true);
    expect(renderToString(<NewsletterTab />)).toContain('Ficção editorial');
  });
});
