import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook encapsulando Web Speech API (TTS - Text To Speech & STT - Speech To Text)
 * Prioriza sotaque canadense (fr-CA) com fallback elegante para fr-FR.
 */
export function useFrenchAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const speakTimeoutRef = useRef(null);

  // Carrega e atualiza vozes disponíveis no navegador
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Síntese de Voz (TTS) em Francês
   */
  const speakText = useCallback((text, rate = 0.94) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn("SpeechSynthesis não suportado neste navegador.");
      return false;
    }

    if (!text || !text.trim()) return false;

    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }

    const synth = window.speechSynthesis;
    const wasBusy = synth.speaking || synth.pending;
    if (wasBusy) {
      synth.cancel();
    }
    if (synth.paused) {
      synth.resume();
    }

    const cleanText = text
      .replace(/<[^>]*>/g, '') // remove HTML se houver
      .replace(/\[.*?\]/g, '') // remove transcrições fonéticas
      .trim();

    const startUtterance = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance; // Previne coleta de lixo prematura no Chrome/Edge

      // Procura voz fr-CA e depois qualquer voz francesa (fr-FR, fr, etc.)
      const currentVoices = voices.length > 0 ? voices : synth.getVoices();
      const frCA = currentVoices.find(
        (v) => v.lang && (v.lang.toLowerCase().includes('fr-ca') || v.lang.toLowerCase().includes('fr_ca'))
      );
      const frOther = currentVoices.find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
      const selectedVoice = frCA || frOther;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang; // Deve coincidir com a voz selecionada no Windows SAPI
      } else {
        utterance.lang = 'fr-FR';
      }

      utterance.rate = rate;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      synth.speak(utterance);
    };

    // No Windows Chrome/Edge, chamar speak() no mesmo tick que cancel() pode cancelar a nova fala
    if (wasBusy) {
      speakTimeoutRef.current = setTimeout(startUtterance, 40);
    } else {
      startUtterance();
    }

    return true;
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const testVoiceAudio = useCallback(() => {
    speakText("Bonjour ! Bienvenue sur ton portail personnel pour réussir le TCF Canada.");
  }, [speakText]);

  /**
   * Reconhecimento de Fala (STT) em Francês
   */
  const startListening = useCallback((onResultCallback, onErrorCallback) => {
    if (typeof window === 'undefined') return false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onErrorCallback) onErrorCallback("Seu navegador não suporta reconhecimento de voz. Experimente o Chrome ou Edge.");
      return false;
    }

    // Se já estiver gravando, para
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // noop
      }
      recognitionRef.current = null;
      setIsListening(false);
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (onResultCallback) {
          onResultCallback(transcript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (onErrorCallback) {
          onErrorCallback("Não consegui captar o áudio. Tente falar novamente.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.error("Erro ao iniciar SpeechRecognition:", err);
      setIsListening(false);
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // noop
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const hasSynthesisSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasRecognitionSupport = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    speakText,
    speakFrench: speakText,
    stopSpeaking,
    testVoiceAudio,
    isSpeaking,
    startListening,
    stopListening,
    isListening,
    hasSynthesisSupport,
    hasRecognitionSupport
  };
}

export default useFrenchAudio;
