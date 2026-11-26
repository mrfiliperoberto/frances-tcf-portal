import { describe, it, expect, vi, beforeEach } from 'vitest';
import { htmlToText, toIsoUtc, toStringList, formatSalary, capText, MAX_DESCRIPTION_LENGTH } from '../server/jobs/common.js';
import { normalizeHimalayasJob, fetchHimalayasJobs, HIMALAYAS_QUERIES } from '../server/jobs/himalayas.js';
import { normalizeJobicyJob, fetchJobicyJobs, trackForIndustry, JOBICY_GEOS } from '../server/jobs/jobicy.js';
import { normalizeRemotiveJob, fetchRemotiveJobs, trackForCategory } from '../server/jobs/remotive.js';
import handler, { getJobsPayload, clearJobsCache, createJobsHandler, CACHE_TTL_MS, JOB_SOURCES } from '../api/jobs.js';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function fakeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

const himalayasRaw = (n, extra = {}) => ({
  title: `Customer Support Associate ${n}`,
  companyName: 'Acme',
  employmentType: 'Full Time',
  minSalary: 40000,
  maxSalary: 48000,
  currency: 'USD',
  salaryPeriod: 'annual',
  seniority: ['Entry-level'],
  locationRestrictions: [],
  categories: ['Customer-Support'],
  description: '<p>Help <b>customers</b></p><ul><li>Zendesk</li></ul>',
  pubDate: 1795705481,
  applicationLink: `https://himalayas.app/companies/acme/jobs/support-${n}`,
  guid: `https://himalayas.app/companies/acme/jobs/support-${n}`,
  ...extra
});

const jobicyRaw = (id, extra = {}) => ({
  id,
  url: `https://jobicy.com/jobs/${id}`,
  jobTitle: `Junior PHP Developer ${id}`,
  companyName: 'Maple Inc',
  jobIndustry: ['Software Engineering'],
  jobType: ['Full-Time'],
  jobGeo: 'Canada,  USA',
  jobLevel: 'Any',
  jobDescription: '<p>Laravel</p>',
  pubDate: '2026-11-26 07:45:17',
  ...extra
});

const remotiveRaw = (id, extra = {}) => ({
  id,
  url: `https://remotive.com/remote-jobs/x/${id}`,
  title: `Support ${id}`,
  company_name: 'Acme',
  category: 'Customer Service',
  publication_date: '2026-11-24T10:31:32',
  candidate_required_location: 'Americas, LATAM',
  description: '<p>Hi</p>',
  ...extra
});

beforeEach(() => clearJobsCache());

describe('common helpers', () => {
  it('htmlToText keeps paragraphs and bullets', () => {
    expect(htmlToText('<p>Hello <b>team</b></p><ul><li>Zendesk</li><li>CRM</li></ul>')).toBe('Hello team\n• Zendesk\n• CRM');
  });

  it('htmlToText drops scripts, handlers and all markup (no HTML reaches the client)', () => {
    const text = htmlToText('<script>alert(1)</script><style>p{}</style><img src=x onerror="alert(2)"><a href="javascript:alert(3)">Apply</a>');
    expect(text).toBe('Apply');
    expect(text).not.toMatch(/[<>]/);
  });

  it('htmlToText decodes entities after removing tags, so escaped markup stays inert text', () => {
    expect(htmlToText('Tom &amp; Jerry &#39;s &lt;b&gt;x&lt;/b&gt;&nbsp;ok')).toBe("Tom & Jerry 's <b>x</b> ok");
    expect(htmlToText(null)).toBe('');
  });

  it('toIsoUtc handles ISO without zone, "YYYY-MM-DD hh:mm:ss", epoch seconds and junk', () => {
    expect(toIsoUtc('2026-11-24T10:31:32')).toBe('2026-11-24T10:31:32.000Z');
    expect(toIsoUtc('2026-11-26 07:45:17')).toBe('2026-11-26T07:45:17.000Z');
    expect(toIsoUtc(1795705481)).toBe(new Date(1795705481000).toISOString());
    expect(toIsoUtc('nope')).toBeNull();
    expect(toIsoUtc('')).toBeNull();
  });

  it('toStringList accepts arrays and "[\'a\', \'b\']" strings', () => {
    expect(toStringList(['a', ' b '])).toEqual(['a', 'b']);
    expect(toStringList("['United States', 'Canada']")).toEqual(['United States', 'Canada']);
    expect(toStringList(undefined)).toEqual([]);
  });

  it('formatSalary builds compact ranges', () => {
    expect(formatSalary(40000, 48000, 'USD', 'annual')).toBe('USD 40k–48k/ano');
    expect(formatSalary(18, 22, 'CAD', 'hourly')).toBe('CAD 18–22/h');
    expect(formatSalary(null, null, 'USD')).toBe('');
    expect(capText('a'.repeat(MAX_DESCRIPTION_LENGTH + 5)).length).toBe(MAX_DESCRIPTION_LENGTH + 1);
  });
});

describe('Himalayas adapter', () => {
  it('normalizes a job (worldwide when there are no location restrictions)', () => {
    const job = normalizeHimalayasJob(himalayasRaw(1), 'support');
    expect(job).toMatchObject({
      id: 'himalayas:https://himalayas.app/companies/acme/jobs/support-1',
      source: 'himalayas',
      track: 'support',
      location: 'Worldwide',
      locations: [],
      seniority: ['Entry-level'],
      salary: 'USD 40k–48k/ano',
      description: 'Help customers\n• Zendesk'
    });
    expect(normalizeHimalayasJob(himalayasRaw(2, { locationRestrictions: ['Canada'] }), 'dev').location).toBe('Canada');
    expect(normalizeHimalayasJob({ title: 'x' }, 'dev')).toBeNull();
  });

  it('runs one entry-level search per query and removes duplicates', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [himalayasRaw(1), himalayasRaw(2)] }));
    const { jobs, errors } = await fetchHimalayasJobs({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(HIMALAYAS_QUERIES.length);
    const urls = fetchImpl.mock.calls.map((c) => c[0]);
    expect(urls.every((u) => u.includes('country=Brazil'))).toBe(true);
    expect(urls.filter((u) => u.includes('seniority=Entry-level')).length).toBe(HIMALAYAS_QUERIES.filter((q) => q.entryOnly).length);
    expect(jobs).toHaveLength(2);
    expect(errors).toEqual([]);
  });
});

describe('Jobicy adapter', () => {
  it('maps industries to tracks and skips unrelated ones', () => {
    expect(trackForIndustry(['Customer Support & Success'])).toBe('support');
    expect(trackForIndustry(['Software Engineering'])).toBe('dev');
    expect(trackForIndustry(['Marketing & Sales'])).toBe('marketing');
    expect(trackForIndustry(['Healthcare'])).toBeNull();
    expect(normalizeJobicyJob(jobicyRaw(1, { jobIndustry: ['Healthcare'] }))).toBeNull();
  });

  it('normalizes geo lists and "Anywhere"', () => {
    expect(normalizeJobicyJob(jobicyRaw(1)).locations).toEqual(['Canada', 'USA']);
    const anywhere = normalizeJobicyJob(jobicyRaw(2, { jobGeo: 'Anywhere' }));
    expect(anywhere.location).toBe('Worldwide');
    expect(anywhere.locations).toEqual([]);
    expect(normalizeJobicyJob(jobicyRaw(3, { jobLevel: 'Senior' })).seniority).toEqual(['Senior']);
  });

  it('queries each region once and keeps the regions that answered', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('brazil') ? jsonResponse({}, 500) : jsonResponse({ jobs: [jobicyRaw(url.length)] })));
    const { jobs, errors } = await fetchJobicyJobs({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(JOBICY_GEOS.length);
    expect(jobs.length).toBeGreaterThan(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/brazil/);
  });
});

describe('Remotive adapter', () => {
  it('derives the track from the category and makes a single request', async () => {
    expect(trackForCategory('Software Development')).toBe('dev');
    expect(trackForCategory('Sales')).toBeNull();
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [remotiveRaw(1), remotiveRaw(2, { category: 'Sales' })] }));
    const { jobs } = await fetchRemotiveJobs({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(jobs.map((j) => j.id)).toEqual(['remotive:1']);
    expect(normalizeRemotiveJob(remotiveRaw(3, { candidate_required_location: 'Worldwide' })).locations).toEqual([]);
  });
});

describe('/api/jobs', () => {
  const okSource = (id, n) => ({ id, name: id, url: `https://${id}`, fetch: vi.fn(async () => ({ jobs: [{ id: `${id}:${n}` }, { id: 'dup' }], errors: [] })) });

  it('merges sources, removes duplicates and caches for 12 hours', async () => {
    const a = okSource('a', 1);
    const b = okSource('b', 2);
    const t0 = Date.parse('2026-11-26T08:00:00Z');
    const first = await getJobsPayload({ sources: [a, b], now: t0 });
    expect(first.jobs.map((j) => j.id)).toEqual(['a:1', 'dup', 'b:2']);
    expect(first.sources.map((s) => s.id)).toEqual(['a', 'b']);
    const second = await getJobsPayload({ sources: [a, b], now: t0 + CACHE_TTL_MS - 1 });
    expect(second.cached).toBe(true);
    expect(a.fetch).toHaveBeenCalledTimes(1);
    await getJobsPayload({ sources: [a, b], now: t0 + CACHE_TTL_MS + 1 });
    expect(a.fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps working when a source throws, and does not cache an empty failure', async () => {
    const broken = { id: 'x', name: 'x', url: 'https://x', fetch: vi.fn(async () => { throw new Error('down'); }) };
    const empty = await getJobsPayload({ sources: [broken] });
    expect(empty.jobs).toEqual([]);
    expect(empty.errors[0]).toMatch(/x: down/);
    const ok = okSource('a', 1);
    const payload = await getJobsPayload({ sources: [broken, ok] });
    expect(payload.jobs.length).toBe(2);
  });

  it('handler answers JSON with CDN cache headers, per-source counts, and rejects non-GET', async () => {
    const sources = [
      { id: 'himalayas', name: 'Himalayas', url: 'https://himalayas.app', fetch: async () => ({ jobs: [normalizeHimalayasJob(himalayasRaw(1), 'support')], errors: [] }) },
      { id: 'google', name: 'Google Jobs (via SerpApi)', url: 'https://serpapi.com', fetch: async () => ({ jobs: [], errors: [], skipped: true }) }
    ];
    const handle = createJobsHandler({ sources });
    const res = fakeRes();
    await handle({ method: 'GET', url: '/api/jobs' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('s-maxage=43200');
    const body = JSON.parse(res.body);
    expect(body.jobs[0].source).toBe('himalayas');
    expect(body.sources).toEqual([
      { id: 'himalayas', name: 'Himalayas', url: 'https://himalayas.app', count: 1, skipped: false },
      { id: 'google', name: 'Google Jobs (via SerpApi)', url: 'https://serpapi.com', count: 0, skipped: true }
    ]);

    const post = fakeRes();
    await handler({ method: 'POST', url: '/api/jobs' }, post);
    expect(post.statusCode).toBe(405);
  });

  it('the default source list covers APIs, company career pages, Job Bank and Google Jobs', () => {
    expect(JOB_SOURCES.map((s) => s.id)).toEqual(['himalayas', 'jobicy', 'remotive', 'companies', 'jobbank', 'google']);
  });
});

describe('safe links', () => {
  it('safeHttpUrl accepts only http(s) URLs', async () => {
    const { safeHttpUrl } = await import('../server/jobs/common.js');
    expect(safeHttpUrl('https://jobicy.com/jobs/1')).toBe('https://jobicy.com/jobs/1');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
  });

  it('adapters drop postings whose link is not http(s)', () => {
    expect(normalizeJobicyJob(jobicyRaw(9, { url: 'javascript:alert(1)' }))).toBeNull();
    expect(normalizeRemotiveJob(remotiveRaw(9, { url: 'javascript:alert(1)' }))).toBeNull();
    expect(normalizeHimalayasJob(himalayasRaw(9, { applicationLink: 'javascript:alert(1)', guid: 'javascript:alert(1)' }), 'dev')).toBeNull();
  });
});
