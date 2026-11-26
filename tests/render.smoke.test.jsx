import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Smoke test: garante que os componentes alterados renderizam sem erros de referência.
describe('Renderização (SSR smoke test)', () => {
  it('App inicial (Dashboard + Sidebar) renderiza', async () => {
    const { App } = await import('../src/App.jsx');
    const html = renderToString(<App />);
    expect(html).toContain('Shadowing Studio');
    expect(html).toContain('Aulas Estruturadas');
    expect(html).toContain('mob-nav-more');
    expect(html).toContain('dark:bg-[#0D1322]');
  });

  it('ReviewsDueCard renderiza pendências e estado vazio', async () => {
    const { ReviewsDueCard } = await import('../src/features/dashboard/DailyDashboard.jsx');
    const html = renderToString(
      <ReviewsDueCard
        summary={{ words: [{ id: 1, word: 'bonjour', overdue: true, nextDate: '2026-11-01' }], cards: [{ id: 2, front: 'x' }], overdueWordsCount: 1 }}
      />
    );
    expect(html).toContain('bonjour');
    expect(html).toContain('atrasada');
    expect(renderToString(<ReviewsDueCard summary={{ words: [], cards: [] }} />)).toContain('em dia');
  });

  it('DailyDictionaryTab renderiza (usa o ttsService)', async () => {
    const { DailyDictionaryTab } = await import('../src/features/dictionary/DailyDictionaryTab.jsx');
    expect(() => renderToString(<DailyDictionaryTab />)).not.toThrow();
  });

  it('DatabaseRecoveryBanner e SettingsModal renderizam', async () => {
    const { DatabaseRecoveryBanner } = await import('../src/components/common/DatabaseRecoveryBanner.jsx');
    const html = renderToString(
      <DatabaseRecoveryBanner status={{ state: 'error', errorKind: 'open', error: 'OpenFailedError: x' }} onRetry={() => {}} />
    );
    expect(html).toContain('não foram apagados');

    const { SettingsModal } = await import('../src/components/common/SettingsModal.jsx');
    const modal = renderToString(<SettingsModal isOpen onClose={() => {}} />);
    expect(modal).toContain('Exportar JSON');
    expect(modal).not.toContain('forma segura');
  });
});
