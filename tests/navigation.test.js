import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NAVIGATION_GROUPS, MOBILE_PRIMARY_IDS } from '../src/components/layout/Sidebar.jsx';

const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf-8');

/** ids de abas que o App sabe renderizar (activeTab === 'x'). */
const renderedTabIds = new Set(
  Array.from(appSource.matchAll(/activeTab === '([a-z-]+)'/g)).map((m) => m[1])
);
// Aliases internos que reaproveitam outra tela (não precisam de entrada própria no menu)
const ALIASES = new Set(['prova-visto', 'tcf-info', 'temas']);

describe('Navegação', () => {
  const navIds = NAVIGATION_GROUPS.flatMap((g) => g.items.map((i) => i.id));

  it('todo item do menu abre uma tela existente', () => {
    for (const id of navIds) {
      expect(renderedTabIds.has(id), `menu "${id}" sem tela no App`).toBe(true);
    }
  });

  it('toda tela renderizada pelo App tem acesso pelo menu (nenhum módulo órfão)', () => {
    for (const id of renderedTabIds) {
      if (ALIASES.has(id)) continue;
      expect(navIds.includes(id), `tela "${id}" sem item de navegação`).toBe(true);
    }
    expect(navIds).toContain('shadowing');
    expect(navIds).toContain('aulas');
  });

  it('não há ids duplicados e a barra mobile usa ids válidos', () => {
    expect(new Set(navIds).size).toBe(navIds.length);
    for (const id of MOBILE_PRIMARY_IDS) expect(navIds).toContain(id);
    expect(MOBILE_PRIMARY_IDS.length).toBeLessThanOrEqual(4); // + botão "Mais" = 5 colunas
  });

  it('destinos de navegação usados nas telas existem', () => {
    const sources = [
      '../src/features/dashboard/DailyDashboard.jsx',
      '../src/features/today/TodayTab.jsx'
    ].map((p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf-8'));
    const targets = sources.flatMap((src) =>
      Array.from(src.matchAll(/(?:onNavigateTab\(|tabId: )'([a-z-]+)'/g)).map((m) => m[1])
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(renderedTabIds.has(t), `destino "${t}" inexistente`).toBe(true);
  });
});
