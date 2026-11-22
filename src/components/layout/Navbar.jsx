import React, { useState, useEffect, useRef } from 'react';
import { CalendarCheck, Bot, BookOpen, BookOpenText, BookA, Award, Flame, Volume2, Sun, Moon, Menu, Settings, AudioWaveform, Download } from 'lucide-react';
import SettingsModal from '../common/SettingsModal';
import { getGeminiApiKey } from '../../services/geminiService';

// Captura global precoce caso o navegador dispare beforeinstallprompt antes do mount do React
if (typeof window !== 'undefined' && !window.__pwaListenerAttached) {
  window.__pwaListenerAttached = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    console.log('[PWA] Evento beforeinstallprompt disparado pelo navegador!', e);
    window.__deferredPwaPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available', { detail: e }));
  });
}

export function Navbar({
  activeTab,
  setActiveTab,
  streak = 1,
  onTestAudio,
  theme = 'dark',
  onToggleTheme,
  onOpenMobileSidebar,
  onShowToast
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.__deferredPwaPrompt || null : null
  );
  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;

  const isKeyConfigured = Boolean(getGeminiApiKey());

  useEffect(() => {
    if (window.__deferredPwaPrompt) {
      console.log('[PWA] Evento beforeinstallprompt já estava armazenado:', window.__deferredPwaPrompt);
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      console.log('[PWA] Evento beforeinstallprompt capturado no useEffect do Navbar:', e);
      window.__deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePwaAvailable = (e) => {
      setDeferredPrompt(e.detail || window.__deferredPwaPrompt);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Aplicativo instalado com sucesso (evento appinstalled)!');
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      if (onShowToastRef.current) {
        onShowToastRef.current('Aplicativo "Do Zero ao Canadá" instalado com sucesso! 🍁', 'success');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', handlePwaAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handlePwaAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Resultado do prompt de instalação:', outcome);
    if (outcome === 'accepted') {
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
    }
  };

  const tabs = [
    { id: 'hoje', label: 'Hoje', icon: CalendarCheck },
    { id: 'ia', label: 'Conversa IA', icon: Bot },
    { id: 'shadowing', label: 'Shadowing', icon: AudioWaveform },
    { id: 'pronuncia', label: 'Pronúncia A-Z', icon: BookA },
    { id: 'leitura', label: 'Leitura Guiada', icon: BookOpenText },
    { id: 'aulas', label: 'Aulas', icon: BookOpen },
    { id: 'tcf', label: 'Simulador TCF', icon: Award },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-[#0D1322]/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {onOpenMobileSidebar && (
              <button
                onClick={onOpenMobileSidebar}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 md:hidden transition"
                aria-label="Abrir menu lateral"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-red-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-rose-600/25 font-bold text-lg select-none">
              🍁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-rose-500 via-slate-900 to-blue-600 dark:from-rose-400 dark:via-white dark:to-blue-400 bg-clip-text text-transparent">
                  Do Zero ao Canadá
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Rumo ao NCLC 7+
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Sistema Pessoal Acelerado • Francês A1 ao B2 & TCF Canada
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600 dark:text-rose-400' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Streak */}
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
                title="Instalar Aplicativo Do Zero ao Canadá (PWA)"
                aria-label="Instalar App"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs sm:text-sm font-bold shadow-sm"
              title="Dias seguidos estudando"
            >
              <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
              <span id="header-streak" className="font-mono">{streak}</span>
              <span className="hidden sm:inline font-medium text-xs">dias</span>
            </div>

            <button
              onClick={onTestAudio}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm"
              title="Testar Áudio em Francês (TTS)"
              aria-label="Testar Áudio em Francês"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm"
              title="Configurações da IA Gemini 2.5 Flash"
              aria-label="Configurações da IA Gemini"
            >
              <Settings className="w-4 h-4" />
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                  isKeyConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isKeyConfigured ? 'Gemini API Conectada' : 'Modo Simulado Ativo'}
              />
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-sm"
              title="Alternar Tema Claro/Escuro"
              aria-label="Alternar Tema Claro/Escuro"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onShowToast={onShowToast}
      />
    </>
  );
}

export default Navbar;
