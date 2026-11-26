import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Newspaper,
  BookOpen,
  MonitorPlay,
  BookMarked,
  Clapperboard,
  CheckCircle2,
  BookA,
  Layers,
  Timer,
  CheckSquare,
  Flame,
  Volume2,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  AudioWaveform,
  GraduationCap,
  MoreHorizontal
} from 'lucide-react';
import SettingsModal from '../common/SettingsModal';
import { getGeminiApiKey } from '../../services/geminiService';

export const NAVIGATION_GROUPS = [
  {
    category: 'INÍCIO',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home }
    ]
  },
  {
    category: 'ESTUDO & IMERSÃO',
    items: [
      { id: 'dicionario', label: 'Dicionário Diário', icon: BookMarked },
      { id: 'cartoon', label: 'Daily Cartoon', icon: Clapperboard },
      { id: 'leitura', label: 'Leitura Guiada', icon: BookOpen },
      { id: 'videoaula', label: 'Videoaula e Fechamento', icon: CheckCircle2 },
      { id: 'cinema', label: 'YouTube Cinema', icon: MonitorPlay },
      { id: 'aulas', label: 'Aulas Estruturadas', icon: GraduationCap }
    ]
  },
  {
    category: 'RETENÇÃO & MEMÓRIA',
    items: [
      { id: 'pronuncia', label: 'Biblioteca de Pronúncia', icon: BookA },
      { id: 'shadowing', label: 'Shadowing Studio', icon: AudioWaveform },
      { id: 'hoje', label: 'Deck SM-2', icon: Layers }
    ]
  },
  {
    category: 'A PROVA TCF',
    items: [
      { id: 'tcf', label: 'Simulador TCF', icon: Timer },
      { id: 'ia', label: 'Corretor com IA', icon: CheckSquare }
    ]
  },
  {
    category: 'BÔNUS',
    items: [
      { id: 'newsletter', label: 'Newsletter', icon: Newspaper }
    ]
  }
];

/** Ids exibidos na barra inferior do mobile (o restante fica no menu "Mais"). */
export const MOBILE_PRIMARY_IDS = ['dashboard', 'dicionario', 'hoje', 'tcf'];

export function Sidebar({
  isOpen,
  onOpen,
  onClose,
  activeTab,
  setActiveTab,
  streak = 1,
  completedLessonsCount = 1,
  totalLessons = 5,
  onTestAudio,
  theme = 'dark',
  onToggleTheme,
  onShowToast
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isKeyConfigured = Boolean(getGeminiApiKey());
  const allItems = NAVIGATION_GROUPS.flatMap((group) => group.items);
  // Barra inferior mobile: só os atalhos principais + "Mais" (abre o menu completo).
  const mobilePrimaryItems = MOBILE_PRIMARY_IDS.map((id) => allItems.find((i) => i.id === id)).filter(Boolean);
  const isActiveInPrimary = mobilePrimaryItems.some((i) => i.id === activeTab);

  const renderBrandHeader = (showCloseButton = false) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center text-white font-bold shadow-xs select-none">
          🍁
        </div>
        <div>
          <h2 className="font-display font-extrabold text-sm text-gray-900 dark:text-white leading-tight">
            Do Zero ao Canadá
          </h2>
          <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">
            Rumo ao NCLC 7+
          </span>
        </div>
      </div>

      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  const renderCategorizedNav = (isMobile = false) => (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {NAVIGATION_GROUPS.map((group) => (
        <div key={group.category}>
          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mt-6 mb-2 px-4">
            {group.category}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`${isMobile ? 'mob-' : ''}sidebar-${item.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile && onClose) {
                      onClose();
                    }
                  }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-semibold dark:bg-slate-800 dark:text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon
                    strokeWidth={isActive ? 2.25 : 1.85}
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="text-sm truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const renderFooter = () => (
    <div className="p-3 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
      {/* Progresso & Ofensiva */}
      <div className="p-3 rounded-xl bg-white border border-gray-200 dark:bg-slate-900 dark:border-slate-800 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-amber-600 font-bold">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{streak} dias</span>
          </div>
          <span className="text-red-700 dark:text-red-400 font-mono font-bold">
            {completedLessonsCount}/{totalLessons} Aulas
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-700 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100))}%` }}
          />
        </div>
      </div>

      {/* Ações Rápidas (Áudio, IA Gemini, Tema) */}
      <div className="flex items-center justify-between gap-1.5">
        {onTestAudio && (
          <button
            type="button"
            onClick={onTestAudio}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Testar Áudio em Francês (TTS)"
          >
            <Volume2 className="w-3.5 h-3.5 text-red-700" />
            <span>Áudio</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          title="Configurações da IA Gemini"
        >
          <Settings className="w-3.5 h-3.5 text-gray-600 dark:text-slate-400" />
          <span>IA</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isKeyConfigured ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </button>

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition-colors cursor-pointer"
            title="Alternar Tema Claro/Escuro da Área de Estudo"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-gray-700" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Full-Height Sidebar (100% da navegação, h-screen) */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 dark:bg-[#0D1322] dark:border-slate-800 select-none justify-between z-30">
        {renderBrandHeader(false)}
        {renderCategorizedNav(false)}
        {renderFooter()}
      </aside>

      {/* Botão Flutuante Mobile (substituindo a antiga Navbar no mobile) */}
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="md:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 shadow-md hover:bg-gray-100 dark:bg-[#0D1322] dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir navegação"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Drawer (Slide-over h-screen) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-4/5 max-w-xs h-[100dvh] bg-white border-r border-gray-200 dark:bg-[#0D1322] dark:border-slate-800 flex flex-col justify-between z-10 shadow-2xl"
            >
              {renderBrandHeader(true)}
              {renderCategorizedNav(true)}
              {renderFooter()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Bottom Mobile Navigation Bar: atalhos principais + "Mais" */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 grid grid-cols-5 py-1.5 px-1"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {mobilePrimaryItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`mob-nav-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-semibold dark:bg-slate-800 dark:text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
        {onOpen && (
          <button
            id="mob-nav-more"
            type="button"
            onClick={onOpen}
            className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
              !isActiveInPrimary
                ? 'bg-gray-100 text-gray-900 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70'
            }`}
            aria-label="Abrir todos os módulos"
          >
            <MoreHorizontal className={`w-4 h-4 mb-0.5 ${!isActiveInPrimary ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
            <span>Mais</span>
          </button>
        )}
      </nav>

      {/* Modal de Configurações da IA */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onShowToast={onShowToast}
      />
    </>
  );
}

export default Sidebar;
