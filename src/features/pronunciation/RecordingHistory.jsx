import React, { useCallback, useEffect, useRef, useState } from 'react';
import { History, Play, Square, Trash2, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import {
  getRecordingsForWord,
  deleteVoiceRecording,
  recordingToBlob,
  formatRecordingDateTime
} from '../../services/voiceRecordings';

/** "2,1 s" */
export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return '';
  return `${value.toFixed(1).replace('.', ',')} s`;
}

/**
 * Recebe gravações ordenadas da mais recente para a mais antiga e devolve a primeira (mais antiga)
 * e a última (mais recente). Sem par para comparar (< 2 gravações), devolve null.
 */
export function getFirstAndLatest(recordings) {
  if (!Array.isArray(recordings) || recordings.length < 2) return null;
  return { first: recordings[recordings.length - 1], latest: recordings[0] };
}

function scoreClasses(score) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
}

function ScoreBadge({ evaluation }) {
  if (!evaluation || !Number.isFinite(evaluation.score)) return null;
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full border text-[10px] font-mono font-extrabold ${scoreClasses(evaluation.score)}`}
      title={evaluation.feedback || 'Nota do Gemini'}
    >
      {evaluation.score}/100
    </span>
  );
}

/**
 * Histórico de gravações de uma palavra: data/hora, duração, nota do Gemini, ouvir, apagar e
 * "1ª vs. última" (toca a gravação mais antiga e, em seguida, a mais recente).
 */
export function RecordingHistory({ wordId, word, recordCount, refreshToken, onDeleted, onShowToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingKey, setPlayingKey] = useState(null);
  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const queueRef = useRef([]);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      try {
        audioRef.current.pause();
      } catch (_) {}
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setIsLoading(true);
    getRecordingsForWord(wordId)
      .then((rows) => {
        if (!cancelled) setRecordings(rows);
      })
      .catch((err) => {
        console.error('Erro ao carregar histórico de gravações:', err);
        if (onShowToast) onShowToast('Não foi possível carregar suas gravações.', 'error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, wordId, refreshToken, onShowToast]);

  // Toca uma sequência de gravações, uma após a outra.
  const playSequence = useCallback(
    (items, key) => {
      stopPlayback();
      queueRef.current = [...items];
      setPlayingKey(key);

      const playNext = () => {
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        const next = queueRef.current.shift();
        if (!next) {
          audioRef.current = null;
          setPlayingKey(null);
          return;
        }
        const blob = recordingToBlob(next);
        if (!blob) {
          playNext();
          return;
        }
        urlRef.current = URL.createObjectURL(blob);
        const audio = new Audio(urlRef.current);
        audioRef.current = audio;
        audio.onended = () => setTimeout(playNext, 400);
        audio.onerror = () => {
          if (onShowToast) onShowToast('Não foi possível tocar esta gravação.', 'error');
          stopPlayback();
        };
        audio.play().catch(() => stopPlayback());
      };

      playNext();
    },
    [stopPlayback, onShowToast]
  );

  const handleDelete = async (recording) => {
    const label = formatRecordingDateTime(recording.recordedAt);
    if (typeof window !== 'undefined' && !window.confirm(`Apagar a gravação de "${word}" de ${label}? Não dá para desfazer.`)) {
      return;
    }
    stopPlayback();
    try {
      await deleteVoiceRecording(recording.id);
      setRecordings((prev) => prev.filter((r) => r.id !== recording.id));
      if (onDeleted) onDeleted(wordId);
      if (onShowToast) onShowToast('Gravação apagada.', 'success');
    } catch (err) {
      console.error('Erro ao apagar gravação:', err);
      if (onShowToast) onShowToast('Não foi possível apagar a gravação.', 'error');
    }
  };

  if (!recordCount) return null;

  const pair = getFirstAndLatest(recordings);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70">
      <button
        type="button"
        onClick={() => {
          if (isOpen) stopPlayback();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-rose-500" />
          Minhas gravações ({recordCount})
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {pair && (
            <button
              type="button"
              onClick={() =>
                playingKey === 'compare' ? stopPlayback() : playSequence([pair.first, pair.latest], 'compare')
              }
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition"
              title="Toca a sua primeira gravação e, em seguida, a mais recente"
            >
              {playingKey === 'compare' ? <Square className="w-3 h-3 fill-white" /> : <GitCompare className="w-3 h-3" />}
              <span>{playingKey === 'compare' ? 'Parar comparação' : 'Comparar 1ª vs. última'}</span>
            </button>
          )}

          {isLoading && recordings.length === 0 ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Carregando…</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {recordings.map((recording, index) => {
                const key = `rec-${recording.id}`;
                const isPlaying = playingKey === key;
                const isFirst = index === recordings.length - 1;
                return (
                  <li
                    key={recording.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => (isPlaying ? stopPlayback() : playSequence([recording], key))}
                      className={`shrink-0 p-1.5 rounded-lg transition ${
                        isPlaying
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-500/15 hover:text-rose-500'
                      }`}
                      aria-label={isPlaying ? 'Parar' : 'Ouvir gravação'}
                    >
                      {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {formatRecordingDateTime(recording.recordedAt)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatDuration(recording.durationSec)}
                        {isFirst && recordings.length > 1 ? ' · 1ª gravação' : ''}
                      </p>
                    </div>

                    <ScoreBadge evaluation={recording.evaluation} />

                    <button
                      type="button"
                      onClick={() => handleDelete(recording)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                      aria-label="Apagar gravação"
                      title="Apagar gravação"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default RecordingHistory;
