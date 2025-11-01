
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AiAssistant from './components/AiAssistant';
import Brain from './components/Brain';
import Organization from './components/Organization';
import { AppView } from './types';
import { useAppContext } from './context/AppContext';
import { analyzeDatasetForBrain } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.Dashboard);
  const { state, dispatch } = useAppContext();

  // This effect automatically keeps the AI Brain analysis up-to-date.
  useEffect(() => {
    // This function is defined and then called inside the effect.
    const runAnalysis = async () => {
      // Only run if there are leads to analyze.
      if (state.leads.length > 0) {
        dispatch({ type: 'UPDATE_BRAIN_ANALYSIS_START' });
        try {
          const analysisText = await analyzeDatasetForBrain(state.leads);
          dispatch({ type: 'UPDATE_BRAIN_ANALYSIS_SUCCESS', payload: analysisText });
        } catch (e) {
          console.error("Brain analysis failed:", e);
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          dispatch({ type: 'UPDATE_BRAIN_ANALYSIS_SUCCESS', payload: `## Analysis Failed\n\nThere was an error analyzing the dataset: ${errorMessage}` });
        }
      } else {
        // If leads are cleared, reset the analysis.
        dispatch({ type: 'UPDATE_BRAIN_ANALYSIS_SUCCESS', payload: null });
      }
    };

    // We use a debounce mechanism to avoid re-running the analysis on every small change,
    // for instance, if files are added in quick succession. It waits for 500ms of inactivity.
    const handler = setTimeout(() => {
      runAnalysis();
    }, 500);

    // Cleanup function to cancel the timeout if the component unmounts or dependencies change.
    return () => {
      clearTimeout(handler);
    };
  }, [state.leads, dispatch]);


  const renderView = () => {
    switch (currentView) {
      case AppView.Dashboard:
        return <Dashboard />;
      case AppView.Organization:
        return <Organization />;
      case AppView.AIAssistant:
        return <AiAssistant />;
      case AppView.Brain:
        return <Brain />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-gray-200">
      <Header currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;