
import React, { useEffect, useRef } from 'react';
import { useEngine } from '../contexts/EngineContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Screen } from '../types';

interface EngineViewProps {
  autoStart?: boolean;
  onNavigate?: (screen: Screen) => void;
}

const EngineView: React.FC<EngineViewProps> = ({ autoStart, onNavigate }) => {
  const { 
    logs, 
    metrics, 
    progress, 
    isRunning, 
    aiProvider, 
    toggleEngine,
    startEngine
  } = useEngine();

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle Auto-start prop
  useEffect(() => {
      if (autoStart && !isRunning) {
          setTimeout(() => {
              startEngine();
          }, 500);
      }
  }, [autoStart]);

  if (!metrics) return (
      <div className="flex h-full items-center justify-center text-slate-900 dark:text-white">
          Carregando métricas do motor...
      </div>
  );

  return (
    <div className="flex h-full flex-col gap-6 max-w-[1600px] w-full mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:border-warning/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <span className="material-symbols-outlined">hourglass_empty</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-light dark:text-muted-dark">Leads Pendentes</span>
                  <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter">{metrics.pendingLeads}</span>
                </div>
              </div>
              <Badge variant="warning">Aguardando</Badge>
            </div>

          </Card>

          <Card className="hover:border-success/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-light dark:text-muted-dark">Leads Processados</span>
                  <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter">{metrics.processedLeads}</span>
                </div>
              </div>
              <Badge variant="success">Finalizados</Badge>
            </div>
            {/* <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-dark">
              <span className="material-symbols-outlined text-[14px] text-success">verified_user</span>
              Motor operacional e estável
            </div> */}
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border-dark pb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">settings_input_component</span>
                <h3 className="font-bold text-sm uppercase tracking-widest">Configuração</h3>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-light dark:text-muted-dark">Modelo de Linguagem</label>
                  
                  <select 
                    className="w-full rounded bg-slate-50 dark:bg-background-dark border border-border-light dark:border-border-dark p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary appearance-none"
                    disabled={isRunning} 
                    value={aiProvider === 'gpt' ? ( aiProvider === 'gpt' ? 'gpt-4o-mini' : 'gpt-4o-mini') : 'gemini-1.5-flash'} // Simplified for display only since setting is global now
                    onChange={() => alert("Configure o provedor na tela de Ajustes")}
                  >
                    {aiProvider === 'gpt' ? (
                        <>
                            <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                        </>
                    ) : (
                        <>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</option>
                        </>
                    )}
                  </select>
                  <p className="text-[9px] text-muted-light dark:text-muted-dark mt-1">
                      Provedor Atual: <span className="font-bold text-primary">{aiProvider === 'gpt' ? 'OpenAI' : 'Google Gemini'}</span>
                      <br/>
                      (Altere em Ajustes)
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant={isRunning ? "danger" : "primary"} 
              className="w-full mt-4 h-12 uppercase tracking-[0.2em] text-[10px]"
              onClick={toggleEngine}
            >
              <span className="material-symbols-outlined mr-2">
                {isRunning ? "stop_circle" : "play_circle"}
              </span>
              {isRunning ? "Interromper Processamento" : "Iniciar Motor de Análise"}
            </Button>
            
            <Button 
                variant="outline"
                className="w-full mt-2 h-10 uppercase tracking-[0.2em] text-[10px] border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onNavigate?.('results')}
            >
                <span className="material-symbols-outlined mr-2">assignment_turned_in</span>
                Analisar Resultados
            </Button>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] flex flex-col rounded-lg border border-border-dark bg-[#0a0f18] shadow-ui-lg overflow-hidden">
        <div className="bg-slate-900/80 px-4 py-2 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-danger/50"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-warning/50"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-success/50"></div>
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-dark tracking-widest uppercase ml-2">Console Executivo - worker_pool_01</span>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[9px] font-bold text-primary uppercase">Active</span>
            </div>
          )}
        </div>

        <div className="p-6 border-b border-white/5 bg-slate-900/20">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-white text-sm font-bold">Lote em execução {metrics.currentBatch}</p>
              <p className="text-muted-dark text-[10px] font-bold uppercase mt-1">Status: {isRunning ? "Processando lotes..." : "Aguardando comando"}</p>
            </div>
            <div className="text-right">
              <p className="text-primary text-2xl font-mono font-bold">{progress}%</p>
            </div>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(19,91,236,0.4)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 scroll-smooth">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 group">
              <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
              <span className="shrink-0 min-w-[75px]">
                  <span className={`font-bold ${
                    log.level === 'SUCCESS' ? 'text-success' : 
                    log.level === 'WARNING' ? 'text-warning' : 
                    log.level === 'ERROR' ? 'text-danger' : 
                    log.level === 'AI-ENGINE' ? 'text-primary' : 'text-slate-500'
                  }`}>
                    {log.level}
                  </span>
              </span>
              <span className="text-slate-300 group-hover:text-white transition-colors">{log.message}</span>
            </div>
          ))}
          {isRunning && logs.length === 0 && (
            <div className="text-slate-500 italic">Iniciando logs... (Conectando ao {aiProvider === 'gpt' ? 'OpenAI' : 'Gemini Cloud'})</div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default EngineView;
