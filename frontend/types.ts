
export type Screen = 'dashboard' | 'import' | 'results' | 'engine' | 'settings' | 'design-system';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'SUPERADMIN' | 'COLABORADOR';
  token?: string;
}

export interface AccidentRecord {
  id: string;
  nome: string;
  documento: string;
  motivo: string;
  status: 'Válido' | 'Inválido' | 'Atenção';
  data: string;
  aiJustification?: string;
  aiScore?: number;
}

export interface ProcessingFile {
  id: string;
  name: string;
  size: string;
  status: 'validating' | 'ready' | 'error';
  addedAt: string;
  error?: string;
}

export interface AnalysisResult {
  id: number;
  record_id: number;
  validity: string;
  score: number;
  motivo: string;
  justificativa: string;
  timestamp: string;
  person_name?: string;
  documento?: string;
  status?: string; 
}

export interface DashboardStats {
  total_records: number;
  analyzed_records: number;
  valid_records: number;
  invalid_records: number;
  analyzed_valid: number;
  analyzed_invalid: number;
  analyzed_attention: number;
  analyzed_manual: number;
  reasons_breakdown: { name: string; value: number }[];
  performanceTrend: any[];
}

export interface EngineMetrics {
  total_analyzed: number;
  success_rate: number;
  avg_time: number;
  last_activity: string;
}

export interface EngineLog {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'AI-ENGINE' | 'ERROR' | 'WARNING';
  message: string;
}
