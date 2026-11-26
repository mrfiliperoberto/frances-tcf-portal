import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Key, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, X, Sparkles, Trash2, Download } from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  requestGeminiModel,
  GEMINI_CANDIDATE_MODELS
} from '../../services/geminiService';
import { downloadDatabaseAsJson } from '../../services/dbBackup';
import { DB_NAME } from '../../services/db';

export function SettingsModal({ isOpen, onClose, onShowToast }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string } | null

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(apiKey.trim());
    setTestResult({
      success: true,
      message: apiKey.trim() ? 'Chave pessoal salva neste navegador.' : 'Chave removida. Modo simulado ativo.'
    });
    if (onShowToast) {
      onShowToast(apiKey.trim() ? 'Chave Gemini salva com sucesso!' : 'Chave redefinida.', 'success');
    }
  };

  const handleClear = () => {
    setGeminiApiKey('');
    setApiKey('');
    setTestResult({
      success: true,
      message: 'Chave customizada removida do navegador.'
    });
    if (onShowToast) {
      onShowToast('Chave personalizada removida.', 'info');
    }
  };

  const handleExportBackup = async () => {
    try {
      await downloadDatabaseAsJson(DB_NAME);
      if (onShowToast) onShowToast('Backup exportado em JSON.', 'success');
    } catch (err) {
      setTestResult({ success: false, message: `Falha ao exportar backup: ${err.message}` });
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim() || getGeminiApiKey();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Nenhuma chave configurada. Digite uma chave da API Gemini para testar.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      let successData = null;
      let lastErr = null;
      let usedModel = null;

      for (const model of GEMINI_CANDIDATE_MODELS) {
        let result;
        try {
          result = await requestGeminiModel(
            model,
            { contents: [{ parts: [{ text: 'Bonjour Camille, réponds par un seul mot: "Parfait!"' }] }] },
            keyToTest
          );
        } catch (networkErr) {
          lastErr = new Error(`[${model}] Falha de rede`);
          continue;
        }
        if (result.ok) {
          successData = result.data;
          usedModel = model;
          break;
        }
        lastErr = new Error(`[${model}] ${result.errorMessage}`);
        if ([400, 401, 403].includes(result.status)) {
          throw lastErr;
        }
      }

      if (!successData) {
        throw lastErr || new Error("Nenhum modelo respondeu com sucesso.");
      }

      const reply = successData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Resposta recebida!';

      setTestResult({
        success: true,
        message: `Conexão bem-sucedida com ${usedModel}! Resposta: "${reply}"`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `Falha no teste: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = Boolean(apiKey.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-indigo-500/10 text-rose-500 border border-rose-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Configurações da IA
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie sua chave para avaliação fonética e tutoria multimodal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="my-4">
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            isConfigured 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block mb-0.5">
                {isConfigured ? 'IA Multimodal Pronta e Conectada' : 'Modo Simulado / Fallback Ativo'}
              </span>
              {isConfigured ? (
                <>Sua chave pessoal do Gemini está configurada neste navegador. As gravações de áudio serão analisadas com fonética real pelo Google AI.</>
              ) : (
                <>Nenhuma chave foi inserida. O portal funciona normalmente no modo simulado com feedbacks fonéticos estruturados e tutoria da Prof. Camille.</>
              )}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Google Gemini API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua chave AIzaSy..."
                className="w-full pl-9 pr-20 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
              />
              <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  title={showKey ? 'Ocultar' : 'Exibir'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 text-rose-500 hover:text-rose-600 rounded-lg"
                    title="Limpar chave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Chave pessoal salva só neste navegador (localStorage, não é cofre secreto). Use uma chave sua, com cota limitada.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-rose-500 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Obter chave grátis <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Test connection results */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Backup manual dos dados locais (IndexedDB) */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Backup dos seus dados de estudo (palavras, cartões, histórico, sessões). Um snapshot automático também é criado antes de cada atualização do banco.
            </p>
            <button
              type="button"
              onClick={handleExportBackup}
              className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-rose-500" />
              Exportar JSON
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-rose-500 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-600/20 transition"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default SettingsModal;
