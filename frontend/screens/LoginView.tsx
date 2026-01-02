import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050910] p-4">
      <div className="w-full max-w-md bg-[#0f1522] border border-slate-800 rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
        
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        <div className="flex flex-col mb-10 text-center">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-100 mb-2">
                Acesso Restrito
            </h1>
            <p className="text-xs text-muted-dark font-mono text-slate-400">Entre com suas credenciais para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 text-left">Usuário</label>
              <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 text-[20px] transition-colors group-focus-within:text-primary">person</span>
                  <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#0a0f18] border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                      placeholder="Digite seu usuário"
                      required
                  />
              </div>
          </div>
          
          <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 text-left">Senha</label>
              <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 text-[20px] transition-colors group-focus-within:text-primary">lock</span>
                  <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0a0f18] border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                      placeholder="••••••••"
                      required
                  />
              </div>
          </div>

          {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg text-center font-bold animate-pulse">
                  {error}
              </div>
          )}

          <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 mt-2"
          >
              {isLoading ? (
                  <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Entrando...
                  </>
              ) : (
                  'Entrar no Sistema'
              )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/50 pt-6">
            <p className="text-[10px] text-slate-600 font-mono">Extrator &copy; 2024</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
