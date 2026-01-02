
import React, { useState } from 'react';
import { Screen } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './screens/DashboardView';
import ImportView from './screens/ImportView';
import ResultsView from './screens/ResultsView';
import EngineView from './screens/EngineView';
import SettingsView from './screens/SettingsView';
import DesignSystemView from './screens/DesignSystemView';
import LoginView from './screens/LoginView';
import { EngineProvider } from './contexts/EngineContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<{ id: Screen; params?: any }>({ id: 'dashboard' });

  React.useEffect(() => {
      if (isAuthenticated) {
          if (user?.role === 'COLABORADOR' && (currentScreen.id === 'dashboard' || currentScreen.id === 'results' || currentScreen.id === 'settings')) {
              setCurrentScreen({ id: 'import' });
          }
      }
  }, [isAuthenticated, user]);

  const navigate = (screen: Screen, params?: any) => {
    if (user?.role === 'COLABORADOR') {
        const allowed: Screen[] = ['import', 'engine'];
        if (!allowed.includes(screen)) {
            alert("Acesso Negado: Permissão Insuficiente");
            return;
        }
    }
    setCurrentScreen({ id: screen, params });
  };

  const renderScreen = () => {
    switch (currentScreen.id) {
      case 'dashboard': return <DashboardView onNavigate={navigate} />;
      case 'import': return <ImportView onNavigate={navigate} />;
      case 'results': return <ResultsView initialSearch={currentScreen.params?.search} initialStatus={currentScreen.params?.status} />;
      case 'engine': return <EngineView autoStart={currentScreen.params?.autoStart} onNavigate={navigate} />;
      case 'settings': return <SettingsView />;
      case 'design-system': return <DesignSystemView />;
      default: return <DashboardView />;
    }
  };

  if (loading) return <div className="h-screen bg-[#050910] text-white flex items-center justify-center">Carregando...</div>;

  if (!isAuthenticated) {
      return <LoginView />;
  }

  return (
    <EngineProvider>
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark overflow-hidden transition-colors duration-200">
        <Sidebar currentScreen={currentScreen.id} onNavigate={navigate} userRole={user?.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            {renderScreen()}
            </main>
        </div>
        </div>
    </EngineProvider>
  );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
