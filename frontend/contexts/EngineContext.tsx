import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { analyzeAccidentBatch } from '../services/geminiService';
import { settingsService } from '../services/settingsService';
import { EngineLog } from '../types';

interface EngineContextType {
    logs: EngineLog[];
    metrics: any;
    progress: number;
    isRunning: boolean;
    isCriticalError: boolean;
    aiProvider: string;
    startEngine: () => void;
    stopEngine: () => void;
    toggleEngine: () => void;
    addLog: (level: EngineLog['level'], message: string) => void;
}

const EngineContext = createContext<EngineContextType | undefined>(undefined);

export const useEngine = () => {
    const context = useContext(EngineContext);
    if (!context) {
        throw new Error('useEngine must be used within an EngineProvider');
    }
    return context;
};

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<EngineLog[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [progress, setProgress] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isCriticalError, setIsCriticalError] = useState(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');

    const isRunningRef = useRef(false);
    const initialPendingRef = useRef(0);
    const noRecordsCountRef = useRef(0);
    const analysisFailureCountRef = useRef(0);

    const addLog = useCallback((level: EngineLog['level'], message: string) => {
        setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
        }]);
    }, []);

    // Initial Data Fetch
    useEffect(() => {
        fetchInitialData();
        fetchSettings();
    }, []);

    // Log persistence limit (optional)
    useEffect(() => {
        if (logs.length > 500) {
            setLogs(logs.slice(-200)); // Keep last 200 to save memory
        }
    }, [logs.length]);

    const fetchInitialData = async () => {
        try {
            const [logsData, metricsData] = await Promise.all([
                dataService.getEngineLogs(),
                dataService.getEngineMetrics()
            ]);
            
            setLogs([...(logsData || []), { 
                timestamp: new Date().toLocaleTimeString(), 
                level: 'INFO', 
                message: 'Sistema de IA Inicializado em Background.' 
            }]);
            setMetrics(metricsData);
            setIsCriticalError(false); // Reset on success
        } catch (e) {
            console.error("Failed to fetch initial engine data", e);
            addLog("ERROR", "Falha crítica ao conectar com o backend.");
            setIsCriticalError(true);
        }
    };

    const fetchSettings = async () => {
        try {
            const settings = await settingsService.getSettings();
            setAiProvider(settings.ai_provider);
        } catch (e) {
            console.error("Failed to load settings in Engine Context", e);
        }
    }

    // Engine Control Functions
    const startEngine = () => { setIsRunning(true); setIsCriticalError(false); };
    const stopEngine = () => setIsRunning(false);
    const toggleEngine = () => {
        if (!isRunning) setIsCriticalError(false); // Reset error if we try to start again
        setIsRunning(prev => !prev);
    }

    // Main Processing Loop
    useEffect(() => {
        isRunningRef.current = isRunning;
        
        // Capture initial pending count when starting
        if (isRunning && metrics?.pendingLeads) {
            if (initialPendingRef.current === 0 || progress === 100) {
                initialPendingRef.current = metrics.pendingLeads;
                setProgress(0);
            }
        } else if (!isRunning) {
             if (logs.length > 0 && logs[logs.length-1].message !== "Motor de Análise PAUSADO pelo usuário.") {
                 // Avoid duplicate logs
             }
        }

        let processingInterval: any;
        let localQueue: any[] = [];
        let isProcessing = false;

        const processQueue = async () => {
            if (!isRunningRef.current || isProcessing) return;
            isProcessing = true;

            try {
                // Refill Queue if empty
                if (localQueue.length === 0) {
                    addLog("AI-ENGINE", "Buscando novo lote de registros (50 itens)...");
                    try {
                        const newBatch = await dataService.getPendingAnalysisRecords(50);
                         if (newBatch.length === 0) {
                            noRecordsCountRef.current += 1;
                            
                            if (noRecordsCountRef.current >= 3) {
                                 addLog("WARNING", "Motor de Análise Pausado por falta de registros pendentes");
                                 setIsRunning(false);
                                 noRecordsCountRef.current = 0; // Reset
                                 isProcessing = false;
                                 return;
                            }

                            addLog("INFO", `Nenhum registro pendente encontrado. Tentativa ${noRecordsCountRef.current}/3. Aguardando...`);
                            setProgress(100);
                            isProcessing = false; // Release lock
                            return;
                        }
                        noRecordsCountRef.current = 0; // Reset count since we found records
                        localQueue = [...newBatch];
                        addLog("INFO", `Fila abastecida com ${localQueue.length} registros.`);
                    } catch (fetchErr) {
                        addLog("ERROR", `Falha ao buscar registros: ${fetchErr}`);
                        setIsCriticalError(true);
                        setIsRunning(false);
                        return;
                    }
                }

                // Process sub-batch (Next 5 items)
                const subBatch = localQueue.slice(0, 5);
                
                if (subBatch.length === 0) {
                     isProcessing = false;
                     return;
                }

                const ids = subBatch.map((p: any) => p.id).join(", ");
                addLog("INFO", `Analisando IDs: [${ids}]`);
                
                subBatch.forEach((p: any) => {
                     addLog("AI-ENGINE", `Analisando ID ${p.id}: "${p.description.substring(0, 40)}..."`);
                });

                const results = await analyzeAccidentBatch(subBatch);

                if (results && results.length > 0) {
                   analysisFailureCountRef.current = 0; // Success
                   addLog("SUCCESS", `Análise IA concluída. Salvando...`);
                   
                   const saved = await dataService.saveAnalysisBatch(results);
                   if (saved) {
                     results.forEach((res: any) => {
                         const statusIcon = res.validity === 'Válido' ? '✅' : res.validity === 'Inválido' ? '❌' : '⚠️';
                         addLog("SUCCESS", `${statusIcon} ID ${res.id}: ${res.validity} - ${res.motivo}`);
                     });

                     // Remove processed items from local queue
                     const processedIds = new Set(results.map((r: any) => r.id.toString()));
                     localQueue = localQueue.filter((item: any) => !processedIds.has(item.id.toString()));
                     
                     addLog("SUCCESS", `Lote salvo. Restam ${localQueue.length} na fila local.`);
                     
                     // Refresh metrics
                     const newMetrics = await dataService.getEngineMetrics();
                     if (newMetrics) {
                         setMetrics(newMetrics);
                         
                         // Update Progress
                         if (initialPendingRef.current > 0) {
                             const currentPending = newMetrics.pendingLeads;
                             const processed = initialPendingRef.current - currentPending;
                             const pct = Math.min(100, Math.max(0, Math.round((processed / initialPendingRef.current) * 100)));
                             setProgress(pct);
                         }
                     }
                   } else {
                     addLog("ERROR", "Falha ao salvar resultados no banco.");
                     // DB might be down
                     setIsCriticalError(true);
                     setIsRunning(false);
                   }
                } else {
                   analysisFailureCountRef.current += 1;
                   if (analysisFailureCountRef.current >= 5) {
                        addLog("ERROR", "Motor de Análise Pausado por falha na análise");
                        setIsRunning(false);
                        setIsCriticalError(true); // AI Service might be down
                        analysisFailureCountRef.current = 0;
                   } else {
                        addLog("WARNING", `Falha na análise da IA ou resposta vazia. Tentativa ${analysisFailureCountRef.current}/5.`);
                   }
                }
                
            } catch (err) {
                analysisFailureCountRef.current += 1;
                if (analysisFailureCountRef.current >= 5) {
                     addLog("ERROR", "Motor de Análise Pausado por falha na análise (Erro Crítico)");
                     setIsRunning(false);
                     setIsCriticalError(true);
                     analysisFailureCountRef.current = 0;
                }
                addLog("ERROR", `Erro no ciclo de processamento: ${err}`);
            } finally {
                isProcessing = false;
            }
        };

        if (isRunning) {
            addLog("INFO", "Motor de Análise INICIADO (Modo Fila).");
            processQueue();
            processingInterval = setInterval(processQueue, 5000); // Check queue every 5s
        } else {
            if (processingInterval) clearInterval(processingInterval);
        }

        return () => {
            if (processingInterval) clearInterval(processingInterval);
        };
    }, [isRunning, aiProvider, addLog]); // Dependencies

    return (
        <EngineContext.Provider value={{
            logs,
            metrics,
            progress,
            isRunning,
            isCriticalError,
            aiProvider,
            startEngine,
            stopEngine,
            toggleEngine,
            addLog
        }}>
            {children}
        </EngineContext.Provider>
    );
};
