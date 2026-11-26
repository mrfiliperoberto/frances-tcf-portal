import { describe, it, expect } from 'vitest';
import { buildSearchLinks, linkedInSearch, indeedSearch, jobBankSearch, OFFICIAL_LINKS } from '../src/services/jobs/searchLinks.js';

describe('search links', () => {
  it('builds LinkedIn links with entry-level, last-24h and remote filters', () => {
    const url = new URL(linkedInSearch('customer support', 'Canada'));
    expect(url.hostname).toBe('www.linkedin.com');
    expect(url.searchParams.get('keywords')).toBe('customer support');
    expect(url.searchParams.get('f_E')).toBe('1,2');
    expect(url.searchParams.get('f_TPR')).toBe('r86400');
    expect(url.searchParams.get('f_WT')).toBeNull();
    expect(new URL(linkedInSearch('x', 'Brazil', { remote: true })).searchParams.get('f_WT')).toBe('2');
  });

  it('builds Indeed Canada and Job Bank links with encoded terms', () => {
    const indeed = new URL(indeedSearch('service à la clientèle bilingue', 'New Brunswick'));
    expect(indeed.hostname).toBe('ca.indeed.com');
    expect(indeed.searchParams.get('q')).toBe('service à la clientèle bilingue');
    expect(indeed.searchParams.get('fromage')).toBe('1');
    const jobBank = new URL(jobBankSearch('développeur web junior', 'Ontario'));
    expect(jobBank.hostname).toBe('www.jobbank.gc.ca');
    expect(jobBank.searchParams.get('locationstring')).toBe('Ontario');
  });

  it('groups links per track: Canada, chosen provinces (outside Québec first) and remote Brazil', () => {
    const groups = buildSearchLinks({ tracks: ['support', 'dev'], provinces: ['QC', 'NB'] });
    expect(groups.map((g) => g.track)).toEqual(['support', 'dev']);
    const titles = groups[0].groups.map((g) => g.title);
    expect(titles[0]).toBe('Canadá (todo o país)');
    expect(titles[1]).toMatch(/^New Brunswick • conta para Mobilidade Francófona/);
    expect(titles[2]).toBe('Quebec');
    expect(titles.at(-1)).toBe('Remoto aberto ao Brasil');
    groups.forEach((g) => g.groups.forEach((group) => group.links.forEach((l) => expect(l.url).toMatch(/^https:\/\//))));
  });

  it('falls back to every track when the profile has none, and has official IRCC links', () => {
    expect(buildSearchLinks({}).map((g) => g.track)).toEqual(['support', 'dev', 'marketing']);
    OFFICIAL_LINKS.forEach((l) => expect(l.url).toMatch(/^https:\/\/www\.canada\.ca\//));
  });
});
