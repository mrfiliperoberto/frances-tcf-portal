import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JobPost } from '../src/features/jobs/JobPost.jsx';
import { JobProfilePanel } from '../src/features/jobs/JobProfilePanel.jsx';
import { buildFeed } from '../src/features/jobs/JobAlertsTab.jsx';
import { classifyJob } from '../src/services/jobs/jobClassifier.js';
import { shouldAutoRefresh, isNewToday, timeAgo } from '../src/services/jobs/jobsService.js';
import { DEFAULT_JOB_PROFILE } from '../src/services/jobsStore.js';

const NOW = new Date('2026-11-26T15:00:00');
const profile = { ...DEFAULT_JOB_PROFILE, tracks: ['support', 'dev'], keywords: ['customer success'] };

const job = (extra = {}) =>
  classifyJob(
    {
      id: 'himalayas:1',
      source: 'himalayas',
      sourceName: 'Himalayas',
      track: 'support',
      title: 'Customer Success Associate',
      company: 'Acme',
      url: 'https://himalayas.app/companies/acme/jobs/1',
      postedAt: new Date(NOW.getTime() - 2 * 3_600_000).toISOString(),
      firstSeenAt: NOW.toISOString(),
      location: 'Worldwide',
      locations: [],
      seniority: ['Entry-level'],
      salary: 'USD 40k–48k/ano',
      tags: [],
      description: 'Help customers via chat.\n• Zendesk\n• CRM',
      remote: true,
      status: 'new',
      ...extra
    },
    profile
  );

describe('jobsService helpers', () => {
  it('auto-refreshes once per local day', () => {
    expect(shouldAutoRefresh({ lastFetchAt: null }, NOW)).toBe(true);
    expect(shouldAutoRefresh({ lastFetchAt: new Date('2026-11-26T08:00:00').toISOString() }, NOW)).toBe(false);
    expect(shouldAutoRefresh({ lastFetchAt: new Date('2026-11-25T23:00:00').toISOString() }, NOW)).toBe(true);
  });

  it('flags postings first seen today and formats relative times', () => {
    expect(isNewToday({ firstSeenAt: new Date('2026-11-26T01:00:00').toISOString() }, NOW)).toBe(true);
    expect(isNewToday({ firstSeenAt: new Date('2026-11-25T22:00:00').toISOString() }, NOW)).toBe(false);
    expect(timeAgo(new Date(NOW.getTime() - 30_000).toISOString(), NOW)).toBe('agora');
    expect(timeAgo(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)).toBe('há 5 min');
    expect(timeAgo(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe('há 3 h');
    expect(timeAgo(new Date(NOW.getTime() - 2 * 86_400_000).toISOString(), NOW)).toBe('há 2 dias');
    expect(timeAgo('nope', NOW)).toBe('');
  });
});

describe('refreshJobs', () => {
  it('stores fetched postings and records the fetch time', async () => {
    const dbMod = await import('../src/services/db.js');
    await dbMod.initDatabase();
    const { refreshJobs } = await import('../src/services/jobs/jobsService.js');
    const store = await import('../src/services/jobsStore.js');
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ jobs: [{ id: 'jobicy:1', source: 'jobicy', title: 'A', postedAt: '2026-11-26T10:00:00.000Z' }], errors: [] }), {
        headers: { 'content-type': 'application/json' }
      })
    );
    const result = await refreshJobs({ fetchImpl, now: NOW });
    expect(fetchImpl).toHaveBeenCalledWith('/api/jobs', expect.any(Object));
    expect(result).toMatchObject({ added: 1, total: 1 });
    expect((await store.listJobPostings())[0].id).toBe('jobicy:1');
    expect((await store.getJobProfile()).lastFetchAt).toBe(NOW.toISOString());
    dbMod.db.close();
  });

  it('records a friendly error when /api/jobs is not available (HTML fallback page)', async () => {
    const dbMod = await import('../src/services/db.js');
    await dbMod.initDatabase();
    const { refreshJobs } = await import('../src/services/jobs/jobsService.js');
    const store = await import('../src/services/jobsStore.js');
    const fetchImpl = vi.fn(async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }));
    await expect(refreshJobs({ fetchImpl, now: NOW })).rejects.toThrow(/indisponível/);
    expect((await store.getJobProfile()).lastFetchError).toMatch(/indisponível/);
    dbMod.db.close();
  });
});

describe('buildFeed', () => {
  const jobs = [
    job({ id: 'a', title: 'Customer Success Associate (Portuguese)', postedAt: '2026-11-20T10:00:00.000Z' }),
    job({ id: 'b', title: 'Junior PHP Developer', track: 'dev', postedAt: '2026-11-26T10:00:00.000Z' }),
    job({ id: 'c', title: 'Senior Support Engineer' }),
    job({ id: 'd', title: 'Support Agent', locations: ['United States'], location: 'United States' }),
    job({ id: 'e', title: 'Support Intern', postedAt: '2026-11-19T10:00:00.000Z', firstSeenAt: new Date('2026-11-20T10:00:00').toISOString() })
  ];

  it('keeps visible jobs only and sorts by relevance or date', () => {
    const relevance = buildFeed(jobs, profile, {}, NOW).map((j) => j.id);
    expect(relevance).not.toContain('c'); // senior
    expect(relevance).not.toContain('d'); // not open to Brazil
    expect(relevance[0]).toBe('a'); // matches "customer success"
    const recent = buildFeed(jobs, profile, { sort: 'recent' }, NOW).map((j) => j.id);
    expect(recent[0]).toBe('b');
  });

  it('filters by track, level and "only new"', () => {
    expect(buildFeed(jobs, profile, { track: 'dev' }, NOW).map((j) => j.id)).toEqual(['b']);
    expect(buildFeed(jobs, profile, { level: 'internship' }, NOW).map((j) => j.id)).toEqual(['e']);
    expect(buildFeed(jobs, profile, { onlyNew: true }, NOW).map((j) => j.id)).not.toContain('e');
  });
});

describe('JobPost (SSR)', () => {
  it('renders the Telegram-style post with title, company, salary, eligibility, match and source link', () => {
    const html = renderToString(<JobPost job={job()} isNew onStatusChange={() => {}} now={NOW} />);
    expect(html).toContain('Customer Success Associate');
    expect(html).toContain('Acme');
    expect(html).toContain('USD 40k–48k/ano');
    expect(html).toContain('Remoto do Brasil');
    expect(html).toContain('🆕 Nova');
    expect(html).toContain('há 2 h');
    expect(html).toContain('Combina com você');
    expect(html).toContain('href="https://himalayas.app/companies/acme/jobs/1"');
    expect(html).toContain('Himalayas');
  });

  it('shows third-party text as text, never as HTML, and blocks non-http links', () => {
    const evil = job({
      title: '<img src=x onerror=alert(1)>',
      description: '<script>alert(2)</script>',
      url: 'javascript:alert(3)'
    });
    const html = renderToString(<JobPost job={evil} onStatusChange={() => {}} now={NOW} />);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('javascript:');
  });

  it('warns about languages outside the profile', () => {
    const html = renderToString(<JobPost job={job({ title: 'German Customer Support Agent' })} onStatusChange={() => {}} now={NOW} />);
    expect(html).toContain('Exige');
    expect(html).toContain('alemão');
  });
});

describe('JobProfilePanel (SSR)', () => {
  it('renders the résumé box with the privacy note, tracks, provinces and preferences', () => {
    const html = renderToString(<JobProfilePanel profile={profile} onSave={() => {}} />);
    expect(html).toContain('Cole o texto do seu currículo');
    expect(html).toContain('Fica salvo só neste aparelho');
    expect(html).toContain('Atendimento / Customer Success');
    expect(html).toContain('New Brunswick');
    expect(html).toContain('Mostrar também vagas 🔴');
  });
});

describe('relocation tags, companies view and Google Jobs link', () => {
  it('JobPost shows 🧳 Relocation, 🛂 sponsorship and the company HQ', () => {
    const relocating = job({
      source: 'company',
      company: 'MobSquad',
      companyHq: 'Calgary, AB',
      locations: ['Canada'],
      location: 'Calgary, AB',
      description: 'Visa sponsorship is available. Relocation assistance provided.'
    });
    const html = renderToString(<JobPost job={relocating} onStatusChange={() => {}} now={NOW} />);
    expect(html).toContain('🧳 Relocation');
    expect(html).toContain('🛂 Patrocina visto');
    expect(html).toContain('Oferece patrocínio de visto');
    expect(html).toContain('Calgary, AB');
  });

  it('buildFeed can show only relocation / sponsorship postings', () => {
    const jobs = [
      job({ id: 'r', description: 'Relocation assistance is available.' }),
      job({ id: 'n', description: 'Great team.' })
    ];
    expect(buildFeed(jobs, profile, { onlyRelocation: true }, NOW).map((j) => j.id)).toEqual(['r']);
  });

  it('CompaniesView lists companies by province (outside Québec first) with careers links', async () => {
    const { CompaniesView } = await import('../src/features/jobs/JobAlertsTab.jsx');
    const companies = [
      { name: 'Coveo', city: 'Québec', province: 'QC', ats: 'lever', token: 'coveo' },
      { name: 'Introhive', city: 'Fredericton', province: 'NB', ats: 'bamboohr', token: 'introhive' }
    ];
    const classified = [job({ source: 'company', company: 'Introhive', description: 'Relocation package offered.' })];
    const html = renderToString(<CompaniesView companies={companies} classified={classified} profile={profile} />);
    expect(html.indexOf('Introhive')).toBeLessThan(html.indexOf('Coveo'));
    expect(html).toContain('https://introhive.bamboohr.com/careers');
    expect(html).toContain('1 no feed');
    expect(html).toContain('🧳 1');
  });

  it('search links include Google Jobs', async () => {
    const { buildSearchLinks, googleJobsSearch } = await import('../src/services/jobs/searchLinks.js');
    const url = new URL(googleJobsSearch('customer support', 'Canada'));
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('ibp')).toBe('htl;jobs');
    const sites = buildSearchLinks({ tracks: ['support'] })[0].groups.flatMap((g) => g.links.map((l) => l.site));
    expect(sites).toContain('Google Jobs');
    expect(sites).toContain('Google Jobs (remoto)');
  });
});
