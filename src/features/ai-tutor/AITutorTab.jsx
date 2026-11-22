import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Sparkles, 
  Volume2, 
  Mic, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  X, 
  Shuffle, 
  Zap, 
  ShieldCheck,
  Square,
  Headphones,
  Trash2,
  Activity
} from 'lucide-react';
import { AI_STAGES, AI_TOPICS } from '../../data/aiTopics';
import { PROMPT_LIBRARY, CONNECTOR_PHRASES } from '../../data/promptLibrary';
import { sendCamilleChatMessage, sendAudioToCamille, getGeminiApiKey } from '../../services/geminiService';
import { useFrenchAudio } from '../../hooks/useFrenchAudio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export function AITutorTab({
  currentStage = 3,
  onSelectStage,
  onSessionComplete,
  onSaveErrorToDeck,
  onShowToast
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Bonjour ! Je suis Camille, ta professeure de français spécialisée dans le TCF Canada et la vie au Québec. 🍁\n\n💡 Como funciona: Escreva ou fale pelo microfone em francês (mesmo que erre ou misture uma palavra em português). Eu sempre vou corrigir você gentilmente e continuar a conversa!`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState(AI_TOPICS[0]);
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState(null);
  const [savedMsgIds, setSavedMsgIds] = useState([]);

  const hasApiKey = Boolean(getGeminiApiKey());

  const messagesEndRef = useRef(null);
  const { speakText, startListening, stopListening, isListening: isSttListening } = useFrenchAudio();

  // Gravador de voz real (MediaRecorder API) para conversa multimodal com a Camille
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    mimeType,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
    getBase64
  } = useAudioRecorder();

  const selectedStageObj = AI_STAGES.find(s => s.id === currentStage) || AI_STAGES[2];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (recorderError && onShowToast) {
      onShowToast(recorderError);
    }
  }, [recorderError]);

  // Envio de mensagem em texto
  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputValue('');
    setIsLoading(true);

    if (onSessionComplete) {
      onSessionComplete();
    }

    try {
      const response = await sendCamilleChatMessage({
        message: textToSend,
        history: messages.slice(-6).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        })),
        stage: currentStage,
        stagePrompt: selectedStageObj.prompt
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: response
        }
      ]);
    } catch (err) {
      console.error("[AITutorTab] Erro ao enviar mensagem para Camille:", err);
      if (onShowToast) {
        onShowToast(`❌ Erro Gemini: ${err.message || 'Falha ao gerar resposta'}`);
      }
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `⚠️ **Erro na API Gemini**: ${err.message || 'Falha na comunicação com o modelo.'}\n\nVerifique se sua chave está configurada no menu de Configurações (⚙️) no topo.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Envio de áudio real do microfone para a Camille (Multimodal Gemini)
  const handleSendAudioToCamille = async () => {
    if (!audioBlob || isLoading) return;

    setIsLoading(true);
    const tempAudioId = Date.now();

    // Mensagem temporária do usuário com placeholder
    setMessages(prev => [
      ...prev,
      {
        id: tempAudioId,
        sender: 'user',
        text: `🎙️ Enviando gravação de voz real... (Avaliando com Gemini)`
      }
    ]);

    if (onSessionComplete) {
      onSessionComplete();
    }

    try {
      const base64Audio = await getBase64();
      if (!base64Audio) throw new Error("Áudio gravado não pôde ser convertido para Base64.");

      const result = await sendAudioToCamille({
        base64Audio,
        mimeType,
        history: messages.slice(-6).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        })),
        stage: currentStage,
        stagePrompt: selectedStageObj.prompt
      });

      // Atualiza mensagem do usuário com a transcrição exata e fiel
      setMessages(prev => prev.map(m => {
        if (m.id === tempAudioId) {
          return {
            ...m,
            text: `🎙️ "${result.transcription || 'Áudio gravado'}"`
          };
        }
        return m;
      }));

      // Adiciona resposta da Camille com bloco fonético
      const fullReply = result.phoneticTip
        ? `${result.replyText}\n\n🗣️ Dica Fonética: ${result.phoneticTip}`
        : result.replyText;

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: fullReply
        }
      ]);

      clearRecording();
      if (onShowToast) {
        onShowToast("✨ Áudio processado e respondido pela Prof. Camille!");
      }
    } catch (err) {
      console.error("[AITutorTab] Erro detalhado ao enviar áudio para Camille:", err);
      if (onShowToast) {
        onShowToast(`❌ Erro Gemini: ${err.message || 'Falha ao processar áudio'}`);
      }
      setMessages(prev => prev.map(m => {
        if (m.id === tempAudioId) {
          return {
            ...m,
            text: `🎙️ [Falha no envio do áudio: ${err.message || 'Erro de conexão'}]`
          };
        }
        return m;
      }));
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `⚠️ **Erro ao analisar áudio com a API Gemini**:\n\n\`${err.message || 'Falha na requisição'}\`\n\nVerifique se a chave em **Configurações (⚙️)** no topo está correta ou se o modelo está acessível.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reconhecimento de voz tradicional (STT) para texto
  const handleToggleStt = () => {
    if (isSttListening) {
      stopListening();
    } else {
      const started = startListening(
        (transcript) => {
          setInputValue(prev => (prev ? prev + ' ' : '') + transcript);
          onShowToast("🎙️ Áudio captado com sucesso!");
        },
        (errorMsg) => {
          onShowToast(errorMsg);
        }
      );
      if (started) {
        onShowToast("🎙️ Ouvindo em francês... Pode falar!");
      }
    }
  };

  const handleRandomizeTopic = () => {
    const remaining = AI_TOPICS.filter(t => t.title !== activeTopic.title);
    const chosen = remaining[Math.floor(Math.random() * remaining.length)] || AI_TOPICS[0];
    setActiveTopic(chosen);
    onShowToast("Novo tema de conversa sorteado!");
  };

  const handleStartTopic = () => {
    setInputValue(activeTopic.starter);
    handleSendMessage(activeTopic.starter);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: `🇫🇷 Bonjour à nouveau ! De quoi aimerais-tu parler aujourd'hui ?\n\n🇧🇷 Conversa reiniciada! Escolha uma etapa acima ou sorteie um tema ao lado.`
      }
    ]);
    clearRecording();
    onShowToast("Conversa reiniciada!");
  };

  const handleCopyPrompt = (id, promptText) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(id);
    onShowToast("Prompt copiado para a área de transferência!");
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  const extractFrenchSpeech = (text) => {
    if (text.includes('🇧🇷')) {
      return text.split('🇧🇷')[0].replace('🇫🇷', '').trim();
    }
    return text.replace('🇫🇷', '').trim();
  };

  const handleSaveMessageToDeck = async (msg, msgIdx) => {
    if (savedMsgIds.includes(msg.id)) return;

    const frenchText = extractFrenchSpeech(msg.text);
    let explanationText = "";

    if (msg.text.includes('🇧🇷')) {
      explanationText = msg.text.split('🇧🇷')[1]?.trim() || "";
    } else {
      explanationText = msg.text;
    }

    const prevMsg = msgIdx > 0 ? messages[msgIdx - 1] : null;
    const originalText = prevMsg && prevMsg.sender === 'user'
      ? prevMsg.text
      : "Diálogo na sessão prática com a IA";

    setSavedMsgIds((prev) => [...prev, msg.id]);

    if (onSaveErrorToDeck) {
      await onSaveErrorToDeck({
        original: originalText,
        corrected: frenchText || msg.text,
        explanation: explanationText || "Correção & Dica de Vocabulário da Prof. Camille",
        source: `Prof. Camille (Etapa ${currentStage})`
      });
    }

    if (onShowToast) {
      onShowToast("⚡ Adicionado ao Caderno de Erros e Deck SM-2!");
    }
  };

  const recMin = String(Math.floor(recordingTime / 60)).padStart(2, '0');
  const recSec = String(recordingTime % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Header & Stage Explanation */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Fale Desde a Primeira Semana
              </span>
              {hasApiKey ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  🟢 Gemini API Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  🟡 Modo Offline (Sem Chave)
                </span>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Professora Particular IA 24h • Progressão em 5 Etapas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Converse por texto ou envie áudio real do microfone para análise fonética multimodal imediata.
            </p>
          </div>
          <button
            onClick={() => setIsPromptsModalOpen(true)}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition shrink-0"
          >
            <Copy className="w-4 h-4 text-rose-500" />
            <span>Prompts Prontos Copiáveis</span>
          </button>
        </div>

        {/* 5 Stages Grid Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
          {AI_STAGES.map((stg) => {
            const isSelected = stg.id === currentStage;
            return (
              <button
                key={stg.id}
                id={`stage-btn-${stg.id}`}
                onClick={() => onSelectStage(stg.id)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-2 border-rose-500 bg-rose-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-extrabold uppercase ${isSelected ? 'text-rose-500' : 'text-slate-400'}`}>
                    Etapa {stg.id}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">
                    {stg.tag}
                  </span>
                </div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{stg.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {stg.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Column (Topic generator & Connectors), Right Column (Live Chat) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sorteador de Tema + Conectores NCLC 7+ */}
        <div className="space-y-6">
          {/* Gerador de Temas */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Gerador de Tema</span>
              </span>
              <button
                onClick={handleRandomizeTopic}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Sortear</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-blue-400 uppercase">
                {activeTopic.stage}
              </span>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {activeTopic.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                "{activeTopic.starter}"
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleStartTopic}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                >
                  Iniciar este Tema com a IA
                </button>
                <button
                  onClick={() => speakText(activeTopic.starter)}
                  className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shrink-0"
                  title="Ouvir frase inicial"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Conectores NCLC 7+ */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Conectores NCLC 7+ (Clique p/ ouvir)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tente incluir pelo menos 1 destas expressões na sua próxima resposta:
            </p>
            <div className="space-y-2 text-xs">
              {CONNECTOR_PHRASES.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => speakText(item.fr)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-500/10 border border-slate-200/60 dark:border-slate-800 transition flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-rose-500 block group-hover:text-rose-400">
                      {item.fr}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.pt}
                    </span>
                  </div>
                  <Volume2 className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-rose-500" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window com Prof. Camille */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col h-[600px] overflow-hidden">
          {/* Topbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                👩‍🏫
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Prof. Camille (IA Montréal)
                  </h3>
                  {hasApiKey ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      🟢 Gemini API Conectada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      🟡 Modo Offline (Sem Chave)
                    </span>
                  )}
                </div>
                <p id="chat-stage-indicator" className="text-xs text-slate-500 dark:text-slate-400">
                  Etapa {selectedStageObj.id}: {selectedStageObj.title} • Corrige em PT-BR + Conversa em FR
                </p>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              className="text-xs text-slate-400 hover:text-rose-500 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>

          {/* Messages Container */}
          <div id="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              const frenchSpoken = extractFrenchSpeech(msg.text);
              const isSaved = savedMsgIds.includes(msg.id);
              const hasFeedback = !isUser && (msg.text.includes('🇧🇷') || msg.text.includes('💡') || msg.id !== 1);

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-rose-600/20 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                      CA
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm whitespace-pre-line shadow-sm leading-relaxed ${
                      isUser
                        ? 'rounded-tr-none bg-rose-600 text-white'
                        : 'rounded-tl-none bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div>{msg.text}</div>
                    {!isUser && (
                      <div className="flex flex-wrap items-center gap-3 pt-3 mt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {frenchSpoken && (
                          <button
                            type="button"
                            onClick={() => speakText(frenchSpoken)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:underline"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Ouvir pronúncia</span>
                          </button>
                        )}

                        {hasFeedback && (
                          <button
                            type="button"
                            onClick={() => handleSaveMessageToDeck(msg, idx)}
                            disabled={isSaved}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl transition ${
                              isSaved
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-sm'
                            }`}
                            title="Salvar no Caderno de Erros e Flashcards SM-2"
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvo no Deck ✓</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 fill-amber-500" />
                                <span>⚡ Salvar no Deck SM-2</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-11 py-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Prof. Camille está ouvindo seu áudio e analisando sua pronúncia...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preview de Áudio Gravado Pronto para Envio */}
          {audioUrl && !isRecording && (
            <div className="px-4 py-2.5 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-500 font-bold">
                <Headphones className="w-4 h-4" />
                <span>Áudio gravado:</span>
                <audio src={audioUrl} controls className="h-7 w-48 sm:w-60" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearRecording}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                  title="Descartar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendAudioToCamille}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Áudio</span>
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              {/* Botão de Gravação de Voz Real (MediaRecorder) */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 transition shrink-0"
                  title="Gravar Áudio Real de Voz para a Camille"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs animate-pulse transition shrink-0 flex items-center gap-1.5"
                  title="Parar Gravação"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{recMin}:{recSec}</span>
                </button>
              )}

              {/* Campo de Texto para Digitação */}
              <input
                type="text"
                id="chat-input"
                disabled={isRecording}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder={isRecording ? "Gravando sua voz em francês..." : "Escreva ou clique no microfone para falar em francês..."}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                id="send-chat-btn"
                disabled={isLoading || isRecording || !inputValue.trim()}
                className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-600/20"
              >
                <span>Enviar</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Biblioteca de Prompts Prontos */}
      <AnimatePresence>
        {isPromptsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPromptsModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Biblioteca de Prompts Prontos para IA
                  </h3>
                  <p className="text-xs text-slate-400">
                    Copie e cole caso queira treinar por voz em outros apps de IA no celular
                  </p>
                </div>
                <button
                  onClick={() => setIsPromptsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 text-xs sm:text-sm">
                {PROMPT_LIBRARY.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-500">{item.title}</span>
                      <button
                        onClick={() => handleCopyPrompt(item.id, item.prompt)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs flex items-center gap-1 transition"
                      >
                        {copiedPromptId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      "{item.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default AITutorTab;
