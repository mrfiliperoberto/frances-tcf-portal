import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

describe('Pronunciation library access counters (SSR)', () => {
  it('AccessCounters shows listen and recording counts', async () => {
    const { AccessCounters } = await import('../src/features/pronunciation/PronunciationLibraryTab.jsx');
    const html = renderToString(<AccessCounters listenCount={3} recordCount={2} />);
    expect(html).toContain('Ouvida <!-- -->3<!-- -->x');
    expect(html).toContain('Gravada <!-- -->2<!-- -->x');
  });

  it('counters are visible from zero on every card', async () => {
    const { PronunciationLibraryTab } = await import('../src/features/pronunciation/PronunciationLibraryTab.jsx');
    const { PRONUNCIATION_DICT } = await import('../src/data/pronunciationDict.js');
    const html = renderToString(<PronunciationLibraryTab />);
    const listenPills = html.match(/Ouvida <!-- -->0<!-- -->x/g) || [];
    const recordPills = html.match(/Gravada <!-- -->0<!-- -->x/g) || [];
    expect(listenPills).toHaveLength(PRONUNCIATION_DICT.length);
    expect(recordPills).toHaveLength(PRONUNCIATION_DICT.length);
  });
});
