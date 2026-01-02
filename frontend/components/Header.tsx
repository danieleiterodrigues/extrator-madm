import React from 'react';
import { useEngine } from '../contexts/EngineContext';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { isRunning, isCriticalError } = useEngine();
  const { user, logout } = useAuth();

  // Determine Status Config
  let statusText = "PROCESSAMENTO MOTOR PAUSADO";
  let statusColor = "text-yellow-600";
  let bgColor = "bg-yellow-500/10";
  let borderColor = "border-yellow-500/20";
  let dotColor = "bg-yellow-500";
  let animatePing = false;

  if (isCriticalError) {
      statusText = "MOTOR SEM CONEXÃO";
      statusColor = "text-red-600";
      bgColor = "bg-red-500/10";
      borderColor = "border-red-500/20";
      dotColor = "bg-red-500";
      animatePing = true; // Alert ping
  } else if (isRunning) {
      statusText = "PROCESSAMENTO MOTOR ATIVO";
      statusColor = "text-green-600";
      bgColor = "bg-success/10"; // Keep success green for text if defined in config, or use manual
      borderColor = "border-success/20";
      dotColor = "bg-success";
      animatePing = true;
  }

  return (
    <header className="h-16 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between px-6 shrink-0 z-20 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary border border-primary/20">
          <span className="material-symbols-outlined text-[24px]">analytics</span>
        </div>
        <div className="hidden sm:flex items-baseline gap-2">
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight uppercase">EXTRATOR</h2>
          <span className="text-lg font-bold text-slate-300 dark:text-slate-700">|</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">V1.0.0</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border transition-all duration-300 ${bgColor} ${borderColor}`}>
          <div className="relative flex h-2 w-2">
            {animatePing && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
          </div>
          <span className={`text-[9px] font-bold tracking-widest uppercase ${statusColor}`}>{statusText}</span>
        </div>
        
        <div className="h-8 w-px bg-border-light dark:bg-border-dark mx-1"></div>
        
        <div className="flex items-center gap-3 pl-2">
          <div className="flex items-center gap-3 group relative">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'Usuário'}</p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark font-bold uppercase">{user?.role || 'Visitante'}</p>
            </div>
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-sm font-bold border-2 border-surface-light dark:border-surface-dark text-white shadow-sm">
              {user?.name ? (() => {
                  const parts = user.name.trim().split(' ');
                  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  return parts[0][0].toUpperCase();
              })() : 'U'}
            </div>
          </div>
          
          <button 
            onClick={logout} 
            className="ml-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair do Sistema"
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};


export default Header;
