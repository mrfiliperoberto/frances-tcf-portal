import { formatDateYYYYMMDD } from '../sm2Algorithm';
import { getJobProfile, listJobPostings, saveJobProfile, upsertJobPostings } from '../jobsStore';

export const JOBS_ENDPOINT = '/api/jobs';

/** True when the last successful fetch was not today (local date) — one automatic fetch a day. */
export function shouldAutoRefresh(profile, now = new Date()) {
  if (!profile?.lastFetchAt) return true;
  return formatDateYYYYMMDD(new Date(profile.lastFetchAt)) !== formatDateYYYYMMDD(now);
}

/** True when the posting was first seen today (local date): shown with 🆕. */
export function isNewToday(posting, now = new Date()) {
  return Boolean(posting?.firstSeenAt) && formatDateYYYYMMDD(new Date(posting.firstSeenAt)) === formatDateYYYYMMDD(now);
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias", or "" for invalid dates. */
export function timeAgo(iso, now = new Date()) {
  const time = new Date(iso).getTime();
  if (!iso || Number.isNaN(time)) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - time) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

/**
 * Fetches /api/jobs, merges the postings into IndexedDB and records the fetch time.
 * Returns { added, total, errors }. Throws when the endpoint fails.
 */
export async function refreshJobs({ fetchImpl = fetch, now = new Date() } = {}) {
  let payload;
  try {
    const res = await fetchImpl(JOBS_ENDPOINT, { headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('O servidor de vagas não respondeu (endpoint /api/jobs indisponível).');
    }
    payload = await res.json();
    if (!res.ok && !(payload?.jobs?.length > 0)) {
      throw new Error(payload?.message || `HTTP ${res.status}`);
    }
  } catch (err) {
    await saveJobProfile({ lastFetchError: err.message || 'Falha ao buscar vagas.' });
    throw err;
  }

  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  const { added } = await upsertJobPostings(jobs, { now });
  await saveJobProfile({ lastFetchAt: now.toISOString(), lastFetchError: null });
  return { added, total: jobs.length, errors: Array.isArray(payload.errors) ? payload.errors : [] };
}

/** Loads profile + stored postings in one call (used when the tab opens). */
export async function loadJobAlertsState() {
  const [profile, postings] = await Promise.all([getJobProfile(), listJobPostings()]);
  return { profile, postings };
}
