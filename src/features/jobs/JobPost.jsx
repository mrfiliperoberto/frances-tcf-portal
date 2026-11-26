import React, { useState } from 'react';
import { ExternalLink, Star, X, Send, MessagesSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { IMMIGRATION, LEVEL_LABELS, TRACKS } from '../../services/jobs/jobClassifier';
import { timeAgo } from '../../services/jobs/jobsService';

const PREVIEW_LENGTH = 320;

const STATUS_LABELS = {
  saved: '⭐ Salva',
  applied: '📨 Candidatei',
  interview: '🗣️ Entrevista',
  dismissed: 'Descartada'
};

function languageLine(languages) {
  const parts = ['Inglês'];
  if (languages?.french) parts.push('Francês');
  if (languages?.portuguese) parts.push('Português');
  return parts.join(' + ');
}

/**
 * Uma vaga no formato de post de canal do Telegram. Todo o texto vem já convertido em texto
 * puro pelo servidor; aqui ele é exibido como texto (nunca como HTML).
 */
export function JobPost({ job, isNew, onStatusChange, now = new Date() }) {
  const [expanded, setExpanded] = useState(false);
  const immigration = IMMIGRATION[job.immigration?.status] || IMMIGRATION.unknown;
  const description = job.description || '';
  const preview = description.length > PREVIEW_LENGTH && !expanded ? `${description.slice(0, PREVIEW_LENGTH).trimEnd()}…` : description;
  const posted = timeAgo(job.postedAt || job.firstSeenAt, now);
  const levelLabel = job.level === 'unspecified' ? 'Vaga' : LEVEL_LABELS[job.level];
  // Defesa extra: só links http(s) (o servidor já filtra)
  const href = /^https?:\/\//i.test(job.url || '') ? job.url : undefined;

  return (
    <article className="flex gap-3" aria-label={`Vaga: ${job.title}`}>
      <div className="shrink-0 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-lg shadow-sm" aria-hidden="true">
        🍁
      </div>

      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 space-y-3">
        {/* Cabeçalho do post */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
          <span className="text-red-700 dark:text-red-400 uppercase tracking-wider">
            🇨🇦 Nova vaga • {levelLabel}
          </span>
          <span className="flex items-center gap-2 text-slate-400 font-medium">
            {isNew && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">🆕 Nova</span>}
            {posted}
          </span>
        </div>

        <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

        {/* Linhas do post */}
        <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <p className="font-bold text-base text-slate-900 dark:text-white leading-snug">💼 {job.title}</p>
          {job.company && (
            <p>
              🏢 {job.company}
              {job.companyHq && <span className="text-xs text-slate-500 dark:text-slate-400"> • sede em {job.companyHq} 🇨🇦</span>}
            </p>
          )}
          <p>
            📍 {job.locationLabel || job.location || 'Local não informado'} • 🏠 {job.remote ? 'Remoto' : 'Presencial/Híbrido'}
          </p>
          {job.salary && <p>💰 {job.salary}</p>}
          <p>🗣️ {languageLine(job.languages)}</p>
          {job.languages?.otherRequired?.length > 0 && (
            <p className="text-amber-700 dark:text-amber-400 font-semibold">⚠️ Exige {job.languages.otherRequired.join(', ')}</p>
          )}
          <p className="font-semibold" title={job.immigration?.reason}>
            {immigration.emoji} {immigration.label}
          </p>
          {job.immigration?.reason && <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">{job.immigration.reason}</p>}
          {(job.relocation || job.sponsorship) && (
            <p className="flex flex-wrap gap-1.5 pt-1">
              {job.relocation && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 text-xs font-bold" title="O anúncio menciona ajuda com mudança/realocação">
                  🧳 Relocation
                </span>
              )}
              {job.sponsorship && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold" title="O anúncio menciona patrocínio de visto ou permissão de trabalho">
                  🛂 Patrocina visto
                </span>
              )}
            </p>
          )}
        </div>

        {description && (
          <>
            <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-100">📝 Descrição</p>
              <p className="whitespace-pre-line break-words leading-relaxed">{preview}</p>
              {description.length > PREVIEW_LENGTH && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1 cursor-pointer"
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expanded ? 'Recolher descrição' : 'Ver descrição completa'}
                </button>
              )}
            </div>
          </>
        )}

        {job.matched?.length > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            ✅ <strong>Combina com você ({job.score}%):</strong> {job.matched.join(', ')}
          </p>
        )}

        <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Candidatar-se
          </a>
          {job.status !== 'saved' && job.status !== 'applied' && job.status !== 'interview' && (
            <button
              type="button"
              onClick={() => onStatusChange(job.id, 'saved')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Star className="w-3.5 h-3.5" /> Salvar
            </button>
          )}
          {job.status !== 'applied' && job.status !== 'interview' && (
            <button
              type="button"
              onClick={() => onStatusChange(job.id, 'applied')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Send className="w-3.5 h-3.5" /> Candidatei
            </button>
          )}
          {job.status === 'applied' && (
            <button
              type="button"
              onClick={() => onStatusChange(job.id, 'interview')}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <MessagesSquare className="w-3.5 h-3.5" /> Entrevista
            </button>
          )}
          {job.status !== 'dismissed' && (
            <button
              type="button"
              onClick={() => onStatusChange(job.id, 'dismissed')}
              className="ml-auto px-2.5 py-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Esconder esta vaga"
            >
              <X className="w-3.5 h-3.5" /> Descartar
            </button>
          )}
          {STATUS_LABELS[job.status] && (
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{STATUS_LABELS[job.status]}</span>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          {TRACKS[job.track]?.label} • Fonte:{' '}
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700 dark:hover:text-red-400">
            {job.sourceName}
          </a>
        </p>
      </div>
    </article>
  );
}

export default JobPost;
