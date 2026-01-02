
import { AccidentRecord, ProcessingFile, EngineLog } from './types';

export const SYSTEM_PROMPT = `ROLE: Senior Frontend Engineer (React/Tailwind/DS Specialist).
MISSION: Evolve "Project Extrator" with strict adherence to established design tokens and architecture.

1. FOUNDATIONS (DESIGN TOKENS)
- Colors: primary (#135bec), background-light (#f6f6f8), background-dark (#0a0f18), surface-light (#ffffff), surface-dark (#111722), border-light (#e2e8f0), border-dark (#1e293b).
- Typography: Display (Inter), Body (Noto Sans), Mono (JetBrains Mono).
- Iconography: Material Symbols Outlined exclusively.

2. COMPONENT ARCHITECTURE
- <Button />: Variants [primary, secondary, outline, ghost, danger]. Sizes [sm, md, lg, icon]. Always font-bold.
- <Badge />: Variants [success, warning, danger, info, outline]. Supports 'dot' prop.
- <Card />: Main container. Use 'noPadding' for tables.

3. INTERFACE RULES
- Theme: Dark-first approach. Use dark: prefix for all contrast.
- Data Density: Enterprise-level high density.
- Tables: Header font-size [10px], bold, uppercase, tracking-widest.

4. TECHNICAL STANDARDS
- State: Screen-based navigation via Screen type.
- Services: dataService for mocks/fetches, geminiService for AI.
- AI Model: gemini-3-flash-preview.`;

export const MOCK_RECORDS: AccidentRecord[] = [
  { id: '1', nome: 'Carlos Silva', documento: '123.456.789-00', motivo: 'Colisão Frontal', status: 'Válido', data: '2023-10-24 14:30' },
  { id: '2', nome: 'Ana Souza', documento: '000.000.000-XX', motivo: 'Capotamento', status: 'Inválido', data: '2023-10-24 15:15', aiJustification: 'CPF com formato inválido ou inexistente na base.' },
  { id: '3', nome: 'Marcos Rocha', documento: '987.654.321-11', motivo: 'Atropelamento', status: 'Válido', data: '2023-10-24 16:00' },
  { id: '4', nome: 'Juliana Lima', documento: '456.123.789-22', motivo: 'Colisão Traseira', status: 'Válido', data: '2023-10-24 16:22' },
  { id: '5', nome: 'Roberto Dias', documento: '111.222.333-ER', motivo: 'Queda de Moto', status: 'Inválido', data: '2023-10-24 16:45', aiJustification: 'Dados de veículo incompletos.' },
  { id: '6', nome: 'Felipe Santos', documento: '555.444.333-21', motivo: 'Engavetamento', status: 'Válido', data: '2023-10-25 09:10' },
];

export const MOCK_FILES: ProcessingFile[] = [
  { id: 'f1', name: 'dados_br_nov_2023.csv', size: '45.2 MB', status: 'validating', addedAt: '2 min ago' },
  { id: 'f2', name: 'relatorio_gxl_v2.xlsx', size: '12.8 MB', status: 'ready', addedAt: '5 min ago' },
  { id: 'f3', name: 'base_antiga_corrompida.csv', size: '2.1 MB', status: 'error', addedAt: '10 min ago', error: 'Erro de codificação' },
];

export const MOCK_LOGS: EngineLog[] = [
  { timestamp: '14:30:01', level: 'INFO', message: 'Iniciando worker pool com 8 threads...' },
  { timestamp: '14:30:02', level: 'INFO', message: 'Conexão com banco de dados local estabelecida (ms: 12ms).' },
  { timestamp: '14:30:02', level: 'SUCCESS', message: 'Carregado prompt v3.2 na memória.' },
  { timestamp: '14:30:05', level: 'INFO', message: 'Processando lote 1/100 (50 registros)...' },
  { timestamp: '14:30:15', level: 'AI-ENGINE', message: 'Analisando registro ID #450 - Padrão detectado: "Colisão Traseira". Score: 0.98' },
  { timestamp: '14:30:16', level: 'AI-ENGINE', message: 'Analisando registro ID #451 - Padrão detectado: "Danos Materiais". Score: 0.92' },
  { timestamp: '14:30:17', level: 'WARNING', message: 'Atenção: Dados incompletos para registro #452, solicitando revalidação.' },
  { timestamp: '14:30:18', level: 'AI-ENGINE', message: 'Analisando registro ID #453 - Padrão detectado: "Sem Vítimas". Score: 0.99' },
];

export const ANALYSIS_STATS = [
  { label: 'Total Processado', value: '14.502', icon: 'dns', color: 'primary' },
  { label: 'Válidos', value: '13.7k', sub: '94.5%', icon: 'check_circle', color: 'success' },
  { label: 'Atenção', value: '628', sub: '4.3%', icon: 'warning', color: 'warning' },
  { label: 'Inválidos', value: '174', sub: '1.2%', icon: 'error', color: 'danger' },
];

export const ANALYSIS_RESULTS = [
  { id: '#REG-8492', time: '24 Out 2023, 14:30', type: 'Colisão Frontal', justification: 'Descrição compatível com os danos relatados. Horário e condições climáticas consistentes.', score: 98, status: 'Válido' },
  { id: '#REG-8493', time: '24 Out 2023, 15:15', type: 'Atropelamento', justification: 'Inconsistência leve: Localização GPS diverge do endereço textual por 150m.', score: 72, status: 'Atenção', highlight: 'warning' },
  { id: '#REG-8494', time: '24 Out 2023, 16:00', type: 'Desconhecido', justification: 'Erro Crítico: Campos obrigatórios ausentes (Placa, Condutor). Dados corrompidos.', score: 12, status: 'Inválido', highlight: 'danger' },
  { id: '#REG-8495', time: '24 Out 2023, 16:22', type: 'Capotamento', justification: 'Padrão de alta velocidade identificado no relato. Classificação confiável.', score: 95, status: 'Válido' },
];

export const ENGINE_METRICS = {
  pendingLeads: '1,240',
  processedLeads: '8,450',
  currentBatch: '#B-2023-11',
  performanceTrend: '+12%',
};
