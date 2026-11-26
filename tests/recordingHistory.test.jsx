import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  RecordingHistory,
  formatDuration,
  getFirstAndLatest
} from '../src/features/pronunciation/RecordingHistory.jsx';

describe('RecordingHistory helpers', () => {
  it('formats durations with a comma decimal', () => {
    expect(formatDuration(2.14)).toBe('2,1 s');
    expect(formatDuration(1)).toBe('1,0 s');
    expect(formatDuration(undefined)).toBe('');
  });

  it('returns the oldest and newest recordings from a newest-first list', () => {
    const list = [
      { id: 3, recordedAt: '2026-11-20T10:00:00Z' },
      { id: 2, recordedAt: '2026-11-10T10:00:00Z' },
      { id: 1, recordedAt: '2026-11-01T10:00:00Z' }
    ];
    expect(getFirstAndLatest(list)).toEqual({ first: list[2], latest: list[0] });
    expect(getFirstAndLatest(list.slice(0, 1))).toBeNull();
    expect(getFirstAndLatest(undefined)).toBeNull();
  });
});

describe('RecordingHistory (SSR)', () => {
  it('renders nothing when the word has no recordings', () => {
    expect(renderToString(<RecordingHistory wordId="a" word="a" recordCount={0} />)).toBe('');
  });

  it('renders a collapsed toggle with the recording count', () => {
    const html = renderToString(<RecordingHistory wordId="a" word="a" recordCount={4} />);
    expect(html).toContain('Minhas gravações (<!-- -->4<!-- -->)');
    expect(html).toContain('aria-expanded="false"');
  });
});
