import React, { useState } from 'react';
import { Sparkles, Save, ShieldCheck } from 'lucide-react';
import { TRACKS, suggestFromResume } from '../../services/jobs/jobClassifier';

export const PROVINCES = [
  ['NB', 'New Brunswick'],
  ['ON', 'Ontário'],
  ['MB', 'Manitoba'],
  ['NS', 'Nova Scotia'],
  ['PE', 'Ilha do Príncipe Eduardo'],
  ['AB', 'Alberta'],
  ['BC', 'Colúmbia Britânica'],
  ['SK', 'Saskatchewan'],
  ['NL', 'Terra Nova e Labrador'],
  ['QC', 'Québec']
];

const WORK_STATUS = [
  ['no-authorization', 'Sem autorização de trabalho no Canadá'],
  ['work-permit', 'Tenho permissão de trabalho'],
  ['pr-citizen', 'Residente permanente / cidadão']
];

const chip = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
    active
      ? 'bg-red-700 border-red-700 text-white'
      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-700/50'
  }`;

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Perfil de busca: currículo colado (fica só no aparelho), trilhas, palavras-chave e preferências. */
export function JobProfilePanel({ profile, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [suggested, setSuggested] = useState(null);
  const [newKeyword, setNewKeyword] = useState('');
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const analyzeResume = () => {
    const result = suggestFromResume(draft.resumeText);
    setSuggested(result);
    set({
      tracks: result.tracks.length ? result.tracks : draft.tracks,
      keywords: [...new Set([...draft.keywords, ...result.keywords])]
    });
  };

  const addKeyword = (e) => {
    e.preventDefault();
    const value = newKeyword.trim().toLowerCase();
    if (value && !draft.keywords.includes(value)) set({ keywords: [...draft.keywords, value] });
    setNewKeyword('');
  };

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
      <div className="space-y-2">
        <label htmlFor="resume-text" className="text-sm font-bold text-slate-800 dark:text-slate-100">
          1. Cole o texto do seu currículo
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Fica salvo só neste aparelho. Nada do currículo é enviado para o servidor de vagas.
        </p>
        <textarea
          id="resume-text"
          value={draft.resumeText}
          onChange={(e) => set({ resumeText: e.target.value })}
          rows={6}
          placeholder="Cole aqui o texto de um ou dos dois currículos (atendimento e desenvolvimento)…"
          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-700"
        />
        <button
          type="button"
          onClick={analyzeResume}
          disabled={!draft.resumeText.trim()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" /> Analisar currículo
        </button>
        {suggested && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Encontrei {suggested.keywords.length} palavra(s)-chave e {suggested.tracks.length} trilha(s). Revise abaixo.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">2. Trilhas</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TRACKS).map(([id, track]) => (
            <button key={id} type="button" aria-pressed={draft.tracks.includes(id)} onClick={() => set({ tracks: toggle(draft.tracks, id) })} className={chip(draft.tracks.includes(id))}>
              {track.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Palavras-chave (clique para remover)</p>
        <div className="flex flex-wrap gap-2">
          {draft.keywords.length === 0 && <span className="text-xs text-slate-400">Nenhuma ainda: analise o currículo ou adicione.</span>}
          {draft.keywords.map((k) => (
            <button key={k} type="button" onClick={() => set({ keywords: draft.keywords.filter((x) => x !== k) })} className={chip(true)} title="Remover">
              {k} ✕
            </button>
          ))}
        </div>
        <form onSubmit={addKeyword} className="flex gap-2">
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="ex.: zendesk, react, bilingual"
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-700"
          />
          <button type="submit" className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer">
            Adicionar
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">4. Províncias de interesse</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Usadas nas buscas prontas e, na próxima fase, nas vagas presenciais. Fora do Québec contam para a Mobilidade Francófona.</p>
        <div className="flex flex-wrap gap-2">
          {PROVINCES.map(([code, name]) => (
            <button key={code} type="button" aria-pressed={draft.provinces.includes(code)} onClick={() => set({ provinces: toggle(draft.provinces, code) })} className={chip(draft.provinces.includes(code))}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">5. Situação e preferências</p>
        <select
          value={draft.workStatus}
          onChange={(e) => set({ workStatus: e.target.value })}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100"
          aria-label="Situação de autorização de trabalho"
        >
          {WORK_STATUS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={draft.acceptRemote} onChange={(e) => set({ acceptRemote: e.target.checked })} />
          Aceito trabalho remoto
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={draft.showNeedsAuthorization} onChange={(e) => set({ showNeedsAuthorization: e.target.checked })} />
          Mostrar também vagas 🔴 (exigem autorização ou são de outro país)
        </label>
      </div>

      <button
        type="button"
        onClick={() => onSave(draft)}
        className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center gap-2 cursor-pointer transition"
      >
        <Save className="w-4 h-4" /> Salvar perfil
      </button>
    </section>
  );
}

export default JobProfilePanel;
