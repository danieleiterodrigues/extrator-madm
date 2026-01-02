import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { settingsService, SystemSettings } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { User } from '../types';

const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  
  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    ai_provider: 'gemini',
    gemini_key: '',
    openai_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'COLABORADOR' });
  const [userLoading, setUserLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [activeUserMenu, setActiveUserMenu] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
    if (user?.role === 'SUPERADMIN') {
        loadUsers();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    const data = await settingsService.getSettings();
    setSettings(data);
    setLoading(false);
  };

  const loadUsers = async () => {
      const data = await dataService.getUsers();
      setUsers(data);
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const success = await settingsService.updateSettings(settings);
      setLoading(false);
      if (success) {
        alert("Configurações salvas com sucesso!");
      } else {
        alert("Erro ao salvar: Verifique o console ou se o banco de dados está travado.");
      }
    } catch (e: any) {
        setLoading(false);
        const msg = e.response?.data?.detail || e.message;
        alert(`Erro ao salvar: ${msg}`);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setUserLoading(true);
      
      let success = false;
      if (editingUserId) {
          // Update
          const updated = await dataService.updateUser(editingUserId, newUser);
          success = !!updated;
          if (success) alert("Usuário atualizado com sucesso!");
          else alert("Erro ao atualizar usuário.");
      } else {
          // Create
          const created = await dataService.createUser(newUser as any);
          success = !!created;
          if (success) alert("Usuário criado com sucesso!");
          else alert("Erro ao criar usuário. Verifique se o nome de usuário já existe.");
      }

      setUserLoading(false);
      
      if (success) {
          setNewUser({ username: '', password: '', name: '', role: 'COLABORADOR' });
          setEditingUserId(null);
          loadUsers();
      }
  };

  const startEditing = (u: User) => {
      setNewUser({
          username: u.username,
          password: '', // Helper to indicate "leave empty to keep"
          name: u.name, 
          role: u.role 
      });
      setEditingUserId(u.id);
  };

  const cancelEditing = () => {
      setNewUser({ username: '', password: '', name: '', role: 'COLABORADOR' });
      setEditingUserId(null);
  };

  const handleDeleteUser = async (u: User) => {
      if (u.id === 1 || u.username === 'ADMIN') {
          alert("Não é possível excluir o usuário administrador principal.");
          return;
      }
      if (u.id === user?.id) {
          alert("Você não pode excluir seu próprio usuário.");
          return;
      }
      
      if (confirm(`Tem certeza que deseja excluir o usuário ${u.name}?`)) {
          setUserLoading(true);
          const success = await dataService.deleteUser(u.id);
          setUserLoading(false);
          
          if (success) {
              alert("Usuário excluído com sucesso.");
              loadUsers();
          } else {
              alert("Erro ao excluir usuário.");
          }
      }
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };
  
  const toggleKeyVisibility = (field: string) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="mx-auto max-w-[800px] flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Ajustes do Sistema</h1>
        <p className="text-muted-light dark:text-muted-dark text-sm font-medium">Configure as preferências globais do Extrator e conectividade com a IA.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark gap-6">
          <button 
            onClick={() => setActiveTab('general')}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Geral
          </button>
          
          {user?.role === 'SUPERADMIN' && (
            <button 
                onClick={() => setActiveTab('users')}
                className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                Usuários
            </button>
          )}
      </div>

      {activeTab === 'general' ? (
        <>
            <div className="grid gap-6">
                <Card header={<h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Aparência e Interface</h3>}>
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Modo Escuro (Dark Mode)</p>
                    <p className="text-xs text-muted-light dark:text-muted-dark font-medium">Alternar entre tema claro e escuro para melhor conforto visual.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                    <span className="material-symbols-outlined mr-2">contrast</span>
                    Alternar Tema
                    </Button>
                </div>
                </Card>

                <Card header={<h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Motor de Inteligência Artificial</h3>}>
                <div className="flex flex-col gap-6">
                    
                    {/* Provider Selection */}
                    <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Provedor de IA Principal</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${settings.ai_provider === 'gemini' ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="provider" 
                            value="gemini"
                            checked={settings.ai_provider === 'gemini'} 
                            onChange={() => setSettings({ ...settings, ai_provider: 'gemini' })}
                            className="accent-primary w-4 h-4"
                        />
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">auto_awesome</span>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Google Gemini</p>
                                <p className="text-[10px] text-muted-light">Recomendado (Flash 1.5)</p>
                            </div>
                        </div>
                        </label>

                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${settings.ai_provider === 'gpt' ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="provider" 
                            value="gpt"
                            checked={settings.ai_provider === 'gpt'} 
                            onChange={() => setSettings({ ...settings, ai_provider: 'gpt' })}
                            className="accent-primary w-4 h-4"
                        />
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">smart_toy</span>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">OpenAI GPT-4o</p>
                                <p className="text-[10px] text-muted-light">Alta Precisão</p>
                            </div>
                        </div>
                        </label>
                    </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-4 pt-4 border-t border-dashed border-border-light dark:border-border-dark">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Gemini API Key</label>
                            <div className="relative">
                                <input 
                                    type={showKeys['gemini'] ? "text" : "password"}
                                    value={settings.gemini_key || ''}
                                    onChange={(e) => setSettings({ ...settings, gemini_key: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => toggleKeyVisibility('gemini')}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showKeys['gemini'] ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">OpenAI API Key</label>
                            <div className="relative">
                                <input 
                                    type={showKeys['gpt'] ? "text" : "password"}
                                    value={settings.openai_key || ''}
                                    onChange={(e) => setSettings({ ...settings, openai_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => toggleKeyVisibility('gpt')}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showKeys['gpt'] ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-dashed border-border-light dark:border-border-dark">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Prompt de Análise (Avançado)</label>
                                {!isEditingPrompt ? (
                                    <button 
                                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                                        onClick={() => setIsEditingPrompt(true)}
                                    >
                                        <span className="material-symbols-outlined text-[12px]">edit</span>
                                        EDITAR
                                    </button>
                                ) : (
                                    <button 
                                        className="flex items-center gap-1 text-[10px] text-muted-light hover:text-white"
                                        onClick={() => setIsEditingPrompt(false)}
                                    >
                                        <span className="material-symbols-outlined text-[12px]">lock</span>
                                        TRAVAR
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-light mb-1">
                                Instrução enviada para a IA. Use <code>{'{records}'}</code> onde deseja que lista de acidentes seja inserida.
                            </p>
                            <textarea 
                                value={settings.analysis_prompt} 
                                onChange={(e) => setSettings({ ...settings, analysis_prompt: e.target.value })}
                                disabled={!isEditingPrompt}
                                placeholder="Carregando prompt..."
                                className={`w-full h-32 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${!isEditingPrompt ? 'opacity-50 cursor-not-allowed select-none' : 'opacity-100'}`}
                            />
                        </div>
                    </div>
                    
                </div>
                </Card>

                <Card header={<h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Conexão com Banco de Dados</h3>}>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <span className="material-symbols-outlined text-blue-500">info</span>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            O Postgres é recomendado para maior estabilidade. Após salvar, <strong>reinicie o backend</strong>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Host</label>
                            <input 
                                type="text"
                                value={settings.db_host || 'localhost'}
                                onChange={(e) => setSettings({ ...settings, db_host: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Porta</label>
                            <input 
                                type="text"
                                value={settings.db_port || '5432'}
                                onChange={(e) => setSettings({ ...settings, db_port: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Usuário</label>
                            <input 
                                type="text"
                                value={settings.db_user || 'postgres'}
                                onChange={(e) => setSettings({ ...settings, db_user: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Senha</label>
                            <div className="relative">
                                <input 
                                    type={showKeys['db'] ? "text" : "password"}
                                    value={settings.db_password || ''}
                                    onChange={(e) => setSettings({ ...settings, db_password: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => toggleKeyVisibility('db')}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showKeys['db'] ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Nome do Database</label>
                        <input 
                            type="text"
                            value={settings.db_name || 'extrator'}
                            onChange={(e) => setSettings({ ...settings, db_name: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                </div>
                </Card>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-border-light dark:border-border-dark pt-6">
                <Button variant="ghost" onClick={loadSettings}>Descartar</Button>
                <Button 
                    variant="primary" 
                    className="px-8 shadow-lg shadow-primary/20"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </Button>
            </div>
        </>
      ) : (
          <div className="space-y-6">
              {/* CREATE USER FORM */}
              <Card header={<h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>}>
                  <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Nome Completo</label>
                            <input 
                                type="text"
                                value={newUser.name}
                                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                      </div>
                      <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Função</label>
                            <select 
                                value={newUser.role}
                                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="COLABORADOR">COLABORADOR (Restrito)</option>
                                <option value="SUPERADMIN">SUPERADMIN (Total)</option>
                            </select>
                      </div>
                      <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Usuário</label>
                            <input 
                                type="text"
                                value={newUser.username}
                                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                      </div>
                      <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-dark">Senha</label>
                            <input 
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                required={!editingUserId}
                                placeholder={editingUserId ? "Deixar em branco para manter" : ""}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                      </div>
                      <div className="md:col-span-2 flex justify-end mt-2">
                          <div className="flex gap-3">
                            {editingUserId && (
                                <Button variant="ghost" type="button" onClick={cancelEditing} disabled={userLoading}>
                                    CANCELAR
                                </Button>
                            )}
                            <Button variant="primary" type="submit" disabled={userLoading}>
                                    {userLoading ? 'SALVANDO...' : (editingUserId ? 'SALVAR ALTERAÇÕES' : 'CRIAR USUÁRIO')}
                            </Button>
                          </div>
                      </div>
                  </form>
              </Card>

              {/* USERS LIST */}
              <div className="grid gap-4">
                  {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-border-light dark:border-border-dark">
                          <div className="flex items-center gap-4">
                              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {u.name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                                  <p className="text-xs text-muted-light dark:text-muted-dark font-mono">@{u.username} • {u.role}</p>
                              </div>
                          </div>
                          <div>
                              {u.username !== 'ADMIN' && (
                                  <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => startEditing(u)}
                                        className="text-[10px] text-primary hover:underline font-bold uppercase tracking-widest"
                                        title="Editar usuário"
                                      >
                                          EDITAR
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteUser(u)}
                                        className="text-[10px] text-red-500 hover:text-red-700 hover:underline font-bold uppercase tracking-widest"
                                        title="Excluir usuário"
                                      >
                                          EXCLUIR
                                      </button>
                                  </div>
                              )}
                              {u.username === 'ADMIN' && (
                                   <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold uppercase tracking-widest">Master</span>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsView;
