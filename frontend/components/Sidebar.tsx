
import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  userRole?: 'SUPERADMIN' | 'COLABORADOR';
}

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, userRole = 'SUPERADMIN' }) => {
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['SUPERADMIN'] },
    { id: 'import', label: 'Importação', icon: 'upload_file', roles: ['SUPERADMIN', 'COLABORADOR'] },
    { id: 'engine', label: 'Motor IA', icon: 'terminal', roles: ['SUPERADMIN', 'COLABORADOR'] },
    { id: 'results', label: 'Resultados', icon: 'assignment_turned_in', roles: ['SUPERADMIN'] },
  ] as const;

  const validItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-16 lg:w-64 border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex flex-col shrink-0 transition-all duration-300 z-30">
      <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3">
        {validItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group ${
              currentScreen === item.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-500 dark:text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-primary dark:hover:text-white'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${currentScreen === item.id ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border-light dark:border-border-dark space-y-4">

        
        {userRole === 'SUPERADMIN' && (
            <button 
            onClick={() => onNavigate('settings')}
            className={`flex items-center justify-center gap-3 px-3 py-2 w-full rounded-md lg:justify-start transition-colors ${
                currentScreen === 'settings' 
                ? 'bg-primary/10 text-primary' 
                : 'text-slate-500 dark:text-muted-dark hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
            >
            <span className={`material-symbols-outlined text-[22px] ${currentScreen === 'settings' ? 'filled text-primary' : ''}`}>settings</span>
            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Ajustes</span>
            </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
