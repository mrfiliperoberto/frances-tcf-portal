/**
 * Ready-made job searches (links only — nothing is scraped). Each link opens the site's own
 * search with entry-level / recent filters where the site supports them in the URL.
 */

export const PROVINCE_NAMES = Object.freeze({
  NB: 'New Brunswick',
  ON: 'Ontario',
  MB: 'Manitoba',
  NS: 'Nova Scotia',
  PE: 'Prince Edward Island',
  AB: 'Alberta',
  BC: 'British Columbia',
  SK: 'Saskatchewan',
  NL: 'Newfoundland and Labrador',
  QC: 'Quebec'
});

/** Search terms per track: English (most postings) and French (bilingual/francophone roles). */
export const TRACK_QUERIES = Object.freeze({
  support: { en: 'customer support OR customer success', fr: 'service à la clientèle bilingue' },
  dev: { en: 'junior developer PHP OR Laravel', fr: 'développeur web junior' },
  marketing: { en: 'marketing assistant OR social media coordinator', fr: 'adjoint marketing bilingue' }
});

export const OFFICIAL_LINKS = Object.freeze([
  {
    label: 'Mobilidade Francófona: requisitos (IRCC)',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/francophone-mobility/eligibility.html'
  },
  {
    label: 'Como o empregador contrata via Mobilidade Francófona (IRCC)',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/hire-temporary-foreign/french-speaking-bilingual-workers-outside-quebec/hire.html'
  }
]);

const enc = encodeURIComponent;

export function linkedInSearch(keywords, location, { remote = false } = {}) {
  // f_E=1,2: internship + entry level; f_TPR=r86400: last 24 hours; f_WT=2: remote
  const params = `keywords=${enc(keywords)}&location=${enc(location)}&f_E=1%2C2&f_TPR=r86400${remote ? '&f_WT=2' : ''}`;
  return `https://www.linkedin.com/jobs/search/?${params}`;
}

export function indeedSearch(keywords, location) {
  // fromage=1: posted in the last day
  return `https://ca.indeed.com/jobs?q=${enc(keywords)}&l=${enc(location)}&fromage=1`;
}

export function jobBankSearch(keywords, location) {
  // sort=D: newest first
  return `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${enc(keywords)}&locationstring=${enc(location)}&sort=D`;
}

export function googleJobsSearch(keywords, location) {
  // ibp=htl;jobs opens Google's job-search panel
  return `https://www.google.com/search?q=${enc(`${keywords} jobs ${location}`)}&ibp=htl;jobs`;
}

export function glassdoorSearch(keywords) {
  return `https://www.glassdoor.ca/Job/jobs.htm?sc.keyword=${enc(keywords)}`;
}

/**
 * Groups of links for each selected track: Canada-wide, each chosen province (outside Québec
 * first, since those count for Mobilité francophone) and remote roles open to Brazil.
 */
export function buildSearchLinks(profile) {
  const tracks = profile?.tracks?.length ? profile.tracks : Object.keys(TRACK_QUERIES);
  const provinces = (profile?.provinces || []).filter((code) => PROVINCE_NAMES[code]);
  const ordered = [...provinces.filter((c) => c !== 'QC'), ...provinces.filter((c) => c === 'QC')];

  return tracks
    .filter((track) => TRACK_QUERIES[track])
    .map((track) => {
      const { en, fr } = TRACK_QUERIES[track];
      const groups = [
        {
          title: 'Canadá (todo o país)',
          links: [
            { site: 'LinkedIn', url: linkedInSearch(en, 'Canada') },
            { site: 'Indeed', url: indeedSearch(en, 'Canada') },
            { site: 'Job Bank', url: jobBankSearch(en, 'Canada') },
            { site: 'Google Jobs', url: googleJobsSearch(en, 'Canada') },
            { site: 'Glassdoor', url: glassdoorSearch(en) }
          ]
        },
        ...ordered.map((code) => ({
          title: `${PROVINCE_NAMES[code]}${code === 'QC' ? '' : ' • conta para Mobilidade Francófona'}`,
          links: [
            { site: 'LinkedIn', url: linkedInSearch(en, `${PROVINCE_NAMES[code]}, Canada`) },
            { site: 'Indeed (FR)', url: indeedSearch(fr, PROVINCE_NAMES[code]) },
            { site: 'Job Bank', url: jobBankSearch(fr, PROVINCE_NAMES[code]) }
          ]
        })),
        {
          title: 'Remoto aberto ao Brasil',
          links: [
            { site: 'LinkedIn (remoto)', url: linkedInSearch(en, 'Brazil', { remote: true }) },
            { site: 'Google Jobs (remoto)', url: googleJobsSearch(`${en} remote`, 'Brazil') }
          ]
        }
      ];
      return { track, groups };
    });
}
