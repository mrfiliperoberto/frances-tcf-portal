import { useState, useEffect, useCallback, useRef } from 'react';
import { speakWithSynthesis, cancelSynthesis, hasSpeechSynthesis } from '../services/ttsService';

/**
 * Custom hook encapsulando Web Speech API (TTS - Text To Speech & STT - Speech To Text)
 * Prioriza sotaque canadense (fr-CA) com fallback elegante para fr-FR.
 */
export function useFrenchAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);

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
      cancelSynthesis();
    };
  }, []);

  /**
   * Síntese de Voz (TTS) em Francês
   */
  const speakText = useCallback((text, rate = 0.94) => {
    if (!hasSpeechSynthesis()) {
      console.warn("SpeechSynthesis não suportado neste navegador.");
      return false;
    }
    // Seleção de voz fr-CA → fr-* → fr-FR e o atraso pós-cancel ficam no ttsService (compartilhado).
    return speakWithSynthesis(text, {
      rate,
      voices,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    if (hasSpeechSynthesis()) {
      cancelSynthesis();
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
