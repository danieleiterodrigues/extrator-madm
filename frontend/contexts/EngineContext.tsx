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
    refreshSettings: () => Promise<void>;
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
    
    // Alias for external use
    const refreshSettings = fetchSettings;

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
                // RETRY MODE: Fetch TOTAL_BATCH_ITEMS items (calculated below)
                const BATCH_SIZE = 35;
                const MAX_CONCURRENT_BATCHES = 7;
                const TOTAL_BATCH_ITEMS = BATCH_SIZE * MAX_CONCURRENT_BATCHES; // 30 * 5 = 150 items per cycle

                if (localQueue.length === 0) {
                    addLog("AI-ENGINE", `Buscando novo lote de registros (${TOTAL_BATCH_ITEMS} itens)...`);
                    try {
                        const newBatch = await dataService.getPendingAnalysisRecords(TOTAL_BATCH_ITEMS);
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

                // --- PARALLEL PROCESSING START ---
                // We will take up to TOTAL_BATCH_ITEMS items
                
                // Take items for this cycle
                const cycleItems = localQueue.slice(0, TOTAL_BATCH_ITEMS);
                
                if (cycleItems.length === 0) {
                     isProcessing = false;
                     return;
                }

                // Split into chunks
                const chunks = [];
                for (let i = 0; i < cycleItems.length; i += BATCH_SIZE) {
                    chunks.push(cycleItems.slice(i, i + BATCH_SIZE));
                }

                addLog("INFO", `Iniciando processamento paralelo: ${chunks.length} lotes de ~${BATCH_SIZE} itens.`);

                let totalSavedInCycle = 0;
                let processedIdsInCycle: string[] = [];

                // Process chunks in parallel using Independent Promises
                // This ensures UI updates AS SOON AS a batch is ready
                const batchPromises = chunks.map(async (chunk, index) => {
                    const batchId = index + 1;
                    
                    try {
                        // 1. Analyze
                        const results = await analyzeAccidentBatch(chunk);
                        
                        if (Array.isArray(results)) {
                            if (results.length > 0) {
                                // 2. Save Immediately
                                const saved = await dataService.saveAnalysisBatch(results);
                                if (saved) {
                                    const savedCount = results.length;
                                    totalSavedInCycle += savedCount;
                                    
                                    results.forEach((res: any) => {
                                        processedIdsInCycle.push(res.id.toString());
                                    });

                                    addLog("SUCCESS", `[Lote ${batchId}] ✅ Salvo com sucesso (+${savedCount} itens).`);
                                    
                                    try {
                                        const newMetrics = await dataService.getEngineMetrics();
                                        if (newMetrics) setMetrics(newMetrics);
                                    } catch (e) { /* ignore metric fetch err */ }
                                    
                                } else {
                                    addLog("ERROR", `[Lote ${batchId}] Falha ao salvar no banco.`);
                                }
                            } else {
                                addLog("WARNING", `[Lote ${batchId}] IA retornou lista vazia (sem resultados válidos).`);
                            }
                        } else {
                            // Null/Undefined means error caught in service
                            addLog("WARNING", `[Lote ${batchId}] Erro na Requisição da IA (Verificar Console).`);
                        }
                    } catch (error: any) {
                        const msg = error.response?.data?.detail || error.message || "Erro desconhecido";
                        addLog("WARNING", `[Lote ${batchId}] Falha: ${msg}`);
                    }
                });

                // Wait for all to finish (just to know when to start next main cycle)
                await Promise.all(batchPromises);

                if (totalSavedInCycle > 0) {
                    analysisFailureCountRef.current = 0;
                    
                    // Remove processed items from local queue
                    const processedSet = new Set(processedIdsInCycle);
                    localQueue = localQueue.filter((item: any) => !processedSet.has(item.id.toString()));

                    addLog("SUCCESS", `Ciclo concluído. Total processado: ${totalSavedInCycle}. Restam ${localQueue.length} na fila local.`);
                    
                    // Final Progress Sync
                    const newMetrics = await dataService.getEngineMetrics();
                     if (newMetrics) {
                         setMetrics(newMetrics);
                         if (initialPendingRef.current > 0) {
                             const currentPending = newMetrics.pendingLeads;
                             const processed = initialPendingRef.current - currentPending;
                             const pct = Math.min(100, Math.max(0, Math.round((processed / initialPendingRef.current) * 100)));
                             setProgress(pct);
                         }
                     }

                } else {
                     analysisFailureCountRef.current += 1;
                     addLog("WARNING", `Ciclo sem sucessos. Falhas consecutivas: ${analysisFailureCountRef.current}`);
                     
                     if (analysisFailureCountRef.current >= 5) {
                        addLog("ERROR", "Motor Pausado: Falhas consecutivas excessivas.");
                        setIsRunning(false);
                        setIsCriticalError(true);
                        analysisFailureCountRef.current = 0;
                     }
                }
                
                // --- PARALLEL PROCESSING END ---
                
            } catch (err) {
                addLog("ERROR", `Erro Crítico no ciclo: ${err}`);
                setIsRunning(false);
                setIsCriticalError(true);
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
            addLog,
            refreshSettings
        }}>
            {children}
        </EngineContext.Provider>
    );
};
