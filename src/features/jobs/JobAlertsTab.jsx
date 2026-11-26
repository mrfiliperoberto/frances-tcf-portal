import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, RefreshCw, Rss, ListChecks, UserCog, ExternalLink, Search, Building2 } from 'lucide-react';
import { classifyJob, isVisibleInFeed, LEVEL_LABELS, TRACKS } from '../../services/jobs/jobClassifier';
import { isNewToday, loadJobAlertsState, refreshJobs, shouldAutoRefresh } from '../../services/jobs/jobsService';
import { saveJobProfile, setJobPostingStatus } from '../../services/jobsStore';
import { formatRecordingDateTime } from '../../services/voiceRecordings';
import { buildSearchLinks, OFFICIAL_LINKS } from '../../services/jobs/searchLinks';
import { CANADIAN_COMPANIES, careersPageUrl } from '../../../server/jobs/companyList';
import { JobPost } from './JobPost';
import { JobProfilePanel } from './JobProfilePanel';

const VIEWS = [
  ['feed', 'Feed', Rss],
  ['applications', 'Minhas candidaturas', ListChecks],
  ['searches', 'Buscas prontas', Search],
  ['companies', 'Empresas monitoradas', Building2],
  ['profile', 'Perfil', UserCog]
];

const LEVEL_FILTERS = ['all', 'internship', 'entry', 'unspecified'];
const PIPELINE = [
  ['saved', '⭐ Salvas'],
  ['applied', '📨 Candidatei'],
  ['interview', '🗣️ Entrevista']
];

const pill = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
    active ? 'bg-red-700 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  }`;

/** Filtra e ordena as vagas classificadas para o feed (função pura, testável). */
export function buildFeed(classified, profile, { track = 'all', level = 'all', onlyNew = false, onlyRelocation = false, sort = 'relevance' } = {}, now = new Date()) {
  const rows = classified
    .filter((job) => isVisibleInFeed(job, profile))
    .filter((job) => track === 'all' || job.track === track)
    .filter((job) => level === 'all' || job.level === level)
    .filter((job) => !onlyNew || isNewToday(job, now))
    .filter((job) => !onlyRelocation || job.relocation || job.sponsorship);
  const byDate = (a, b) => String(b.postedAt || b.firstSeenAt).localeCompare(String(a.postedAt || a.firstSeenAt));
  return rows.sort(sort === 'recent' ? byDate : (a, b) => b.score - a.score || byDate(a, b));
}

const PROVINCE_ORDER = ['NB', 'NS', 'NL', 'PE', 'ON', 'MB', 'SK', 'AB', 'BC', 'QC'];
const PROVINCE_LABEL = {
  NB: 'New Brunswick',
  NS: 'Nova Scotia',
  NL: 'Terra Nova e Labrador',
  PE: 'Ilha do Príncipe Eduardo',
  ON: 'Ontário',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  AB: 'Alberta',
  BC: 'Colúmbia Britânica',
  QC: 'Québec'
};

/** Empresas canadenses monitoradas, por província (fora do Québec primeiro), com vagas no feed. */
export function CompaniesView({ companies, classified, profile }) {
  const counts = new Map();
  classified.forEach((job) => {
    if (job.source !== 'company') return;
    const entry = counts.get(job.company) || { total: 0, visible: 0, relocation: 0 };
    entry.total += 1;
    if (isVisibleInFeed(job, profile)) entry.visible += 1;
    if (job.relocation || job.sponsorship) entry.relocation += 1;
    counts.set(job.company, entry);
  });
  const groups = PROVINCE_ORDER.map((code) => [code, companies.filter((c) => c.province === code)]).filter(([, list]) => list.length);
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {companies.length} empresas com sede no Canadá cujas páginas de carreira são lidas a cada atualização. "No feed" conta as vagas da sua trilha e nível; 🧳 marca vagas com relocation ou patrocínio de visto.
      </p>
      {groups.map(([code, list]) => (
        <section key={code} className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {PROVINCE_LABEL[code]} ({list.length}){code !== 'QC' ? ' • conta para Mobilidade Francófona' : ''}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {list.map((company) => {
              const c = counts.get(company.name) || { total: 0, visible: 0, relocation: 0 };
              return (
                <li key={`${company.ats}:${company.token}`} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{company.name}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {company.city} • {c.visible > 0 ? `${c.visible} no feed` : 'nada no feed agora'}
                      {c.relocation > 0 ? ` • 🧳 ${c.relocation}` : ''}
                    </span>
                  </span>
                  <a
                    href={careersPageUrl(company)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1"
                    title="Abrir página de carreiras"
                  >
                    <ExternalLink className="w-3 h-3" /> Carreiras
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function JobAlertsTab({ onShowToast }) {
  const [profile, setProfile] = useState(null);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('feed');
  const [filters, setFilters] = useState({ track: 'all', level: 'all', onlyNew: false, onlyRelocation: false, sort: 'relevance' });

  const reload = useCallback(async () => {
    const state = await loadJobAlertsState();
    setProfile(state.profile);
    setPostings(state.postings);
    return state;
  }, []);

  const runRefresh = useCallback(
    async ({ auto = false } = {}) => {
      setRefreshing(true);
      try {
        const result = await refreshJobs();
        await reload();
        if (onShowToast && (!auto || result.added > 0)) {
          onShowToast(result.added > 0 ? `🍁 ${result.added} vaga(s) nova(s) no feed!` : 'Feed atualizado: nenhuma vaga nova.', 'success');
        }
      } catch (err) {
        await reload();
        if (onShowToast && !auto) onShowToast(`Não foi possível buscar vagas: ${err.message}`, 'error');
      } finally {
        setRefreshing(false);
      }
    },
    [reload, onShowToast]
  );

  useEffect(() => {
    let cancelled = false;
    reload()
      .then((state) => {
        if (!cancelled && shouldAutoRefresh(state.profile)) runRefresh({ auto: true });
      })
      .catch((err) => console.error('Erro ao carregar Alerta de Vagas:', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classified = useMemo(() => (profile ? postings.map((p) => classifyJob(p, profile)) : []), [postings, profile]);
  const feed = useMemo(() => (profile ? buildFeed(classified, profile, filters) : []), [classified, profile, filters]);
  const newCount = useMemo(() => (profile ? classified.filter((j) => isVisibleInFeed(j, profile) && isNewToday(j)).length : 0), [classified, profile]);

  const handleStatusChange = async (id, status) => {
    try {
      await setJobPostingStatus(id, status);
      const changedAt = new Date().toISOString();
      setPostings((prev) => prev.map((p) => (p.id === id ? { ...p, status, statusChangedAt: changedAt } : p)));
    } catch (err) {
      if (onShowToast) onShowToast(`Não foi possível atualizar a vaga: ${err.message}`, 'error');
    }
  };

  const handleSaveProfile = async (draft) => {
    const saved = await saveJobProfile(draft);
    setProfile(saved);
    setView('feed');
    if (onShowToast) onShowToast('Perfil salvo: o feed foi reordenado para você.', 'success');
  };

  if (loading || !profile) {
    return <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Carregando Alerta de Vagas…</div>;
  }

  const needsProfile = !profile.resumeText && profile.keywords.length === 0;
  const lastFetch = profile.lastFetchAt ? formatRecordingDateTime(profile.lastFetchAt) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 font-sans">
      {/* Cabeçalho do "canal" */}
      <header className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-sm" aria-hidden="true">🍁</div>
            <div>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                Alerta de Vagas <BellRing className="w-5 h-5 text-red-600" />
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lastFetch ? `Atualizado em ${lastFetch}` : 'Ainda não atualizado'} • {feed.length} vaga(s) no feed{newCount > 0 ? ` • ${newCount} 🆕` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => runRefresh()}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Buscando…' : 'Atualizar'}
          </button>
        </div>

        {profile.lastFetchError && (
          <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Última busca falhou: {profile.lastFetchError}</p>
        )}

        <nav className="flex flex-wrap gap-2" aria-label="Seções do Alerta de Vagas">
          {VIEWS.map(([id, label, Icon]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`${pill(view === id)} flex items-center gap-1.5`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      {view === 'profile' && <JobProfilePanel profile={profile} onSave={handleSaveProfile} />}

      {view === 'feed' && (
        <>
          {needsProfile && (
            <button
              type="button"
              onClick={() => setView('profile')}
              className="w-full p-4 rounded-2xl border border-dashed border-red-700/40 bg-red-700/5 text-left text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              👋 <strong>Configure seu perfil</strong> colando o currículo: o feed passa a mostrar primeiro as vagas que combinam com você.
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={pill(filters.track === 'all')} onClick={() => setFilters((f) => ({ ...f, track: 'all' }))}>Todas as trilhas</button>
            {profile.tracks.map((t) => (
              <button key={t} type="button" className={pill(filters.track === t)} onClick={() => setFilters((f) => ({ ...f, track: t }))}>
                {TRACKS[t]?.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {LEVEL_FILTERS.map((l) => (
              <button key={l} type="button" className={pill(filters.level === l)} onClick={() => setFilters((f) => ({ ...f, level: l }))}>
                {l === 'all' ? 'Todos os níveis' : LEVEL_LABELS[l]}
              </button>
            ))}
            <button type="button" className={pill(filters.onlyNew)} onClick={() => setFilters((f) => ({ ...f, onlyNew: !f.onlyNew }))}>🆕 Só novas</button>
            <button type="button" className={pill(filters.onlyRelocation)} onClick={() => setFilters((f) => ({ ...f, onlyRelocation: !f.onlyRelocation }))}>🧳 Só relocation / visto</button>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="ml-auto px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
              aria-label="Ordenar"
            >
              <option value="relevance">Mais relevantes</option>
              <option value="recent">Mais recentes</option>
            </select>
          </div>

          {feed.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
              {refreshing ? 'Buscando vagas…' : 'Nenhuma vaga com esses filtros. Tente outra trilha ou nível, ou clique em Atualizar.'}
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((job) => (
                <JobPost key={job.id} job={job} isNew={isNewToday(job)} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Fontes: páginas de carreira de {CANADIAN_COMPANIES.length} empresas canadenses, Job Bank Canada, Google Jobs (com chave SerpApi), Himalayas, Jobicy e Remotive — sempre com link para o anúncio original.
          </p>
        </>
      )}

      {view === 'searches' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atalhos para as buscas dos próprios sites, já filtradas por trilha, nível de entrada e anúncios recentes. Ajuste as províncias no Perfil.
          </p>
          {buildSearchLinks(profile).map(({ track, groups }) => (
            <section key={track} className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{TRACKS[track]?.label}</h2>
              {groups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-700 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3 h-3" /> {link.site}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
          <section className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-2">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">🇨🇦 Mobilidade Francófona</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Oferta de emprego fora do Québec + francês oral NCLC 5 (TCF/TEF Canada); o empregador dispensa o LMIA. Confira sempre as regras atuais no site do IRCC.
            </p>
            <div className="flex flex-wrap gap-2">
              {OFFICIAL_LINKS.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-red-700 dark:text-red-400 underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {link.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'companies' && (
        <CompaniesView companies={CANADIAN_COMPANIES} classified={classified} profile={profile} />
      )}

      {view === 'applications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PIPELINE.map(([status, label]) => {
            const items = classified.filter((j) => j.status === status);
            return (
              <section key={status} className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  {label} ({items.length})
                </h2>
                {items.length === 0 && <p className="text-xs text-slate-400">Nada aqui ainda.</p>}
                {items.map((job) => (
                  <div key={job.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{job.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {job.company} • {job.statusChangedAt ? formatRecordingDateTime(job.statusChangedAt) : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={/^https?:\/\//i.test(job.url || '') ? job.url : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Abrir vaga
                      </a>
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value)}
                        className="ml-auto px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200"
                        aria-label={`Status de ${job.title}`}
                      >
                        <option value="saved">Salva</option>
                        <option value="applied">Candidatei</option>
                        <option value="interview">Entrevista</option>
                        <option value="dismissed">Descartar</option>
                      </select>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default JobAlertsTab;
