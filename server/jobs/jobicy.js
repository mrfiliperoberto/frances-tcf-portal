/**
 * Jobicy remote jobs API (free, no key): https://jobi.cy/apidocs
 * Rules we follow: credit Jobicy with a direct link and send "Apply" to the job's original URL.
 */
import { capText, formatSalary, htmlToText, safeHttpUrl, toIsoUtc, toStringList } from './common.js';
import { collect } from './himalayas.js';

export const JOBICY_API = 'https://jobicy.com/api/v2/remote-jobs';
/** Regions queried (50 jobs each). */
export const JOBICY_GEOS = Object.freeze(['canada', 'latam', 'brazil']);

/** Jobicy industry name → app track. Other industries are not relevant to the profile. */
const INDUSTRY_TRACK = [
  [/customer support|technical support|admin|virtual assistance/i, 'support'],
  [/software|web|app design|qa|testing|devops/i, 'dev'],
  [/marketing|seo|content|copywriting|social/i, 'marketing']
];

export function trackForIndustry(industries) {
  const names = toStringList(industries).join(' | ');
  for (const [pattern, track] of INDUSTRY_TRACK) {
    if (pattern.test(names)) return track;
  }
  return null;
}

export function normalizeJobicyJob(raw) {
  const url = safeHttpUrl(raw?.url);
  if (!raw || raw.id === undefined || !raw.jobTitle || !url) return null;
  const track = trackForIndustry(raw.jobIndustry);
  if (!track) return null;
  const locations = toStringList(String(raw.jobGeo || '').replace(/,\s+/g, ','));
  const anywhere = locations.some((l) => /anywhere/i.test(l));
  return {
    id: `jobicy:${raw.id}`,
    source: 'jobicy',
    sourceName: 'Jobicy',
    track,
    title: String(raw.jobTitle).trim(),
    company: String(raw.companyName || '').trim(),
    url,
    postedAt: toIsoUtc(raw.pubDate),
    jobType: toStringList(raw.jobType).join(', '),
    location: anywhere ? 'Worldwide' : locations.join(', '),
    locations: anywhere ? [] : locations,
    seniority: raw.jobLevel && raw.jobLevel !== 'Any' ? [String(raw.jobLevel)] : [],
    salary: formatSalary(raw.annualSalaryMin ?? raw.salaryMin, raw.annualSalaryMax ?? raw.salaryMax, raw.salaryCurrency, raw.salaryPeriod || 'annual'),
    tags: toStringList(raw.jobIndustry).slice(0, 5),
    description: capText(htmlToText(raw.jobDescription || raw.jobExcerpt || '')),
    remote: true
  };
}

export async function fetchJobicyJobs({ fetchImpl = fetch, timeoutMs = 10000, geos = JOBICY_GEOS } = {}) {
  const results = await Promise.allSettled(
    geos.map(async (geo) => {
      const res = await fetchImpl(`${JOBICY_API}?count=50&geo=${encodeURIComponent(geo)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!res.ok) throw new Error(`Jobicy ${geo}: HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data?.jobs) ? data.jobs : []).map(normalizeJobicyJob);
    })
  );
  return collect(results, geos.map((g) => `jobicy ${g}`));
}
