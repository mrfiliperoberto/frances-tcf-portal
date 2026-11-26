import { describe, it, expect, vi } from 'vitest';
import { trackForTitle, locationsFrom, fetchCompanyJobs, fetchAllCompanyJobs, MAX_JOBS_PER_COMPANY } from '../server/jobs/companies.js';
import { CANADIAN_COMPANIES, careersPageUrl } from '../server/jobs/companyList.js';
import { parseJobBankFeed, normalizeJobBankEntry, fetchJobBankJobs, JOBBANK_QUERIES } from '../server/jobs/jobbank.js';
import { fetchGoogleJobs, normalizeGoogleJob, postedAtFromAgo } from '../server/jobs/googleJobs.js';
import { detectRelocation, detectImmigration, classifyJob } from '../src/services/jobs/jobClassifier.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const company = (ats, token = 'acme') => ({ name: 'Acme', city: 'Moncton', province: 'NB', ats, token });

describe('company list', () => {
  it('has at least 100 Canadian companies with valid ATS and unique boards', () => {
    expect(CANADIAN_COMPANIES.length).toBeGreaterThanOrEqual(100);
    const keys = CANADIAN_COMPANIES.map((c) => `${c.ats}:${c.token}`);
    expect(new Set(keys).size).toBe(keys.length);
    const provinces = new Set(['ON', 'BC', 'QC', 'AB', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE']);
    CANADIAN_COMPANIES.forEach((c) => {
      expect(provinces.has(c.province), c.name).toBe(true);
      expect(careersPageUrl(c), c.name).toMatch(/^https:\/\//);
    });
  });

  it('builds public careers page URLs per ATS', () => {
    expect(careersPageUrl(company('greenhouse'))).toBe('https://job-boards.greenhouse.io/acme');
    expect(careersPageUrl(company('lever'))).toBe('https://jobs.lever.co/acme');
    expect(careersPageUrl(company('bamboohr'))).toBe('https://acme.bamboohr.com/careers');
    expect(careersPageUrl({ ats: 'nope', token: 'x' })).toBeNull();
  });
});

describe('career pages adapter', () => {
  it('trackForTitle keeps support/dev/marketing titles and drops senior ones', () => {
    expect(trackForTitle('Customer Support Specialist')).toBe('support');
    expect(trackForTitle('Agent(e) de service à la clientèle')).toBe('support');
    expect(trackForTitle('Junior Software Developer')).toBe('dev');
    expect(trackForTitle('Social Media Coordinator')).toBe('marketing');
    expect(trackForTitle('Senior Software Engineer')).toBeNull();
    expect(trackForTitle('Customer Success Manager')).toBeNull();
    expect(trackForTitle('Accountant')).toBeNull();
  });

  it('locationsFrom reads Canada, Brazil/LATAM and US; bare "Remote" stays in Canada', () => {
    expect(locationsFrom('Toronto, ON', false)).toEqual(['Canada']);
    expect(locationsFrom('Brazil - Remote', true)).toEqual(['Brazil']);
    expect(locationsFrom('Remote - Americas', true)).toEqual(['LATAM']);
    expect(locationsFrom('Canada or US, Remote', true)).toEqual(['Canada', 'United States']);
    expect(locationsFrom('Remote', true)).toEqual(['Canada']);
  });

  it.each([
    ['greenhouse', { jobs: [{ id: 1, title: 'Customer Support Agent', absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/1', location: { name: 'Moncton, NB' }, updated_at: '2026-11-20T10:00:00Z', content: '&lt;p&gt;Relocation assistance is available.&lt;/p&gt;&lt;script&gt;x&lt;/script&gt;' }] }],
    ['lever', [{ id: 'a', text: 'Customer Support Agent', hostedUrl: 'https://jobs.lever.co/acme/a', categories: { location: 'Moncton, NB' }, createdAt: 1795705481000, descriptionPlain: 'Relocation assistance is available.', lists: [] }]],
    ['ashby', { jobs: [{ id: 'b', title: 'Customer Support Agent', jobUrl: 'https://jobs.ashbyhq.com/acme/b', location: 'Moncton, NB', publishedAt: '2026-11-20T10:00:00Z', descriptionPlain: 'Relocation assistance is available.' }] }],
    ['smartrecruiters', { content: [{ id: 'c', name: 'Customer Support Agent', location: { city: 'Moncton', region: 'NB', country: 'ca' }, releasedDate: '2026-11-20T10:00:00Z' }] }],
    ['workable', { jobs: [{ shortcode: 'D1', title: 'Customer Support Agent', url: 'https://apply.workable.com/acme/j/D1', city: 'Moncton', country: 'Canada' }] }],
    ['bamboohr', { result: [{ id: '7', jobOpeningName: 'Customer Support Agent', location: { city: 'Moncton', state: 'New Brunswick' } }] }],
    ['recruitee', { offers: [{ id: 9, title: 'Customer Support Agent', careers_url: 'https://acme.recruitee.com/o/agent', location: 'Moncton, NB' }] }],
    ['breezy', [{ id: 'e', name: 'Customer Support Agent', url: 'https://acme.breezy.hr/p/e', location: { name: 'Moncton, NB' } }]]
  ])('%s board → normalized Canadian posting', async (ats, payload) => {
    const fetchImpl = vi.fn(async () => json(payload));
    const [job] = await fetchCompanyJobs(company(ats), { fetchImpl });
    expect(job).toMatchObject({ source: 'company', company: 'Acme', companyHq: 'Moncton, NB', track: 'support', title: 'Customer Support Agent' });
    expect(job.url).toMatch(/^https:\/\//);
    expect(job.locations).toEqual(['Canada']);
    expect(job.id).toContain(`company:${ats}:acme:`);
    if (['greenhouse', 'lever', 'ashby'].includes(ats)) {
      expect(job.description).toBe('Relocation assistance is available.');
    }
  });

  it('caps postings per company and drops unsafe links', async () => {
    const jobs = Array.from({ length: 40 }, (_, i) => ({ id: i, title: 'Support Agent', absolute_url: i === 0 ? 'javascript:alert(1)' : `https://x.io/${i}` }));
    const result = await fetchCompanyJobs(company('greenhouse'), { fetchImpl: async () => json({ jobs }) });
    expect(result).toHaveLength(MAX_JOBS_PER_COMPANY);
    expect(result.every((j) => j.url.startsWith('https://'))).toBe(true);
  });

  it('fetchAllCompanyJobs keeps going when some boards fail', async () => {
    const companies = [company('greenhouse', 'ok'), company('lever', 'down'), company('greenhouse', 'ok2')];
    const fetchImpl = vi.fn(async (url) =>
      url.includes('down') ? json({}, 500) : json({ jobs: [{ id: url.length, title: 'Support Agent', absolute_url: `https://x.io/${url.length}` }] })
    );
    const { jobs, errors } = await fetchAllCompanyJobs({ fetchImpl, companies });
    expect(jobs).toHaveLength(2);
    expect(errors).toEqual(['Acme: HTTP 500']);
  });
});

const FEED = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title type="html"><![CDATA[customer service representative - call centre]]></title>
<link rel="alternate" type="text/html" href="https://www.jobbank.gc.ca/jobsearch/jobposting/111"/>
<updated>2026-11-26T05:00:00Z</updated>
<summary type="html"><![CDATA[<strong>Job number:</strong> 111<br /><strong>Location:</strong> Moncton (NB)  <br /><strong>Employer:</strong> Acme &amp; Co<br /><strong>Salary:</strong> $18.00 hourly]]></summary></entry>
<entry><title type="html"><![CDATA[agent de service à la clientèle bilingue]]></title>
<link rel="alternate" type="text/html" href="https://www.jobbank.gc.ca/jobsearch/jobposting/222"/>
<updated>2026-11-25T05:00:00Z</updated>
<summary type="html"><![CDATA[<strong>Job number:</strong> 222<br /><strong>Location:</strong> Laval (QC)  <br /><strong>Employer:</strong> Beta<br />]]></summary></entry>
<entry><title type="html"><![CDATA[retail sales manager]]></title>
<link rel="alternate" type="text/html" href="https://www.jobbank.gc.ca/jobsearch/jobposting/333"/>
<updated>2026-11-25T05:00:00Z</updated><summary type="html"><![CDATA[<strong>Location:</strong> Hamilton (ON)]]></summary></entry>
</feed>`;

describe('Job Bank adapter', () => {
  it('parses the Atom feed', () => {
    const [first] = parseJobBankFeed(FEED);
    expect(first).toMatchObject({ title: 'customer service representative - call centre', jobNumber: '111', location: 'Moncton (NB)', employer: 'Acme & Co', salary: '$18.00 hourly' });
  });

  it('keeps track-fitting titles, reads province and French titles, drops managers', () => {
    const jobs = parseJobBankFeed(FEED).map((e) => normalizeJobBankEntry(e, JOBBANK_QUERIES[0])).filter(Boolean);
    expect(jobs.map((j) => j.id)).toEqual(['jobbank:111', 'jobbank:222']);
    expect(jobs[0]).toMatchObject({ title: 'Customer Service Representative - Call Centre', location: 'Moncton, NB', province: 'NB', remote: false, frenchHint: false });
    expect(jobs[1].frenchHint).toBe(true);
  });

  it('runs the searches one after another (crawl delay) and dedupes', async () => {
    const fetchImpl = vi.fn(async () => new Response(FEED, { headers: { 'content-type': 'application/atom+xml' } }));
    const { jobs, errors } = await fetchJobBankJobs({ fetchImpl, delayMs: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(JOBBANK_QUERIES.length);
    expect(jobs).toHaveLength(2);
    expect(errors).toEqual([]);
  });

  it('classifies a bilingual on-site job outside Québec as 🟡 and inside Québec as 🔴', () => {
    const jobs = parseJobBankFeed(FEED).map((e) => normalizeJobBankEntry(e, JOBBANK_QUERIES[0])).filter(Boolean);
    const moncton = { ...jobs[0], frenchHint: true };
    expect(detectImmigration(moncton).status).toBe('francophone-mobility');
    expect(detectImmigration(jobs[1]).status).toBe('needs-authorization'); // Laval, QC
  });
});

describe('Google Jobs adapter (SerpApi)', () => {
  const raw = {
    title: 'Bilingual Customer Support Agent',
    company_name: 'Maple Co',
    location: 'Moncton, NB',
    via: 'via LinkedIn',
    description: 'Help clients in English and French.',
    job_id: 'abc',
    detected_extensions: { posted_at: '3 days ago', schedule_type: 'Full-time' },
    apply_options: [{ title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/1' }]
  };

  it('is skipped without SERPAPI_KEY (no request made)', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchGoogleJobs({ fetchImpl, apiKey: '' });
    expect(result).toEqual({ jobs: [], errors: [], skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('normalizes results and names the original site', () => {
    const job = normalizeGoogleJob(raw, { track: 'support', location: 'Canada' });
    expect(job).toMatchObject({ source: 'google', sourceName: 'Google Jobs (LinkedIn)', company: 'Maple Co', url: 'https://www.linkedin.com/jobs/view/1', locations: ['Canada'], remote: false });
    expect(normalizeGoogleJob({ ...raw, location: 'Anywhere' }, { track: 'support', location: 'Canada' }).locations).toEqual([]);
    expect(normalizeGoogleJob({ ...raw, apply_options: [{ link: 'javascript:x' }] }, { track: 'support', location: 'Canada' })).toBeNull();
  });

  it('sends the key to SerpApi but never puts it in error messages', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('latin') ? json({}, 401) : json({ jobs_results: [raw] })));
    const { jobs, errors } = await fetchGoogleJobs({ fetchImpl, apiKey: 'SECRET-KEY-123' });
    expect(fetchImpl.mock.calls[0][0]).toContain('engine=google_jobs');
    expect(fetchImpl.mock.calls[0][0]).toContain('api_key=SECRET-KEY-123');
    expect(jobs).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors.join(' ')).not.toContain('SECRET-KEY-123');
  });

  it('postedAtFromAgo converts relative dates', () => {
    const now = Date.parse('2026-11-26T12:00:00Z');
    expect(postedAtFromAgo('3 days ago', now)).toBe('2026-11-23T12:00:00.000Z');
    expect(postedAtFromAgo('5 hours ago', now)).toBe('2026-11-26T07:00:00.000Z');
    expect(postedAtFromAgo('yesterday', now)).toBeNull();
  });
});

describe('relocation and visa sponsorship', () => {
  const job = (description, extra = {}) => ({ title: 'Support Agent', description, locations: ['Canada'], location: 'Toronto, ON', remote: false, ...extra });

  it.each([
    ['We offer a relocation package to Toronto.', true, false],
    ['Relocation assistance is available for this role.', true, false],
    ['Aide à la relocalisation offerte.', true, false],
    ['No relocation assistance is provided.', false, false],
    ['Visa sponsorship is available.', false, true],
    ['We will sponsor work permits for the right candidate.', false, true],
    ['We are unable to sponsor visas.', false, false],
    ['Must be legally authorized to work in Canada. Relocation not provided.', false, false],
    ['For international candidates, sponsorship for an expedited work permit, expedited permanent residency.', false, true],
    ['Prepare monthly reports for plan sponsors and brokers.', false, false]
  ])('"%s" → relocation %s, sponsorship %s', (description, relocation, sponsorship) => {
    expect(detectRelocation(job(description))).toEqual({ relocation, sponsorship });
  });

  it('sponsorship turns a Canada-only role into 🟡 visa-sponsorship and boosts the score', () => {
    const profile = { tracks: ['support'], keywords: [] };
    const plain = classifyJob(job('Great team.'), profile);
    const sponsored = classifyJob(job('Visa sponsorship is available. Relocation assistance provided.'), profile);
    expect(plain.immigration.status).toBe('needs-authorization');
    expect(sponsored.immigration.status).toBe('visa-sponsorship');
    expect(sponsored.relocation).toBe(true);
    expect(sponsored.score).toBeGreaterThan(plain.score);
  });
});
