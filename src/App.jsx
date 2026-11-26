import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import DailyDashboard from './features/dashboard/DailyDashboard';
import NewsletterTab from './features/newsletter/NewsletterTab';
import JobAlertsTab from './features/jobs/JobAlertsTab';
import TodayTab from './features/today/TodayTab';
import AITutorTab from './features/ai-tutor/AITutorTab';
import ShadowingStudio from './features/shadowing/ShadowingStudio';
import PronunciationLibraryTab from './features/pronunciation/PronunciationLibraryTab';
import DailyDictionaryTab from './features/dictionary/DailyDictionaryTab';
import DailyCartoonTab from './features/cartoon/DailyCartoonTab';
import GuidedReadingTab from './features/literature/GuidedReadingTab';
import YouTubeCinemaTab from './features/literature/YouTubeCinemaTab';
import VideoLessonTab from './features/lessons/VideoLessonTab';
import LessonsTab from './features/lessons/LessonsTab';
import TCFSimulatorTab from './features/tcf-simulator/TCFSimulatorTab';
import Toast from './components/common/Toast';
import DatabaseRecoveryBanner from './components/common/DatabaseRecoveryBanner';
import { storageService, DEFAULT_STATE } from './services/storageService';
import { 
  initDatabase, 
  getAllFlashcards, 
  reviewFlashcard, 
  addFlashcard, 
  addErrorToDeck, 
  getPendingReviewsCount,
  addTCFHistory,
  getTCFHistory,
  dbStatus,
  subscribeDbStatus,
  retryDatabaseOpen
} from './services/db';
import { useFrenchAudio } from './hooks/useFrenchAudio';

export function App() {
  const [state, setState] = useState(() => storageService.loadState());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [databaseStatus, setDatabaseStatus] = useState(() => ({ ...dbStatus }));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

  const { testVoiceAudio } = useFrenchAudio();

  useEffect(() => subscribeDbStatus(setDatabaseStatus), []);

  // Inicializa banco IndexedDB Dexie e sincroniza flashcards e pendências
  const setupIndexedDb = useCallback(async () => {
    try {
      await initDatabase();
      const allCards = await getAllFlashcards();
      const dueCount = await getPendingReviewsCount();
      const history = await getTCFHistory();

      setState(prev => ({
        ...prev,
        flashcards: allCards.length > 0 ? allCards : prev.flashcards,
        pendingReviews: dueCount,
        tcfHistory: history.length > 0 ? history : prev.tcfHistory
      }));
    } catch (err) {
      console.error("Falha ao sincronizar com IndexedDB:", err);
    }
  }, []);

  useEffect(() => {
    setupIndexedDb();
  }, [setupIndexedDb]);

  const handleRetryDatabase = useCallback(
    async ({ skipBackup = false } = {}) => {
      await retryDatabaseOpen({ skipBackup });
      await setupIndexedDb();
    },
    [setupIndexedDb]
  );

  // Salva metadados gerais no localStorage
  useEffect(() => {
    storageService.saveState(state);
  }, [state]);

  // Sincroniza classe 'dark' no <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('ui_theme', theme);
    } catch {
      // preferência visual: falha silenciosa é aceitável
    }
  }, [theme]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, 3200);
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTestAudio = () => {
    testVoiceAudio();
    showToast("🔊 Reproduzindo áudio em Francês Canadense...");
  };

  // Manipuladores de Rotina e Ofensiva
  const handleToggleDailyStep = (stepNumber, isChecked) => {
    setState(prev => ({
      ...prev,
      dailySteps: {
        ...prev.dailySteps,
        [stepNumber]: isChecked
      }
    }));
    if (isChecked) {
      showToast(`✅ Etapa ${stepNumber} da rotina concluída!`);
    }
  };

  const handleCompleteDayStreak = () => {
    const today = new Date().toDateString();
    if (state.lastCompletedDate !== today) {
      setState(prev => ({
        ...prev,
        studyStreak: (prev.studyStreak || 0) + 1,
        lastCompletedDate: today,
        dailySteps: { 1: true, 2: true, 3: true, 4: true }
      }));
      showToast(`🔥 Parabéns! Ofensiva subiu para ${(state.studyStreak || 0) + 1} dias seguidos!`);
    } else {
      showToast("Você já registrou sua meta diária hoje! Continue praticando.");
    }
  };

  // Motor SuperMemo SM-2 com Dexie IndexedDB
  const handleRateCard = async (cardIdOrIndex, quality) => {
    try {
      // Localiza o cartão pelo id ou índice
      const currentList = state.flashcards || [];
      const targetCard = currentList.find(c => c.id === cardIdOrIndex) || currentList[state.currentCardIndex % (currentList.length || 1)];

      if (targetCard && targetCard.id) {
        await reviewFlashcard(targetCard.id, quality);
      }

      const allCards = await getAllFlashcards();
      const newDueCount = await getPendingReviewsCount();
      const nextIndex = (state.currentCardIndex + 1) % (allCards.length || 1);

      setState(prev => {
        const newDailySteps = { ...prev.dailySteps };
        if (newDueCount === 0) {
          newDailySteps[1] = true;
        }

        return {
          ...prev,
          flashcards: allCards,
          currentCardIndex: nextIndex,
          pendingReviews: newDueCount,
          dailySteps: newDailySteps
        };
      });

      const qualityLabels = {
        1: "😓 Errei • Agendado para revisão próxima",
        3: "🤔 Difícil • Intervalo recalculado",
        4: "🙂 Bom • Memória reforçada no SM-2",
        5: "⚡ Fácil • Intervalo com bônus SM-2",
      };
      showToast(qualityLabels[quality] || "Avaliação SM-2 registrada!");
    } catch (err) {
      console.error("Erro ao avaliar cartão SM-2:", err);
      // Fallback em caso de erro
      setState(prev => ({
        ...prev,
        currentCardIndex: (prev.currentCardIndex + 1) % (prev.flashcards.length || 1),
        pendingReviews: Math.max(0, prev.pendingReviews - 1)
      }));
    }
  };

  const handleAddCard = async (newCard) => {
    try {
      const created = await addFlashcard(newCard);
      const allCards = await getAllFlashcards();
      const dueCount = await getPendingReviewsCount();

      setState(prev => ({
        ...prev,
        flashcards: allCards,
        pendingReviews: dueCount
      }));
      showToast("Novo cartão adicionado ao seu baralho SM-2!");
    } catch (err) {
      console.error("Erro ao adicionar cartão no Dexie:", err);
      setState(prev => ({
        ...prev,
        flashcards: [...prev.flashcards, newCard],
        pendingReviews: (prev.pendingReviews || 0) + 1
      }));
      showToast("Novo cartão adicionado!");
    }
  };

  // Caderno de Erros Automático (Error Log -> Flashcard SM-2)
  const handleSaveErrorToDeck = async ({ original, corrected, explanation, source }) => {
    try {
      await addErrorToDeck({ original, corrected, explanation, source });
      const allCards = await getAllFlashcards();
      const dueCount = await getPendingReviewsCount();

      setState(prev => ({
        ...prev,
        flashcards: allCards,
        pendingReviews: dueCount
      }));
      showToast("⚡ Adicionado às revisões do Deck SM-2!");
    } catch (err) {
      console.error("Erro ao salvar erro no Dexie:", err);
      showToast("Erro ao salvar no deck.");
    }
  };

  // Concluir Aula
  const handleCompleteLesson = (lessonId) => {
    setState(prev => {
      const alreadyDone = prev.completedLessons?.includes(lessonId);
      const nextCompleted = alreadyDone
        ? prev.completedLessons
        : [...(prev.completedLessons || []), lessonId];

      return {
        ...prev,
        completedLessons: nextCompleted,
        dailySteps: {
          ...prev.dailySteps,
          2: true
        }
      };
    });
  };

  // Sessão IA Concluída
  const handleAISessionComplete = () => {
    setState(prev => ({
      ...prev,
      aiSessions: (prev.aiSessions || 0) + 1,
      dailySteps: {
        ...prev.dailySteps,
        3: true
      }
    }));
  };

  // Selecionar Etapa IA
  const handleSelectAIStage = (stageNum) => {
    setState(prev => ({
      ...prev,
      currentAIStage: stageNum
    }));
  };

  // Histórico TCF
  const handleSaveTCFHistory = async (historyItem) => {
    try {
      await addTCFHistory(historyItem);
      const history = await getTCFHistory();
      setState(prev => ({
        ...prev,
        tcfHistory: history
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        tcfHistory: [historyItem, ...(prev.tcfHistory || [])]
      }));
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#080C14] dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Unificada (100% da Navegação • h-screen) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onOpen={() => setIsMobileSidebarOpen(true)}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        streak={state.studyStreak}
        completedLessonsCount={state.completedLessons?.length || 0}
        totalLessons={5}
        onTestAudio={handleTestAudio}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-14 md:pt-6 pb-24 md:pb-12 overflow-x-hidden">
        <DatabaseRecoveryBanner status={databaseStatus} onRetry={handleRetryDatabase} />

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <div key="dashboard" id="tab-dashboard">
              <DailyDashboard
                onNavigateTab={setActiveTab}
                onCompleteDayStreak={handleCompleteDayStreak}
                onShowToast={showToast}
                fallbackStreak={state.studyStreak}
              />
            </div>
          )}

          {activeTab === 'newsletter' && (
            <div key="newsletter" id="tab-newsletter">
              <NewsletterTab
                onAddCard={handleAddCard}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'vagas' && (
            <div key="vagas" id="tab-vagas">
              <JobAlertsTab onShowToast={showToast} />
            </div>
          )}

          {(activeTab === 'hoje' || activeTab === 'prova-visto') && (
            <div key={activeTab} id={`tab-${activeTab}`}>
              <TodayTab
                state={state}
                onToggleDailyStep={handleToggleDailyStep}
                onCompleteDayStreak={handleCompleteDayStreak}
                onRateCard={handleRateCard}
                onAddCard={handleAddCard}
                onNavigateTab={setActiveTab}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'ia' && (
            <div key="ia" id="tab-ia">
              <AITutorTab
                currentStage={state.currentAIStage}
                onSelectStage={handleSelectAIStage}
                onSessionComplete={handleAISessionComplete}
                onSaveErrorToDeck={handleSaveErrorToDeck}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'shadowing' && (
            <div key="shadowing" id="tab-shadowing">
              <ShadowingStudio
                onSaveErrorToDeck={handleSaveErrorToDeck}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'dicionario' && (
            <div key="dicionario" id="tab-dicionario">
              <DailyDictionaryTab
                onAddCard={handleAddCard}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'cartoon' && (
            <div key="cartoon" id="tab-cartoon">
              <DailyCartoonTab
                onShowToast={showToast}
                onCompleteDayStreak={handleCompleteDayStreak}
              />
            </div>
          )}

          {activeTab === 'pronuncia' && (
            <div key="pronuncia" id="tab-pronuncia">
              <PronunciationLibraryTab
                onAddCard={handleAddCard}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'leitura' && (
            <div key="leitura" id="tab-leitura">
              <GuidedReadingTab
                onAddCard={handleAddCard}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'videoaula' && (
            <div key="videoaula" id="tab-videoaula">
              <VideoLessonTab
                onCompleteDayStreak={handleCompleteDayStreak}
                onShowToast={showToast}
              />
            </div>
          )}

          {activeTab === 'cinema' && (
            <div key="cinema" id="tab-cinema">
              <YouTubeCinemaTab
                onAddCard={handleAddCard}
                onShowToast={showToast}
                onCompleteDayStreak={handleCompleteDayStreak}
              />
            </div>
          )}

          {activeTab === 'aulas' && (
            <div key="aulas" id="tab-aulas">
              <LessonsTab
                completedLessons={state.completedLessons}
                onCompleteLesson={handleCompleteLesson}
                onShowToast={showToast}
              />
            </div>
          )}

          {(activeTab === 'tcf' || activeTab === 'tcf-info' || activeTab === 'temas') && (
            <div key={activeTab} id={`tab-${activeTab}`}>
              <TCFSimulatorTab
                initialMode={activeTab === 'temas' ? 'ecrite' : activeTab === 'tcf-info' ? 'co' : 'orale'}
                history={state.tcfHistory}
                onSaveHistory={handleSaveTCFHistory}
                onSaveErrorToDeck={handleSaveErrorToDeck}
                onShowToast={showToast}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Toast Notification */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

export default App;
