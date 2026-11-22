import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Retorna o melhor MIME Type de áudio suportado pelo navegador atual.
 */
function getSupportedMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

/**
 * Converte um Blob de áudio em string Base64 limpa (sem prefixo data URI).
 * 
 * @param {Blob} blob 
 * @returns {Promise<string>} Base64 pura
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Custom Hook para gravação de áudio bruto via MediaRecorder API nativa.
 * Fornece gravação, cronômetro, geração de Blob, URL de preview e Base64.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0); // em segundos
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mimeType, setMimeType] = useState('audio/webm');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Limpa URLs de objeto para evitar vazamento de memória
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [audioUrl]);

  /**
   * Inicia gravação do microfone.
   */
  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    chunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = "Seu navegador não suporta captura de microfone via MediaRecorder API.";
      setError(msg);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const detectedMime = getSupportedMimeType();
      const options = detectedMime ? { mimeType: detectedMime } : {};
      const recorder = new MediaRecorder(stream, options);

      const actualMime = recorder.mimeType || detectedMime || 'audio/webm';
      setMimeType(actualMime);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: actualMime });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        // Desliga os canais do microfone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250); // fatias de 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      let errorMsg = "Não foi possível acessar o microfone.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Permissão do microfone foi negada. Conceda permissão no navegador para gravar áudio.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = "Nenhum microfone conectado foi encontrado no seu dispositivo.";
      }
      setError(errorMsg);
      setIsRecording(false);
      return false;
    }
  }, [audioUrl]);

  /**
   * Finaliza gravação e produz o Blob.
   */
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Erro ao parar MediaRecorder:", e);
      }
    }

    setIsRecording(false);
  }, []);

  /**
   * Limpa gravação atual e reseta estados.
   */
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
  }, [audioUrl]);

  /**
   * Converte o Blob gravado atual em Base64.
   */
  const getBase64 = useCallback(async () => {
    if (!audioBlob) return null;
    return await blobToBase64(audioBlob);
  }, [audioBlob]);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    mimeType,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    getBase64,
  };
}

export default useAudioRecorder;
