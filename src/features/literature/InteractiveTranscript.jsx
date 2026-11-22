import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpenText,
  Volume2,
  BookmarkPlus,
  Check,
  LayoutTemplate,
  PanelRight
} from 'lucide-react';
import { MOCK_TRANSCRIPT } from '../../data/mockTranscript';

function formatTime(secs) {
  const s = Math.max(0, Math.floor(Number(secs) || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export function InteractiveTranscript({
  transcript = MOCK_TRANSCRIPT,
  currentSeconds = 0,
  onSeek,
  layoutPosition,
  onToggleLayout,
  onSpeakFrench,
  onAddCard,
  onShowToast
}) {
  const activeLineRef = useRef(null);
  const [savedIds, setSavedIds] = useState({});
  const [showTranslation, setShowTranslation] = useState(false);

  // Identifica a frase ativa pela regra: currentSeconds >= line.start && currentSeconds <= line.end
  const activeLine = transcript.find(
    (line) => currentSeconds >= line.start && currentSeconds <= line.end
  );
  const activeLineId = activeLine ? activeLine.id : null;

  // Auto-Scroll Suave quando a frase ativa muda
  useEffect(() => {
    if (activeLineId && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineId]);

  const handleSaveToDeck = (e, line) => {
    e.stopPropagation();
    if (savedIds[line.id]) return;

    if (onAddCard) {
      onAddCard({
        category: 'YouTube Cinema • Legenda Sincronizada',
        front: line.text,
        back: line.translation || 'Frase capturada da legenda interativa',
        phonetic: '',
        example: `Trecho ${formatTime(line.start)} – ${formatTime(line.end)}`
      });
    }

    setSavedIds((prev) => ({ ...prev, [line.id]: true }));
    if (onShowToast) {
      onShowToast('⚡ Frase adicionada ao seu Deck SM-2!', 'success');
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/95 border border-zinc-800 text-zinc-100 shadow-2xl flex flex-col h-full">
      {/* Cabeçalho do Painel de Legendas Interativas */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BookOpenText className="w-4 h-4 text-red-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
            Legendas Sincronizadas
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {formatTime(currentSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTranslation((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 transition cursor-pointer"
            title="Mostrar ou ocultar tradução em português"
          >
            {showTranslation ? 'Ocultar PT' : 'Tradução PT'}
          </button>

          {onToggleLayout && (
            <button
              type="button"
              onClick={onToggleLayout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-[11px] font-bold text-red-300 transition cursor-pointer"
              title="Alternar layout do painel de legendas"
            >
              {layoutPosition === 'side' ? (
                <>
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Abaixo</span>
                </>
              ) : (
                <>
                  <PanelRight className="w-3.5 h-3.5" />
                  <span>Ao Lado</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Container Rolável de Frases */}
      <div className="overflow-y-auto max-h-[380px] lg:max-h-[430px] pr-1.5 space-y-2 scrollbar-thin">
        {transcript.map((line) => {
          const isActive = currentSeconds >= line.start && currentSeconds <= line.end;
          const isSaved = Boolean(savedIds[line.id]);

          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek && onSeek(line.start)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'bg-zinc-800 border-l-4 border-red-600 text-gray-100 font-bold shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`text-xs font-mono ${
                    isActive ? 'text-red-400 font-bold' : 'text-zinc-600'
                  }`}
                >
                  {formatTime(line.start)} – {formatTime(line.end)}
                </span>

                <div className="flex items-center gap-1">
                  {onSpeakFrench && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpeakFrench(line.text, 0.9);
                      }}
                      className="p-1 rounded-md hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition"
                      title="Ouvir pronúncia via TTS"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onAddCard && (
                    <button
                      type="button"
                      onClick={(e) => handleSaveToDeck(e, line)}
                      disabled={isSaved}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                        isSaved
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300'
                      }`}
                      title="Salvar frase no Deck SM-2"
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Salvo</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3" />
                          <span>SM-2</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-base sm:text-lg leading-relaxed">{line.text}</p>

              {showTranslation && line.translation && (
                <p
                  className={`text-xs mt-1.5 font-normal ${
                    isActive ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {line.translation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InteractiveTranscript;

