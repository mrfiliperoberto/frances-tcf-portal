/**
 * Career pages of Canadian companies (CANADIAN_COMPANIES), read through the public JSON job
 * boards their ATS provides for embedding career pages: Greenhouse, Lever, Ashby,
 * SmartRecruiters, Workable, BambooHR, Recruitee and Breezy.
 *
 * Only postings whose title fits a profile track (support / dev / marketing) and is not senior
 * are returned, so the payload stays small. Nothing personal is sent: the same generic filter
 * applies to everyone; ranking against the profile happens on the device.
 */
import { capText, decodeEntities, htmlToText, safeHttpUrl, toIsoUtc } from './common.js';
import { CANADIAN_COMPANIES } from './companyList.js';

export const MAX_JOBS_PER_COMPANY = 15;
const CONCURRENCY = 12;

/** Track from a job title (server-side pre-filter). */
const TITLE_TRACKS = [
  ['support', /\b(support|success|service|help ?desk|customer|client|care|chat|community manager|player experience|soutien|clientele|service a la clientele)\b/i],
  ['dev', /\b(developer|engineer|programmer|software|web|full[- ]?stack|back[- ]?end|front[- ]?end|php|laravel|qa|devops|developpeur|programmeur)\b/i],
  ['marketing', /\b(marketing|social media|content|seo|copywriter|community|brand|growth|communications|redacteur)\b/i]
];
const SENIOR_TITLE = /\b(senior|sr\.?|lead|principal|staff|head|director|vp|vice president|chief|architect|manager|gestionnaire|directeur|directrice)\b/i;

const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function trackForTitle(title) {
  const folded = fold(title);
  if (SENIOR_TITLE.test(folded)) return null;
  for (const [track, re] of TITLE_TRACKS) {
    if (re.test(folded)) return track;
  }
  return null;
}

const CANADA_RE = /canada|canadian|\b(on|bc|qc|ab|nb|ns|mb|sk|nl|pe)\b|toronto|montr[eé]al|vancouver|ottawa|calgary|edmonton|winnipeg|halifax|fredericton|moncton|waterloo|kitchener|qu[eé]bec|victoria|saskatoon|burnaby|mississauga|oakville|kanata|kingston|dartmouth|st\.? john'?s/i;
const BRAZIL_RE = /brazil|brasil|latam|latin america|south america|americas|anywhere|worldwide|global/i;
const US_RE = /\b(us|usa|united states)\b|california|new york|texas|florida|boston|chicago|seattle|austin|denver/i;
const REMOTE_RE = /remote|distributed|home[- ]based|work from home|t[eé]l[eé]travail|anywhere/i;

/**
 * Locations list in the shape the classifier expects: [] means worldwide. A bare "Remote" at a
 * Canadian company is treated as remote within Canada (the conservative reading).
 */
export function locationsFrom(text, remote) {
  const value = String(text || '');
  const list = [];
  if (BRAZIL_RE.test(value)) list.push(/brazil|brasil/i.test(value) ? 'Brazil' : 'LATAM');
  if (CANADA_RE.test(value) || (!list.length && (remote || !value))) list.push('Canada');
  if (US_RE.test(value)) list.push('United States');
  if (!list.length) list.push(value);
  return [...new Set(list)];
}

function makeJob(company, { id, title, url, location, postedAt, description, remote, salary, jobType }) {
  const track = trackForTitle(title);
  const safeUrl = safeHttpUrl(url);
  if (!track || !safeUrl || !title) return null;
  const isRemote = Boolean(remote) || REMOTE_RE.test(location || '');
  const where = location || `${company.city}, ${company.province}`;
  return {
    id: `company:${company.ats}:${company.token}:${id}`,
    source: 'company',
    sourceName: `${company.name} (página de carreiras)`,
    track,
    title: String(title).trim(),
    company: company.name,
    companyHq: `${company.city}, ${company.province}`,
    url: safeUrl,
    postedAt: toIsoUtc(postedAt),
    jobType: jobType || '',
    location: where,
    locations: locationsFrom(where, isRemote),
    seniority: [],
    salary: salary || '',
    tags: [],
    description: capText(description || ''),
    remote: isRemote
  };
}

const ADAPTERS = {
  greenhouse: {
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t)}/jobs?content=true`,
    jobs: (data) => (data?.jobs || []).map((j) => ({
      id: j.id,
      title: j.title,
      url: j.absolute_url,
      location: j.location?.name,
      postedAt: j.updated_at,
      // Greenhouse sends HTML-escaped HTML: decode once, then strip tags.
      description: htmlToText(decodeEntities(j.content || ''))
    }))
  },
  lever: {
    url: (t) => `https://api.lever.co/v0/postings/${encodeURIComponent(t)}?mode=json`,
    jobs: (data) => (Array.isArray(data) ? data : []).map((j) => ({
      id: j.id,
      title: j.text,
      url: j.hostedUrl,
      location: j.categories?.location,
      postedAt: j.createdAt,
      remote: j.workplaceType === 'remote',
      jobType: j.categories?.commitment,
      description: [j.descriptionPlain, ...(j.lists || []).map((l) => `${l.text}\n${htmlToText(l.content || '')}`), j.additionalPlain].filter(Boolean).join('\n\n')
    }))
  },
  ashby: {
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(t)}?includeCompensation=true`,
    jobs: (data) => (data?.jobs || []).filter((j) => j.isListed !== false).map((j) => ({
      id: j.id,
      title: j.title,
      url: j.jobUrl || j.applyUrl,
      location: [j.location, ...(j.secondaryLocations || []).map((s) => s.location)].filter(Boolean).join(' / '),
      postedAt: j.publishedAt,
      remote: j.isRemote || j.workplaceType === 'Remote',
      jobType: j.employmentType,
      salary: j.compensation?.compensationTierSummary || '',
      description: j.descriptionPlain || htmlToText(j.descriptionHtml || '')
    }))
  },
  smartrecruiters: {
    url: (t) => `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(t)}/postings?limit=100`,
    jobs: (data, company) => (data?.content || []).map((j) => ({
      id: j.id,
      title: j.name,
      url: `https://jobs.smartrecruiters.com/${encodeURIComponent(company.token)}/${encodeURIComponent(j.id)}`,
      location: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', '),
      postedAt: j.releasedDate,
      remote: j.location?.remote
    }))
  },
  workable: {
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(t)}`,
    jobs: (data) => (data?.jobs || []).map((j) => ({
      id: j.shortcode || j.id,
      title: j.title,
      url: j.url || j.shortlink,
      location: [j.city, j.state, j.country].filter(Boolean).join(', '),
      postedAt: j.published_on || j.created_at,
      remote: j.telecommuting,
      description: htmlToText(j.description || '')
    }))
  },
  bamboohr: {
    url: (t) => `https://${encodeURIComponent(t)}.bamboohr.com/careers/list`,
    jobs: (data, company) => (data?.result || []).map((j) => ({
      id: j.id,
      title: j.jobOpeningName,
      url: `https://${encodeURIComponent(company.token)}.bamboohr.com/careers/${encodeURIComponent(j.id)}`,
      location: [j.location?.city, j.location?.state].filter(Boolean).join(', '),
      remote: j.isRemote === true || j.locationType === '1',
      jobType: j.employmentStatusLabel
    }))
  },
  recruitee: {
    url: (t) => `https://${encodeURIComponent(t)}.recruitee.com/api/offers/`,
    jobs: (data) => (data?.offers || []).map((j) => ({
      id: j.id,
      title: j.title,
      url: j.careers_url,
      location: j.location,
      postedAt: j.published_at,
      remote: j.remote,
      description: htmlToText(j.description || '')
    }))
  },
  breezy: {
    url: (t) => `https://${encodeURIComponent(t)}.breezy.hr/json`,
    jobs: (data) => (Array.isArray(data) ? data : []).map((j) => ({
      id: j.id,
      title: j.name,
      url: j.url,
      location: j.location?.name,
      postedAt: j.published_date,
      remote: j.location?.is_remote,
      jobType: j.type?.name
    }))
  }
};

export async function fetchCompanyJobs(company, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const adapter = ADAPTERS[company.ats];
  if (!adapter) throw new Error(`${company.name}: ATS desconhecido (${company.ats})`);
  const res = await fetchImpl(adapter.url(company.token), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`${company.name}: HTTP ${res.status}`);
  const data = await res.json();
  return adapter
    .jobs(data, company)
    .map((raw) => makeJob(company, raw))
    .filter(Boolean)
    .slice(0, MAX_JOBS_PER_COMPANY);
}

/** All companies, a few at a time. Returns { jobs, errors }; one failing board does not stop the rest. */
export async function fetchAllCompanyJobs({ fetchImpl = fetch, companies = CANADIAN_COMPANIES } = {}) {
  const jobs = [];
  const errors = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, companies.length) }, async () => {
      while (cursor < companies.length) {
        const company = companies[cursor++];
        try {
          jobs.push(...(await fetchCompanyJobs(company, { fetchImpl })));
        } catch (err) {
          errors.push(err?.message || `${company.name}: erro`);
        }
      }
    })
  );
  return { jobs, errors };
}
