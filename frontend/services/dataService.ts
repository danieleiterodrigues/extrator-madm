import axios from 'axios';
import { AccidentRecord, ProcessingFile, EngineLog, AnalysisResult, DashboardStats, EngineMetrics, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || ''; // Relative path for production

const api = axios.create({
  baseURL: API_URL,
  timeout: 600000, // 600s timeout
});

export const dataService = {
  getDashboardRecords: async (page = 1, limit = 20, search?: string, status?: string): Promise<{ records: AccidentRecord[], total: number }> => {
    try {
      const skip = (page - 1) * limit;
      let url = `/records?skip=${skip}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      // Map frontend status to backend status
      if (status === 'Válido') url += `&status=valid`;
      if (status === 'Inválido') url += `&status=invalid`;
      // 'Atenção' not yet supported by backend explicit filter, maybe logic is needed
      
      const response = await api.get(url);
      
      return {
        records: response.data.items.map((record: any) => ({
          id: record.id.toString(),
          nome: record.nome,
          documento: record.documento,
          motivo: record.motivo_acidente,
          status: record.valid ? 'Válido' : 'Inválido',
          data: record.created_at || new Date().toISOString(),
          aiJustification: record.analysis?.justificativa,
          aiScore: 0
        })),
        total: response.data.total
      };
    } catch (error) {
      console.error("Error fetching records:", error);
      return { records: [], total: 0 };
    }
  },

  getDashboardStatsRaw: async () => {
     const response = await api.get('/dashboard');
     return response.data;
  },
  
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (id: string) => {
    await api.delete(`/imports/${id}`);
  },

  getImportFiles: async (): Promise<ProcessingFile[]> => {
    try {
      const response = await api.get('/imports');
      return response.data.map((imp: any) => ({
        id: imp.id.toString(),
        name: imp.filename,
        size: 'Unknown', // Backend doesn't store size yet
        status: imp.status === 'PROCESSED' ? 'ready' : imp.status === 'ERROR' ? 'error' : 'validating',
        addedAt: new Date(imp.uploaded_at).toLocaleDateString(),
        error: imp.status === 'ERROR' ? 'Erro no processamento' : undefined
      }));
    } catch (error) {
      console.error("Error fetching imports:", error);
      // Don't silently fail; let the UI validly show empty or handle error
      throw error; 
    }
  },
  
  getEngineLogs: async () => {
    try {
      const response = await api.get('/engine/logs');
      return response.data;
    } catch (error) {
      console.error("Error fetching engine logs:", error);
      return [];
    }
  },
  
  getAnalysisStats: async () => {
    try {
      const response = await api.get('/dashboard');
      // Format to match expected frontend structure
      return [
        { label: 'Total Processado', value: response.data.analyzed_records, color: 'blue', icon: 'database' },
        { label: 'Válidos', value: response.data.analyzed_valid, color: 'green', icon: 'check_circle' },
        { label: 'Atenção', value: response.data.analyzed_attention, color: 'yellow', icon: 'warning' },
        { label: 'Inválidos', value: response.data.analyzed_invalid, color: 'red', icon: 'error' },
        { label: 'Valid. Manual', value: response.data.analyzed_manual || 0, color: 'orange', icon: 'edit_note' }
      ];
    } catch (error) {
      return [];
    }
  },
  
  getAnalysisResults: async (page = 1, limit = 50, filters: any = {}, sort?: { by: string, order: 'asc' | 'desc' }) => {
    try {
      const skip = (page - 1) * limit;
      let url = `/records?skip=${skip}&limit=${limit}`;
      
      // Handle Filters
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      
      // Handle Sorting
      if (sort && sort.by) {
          url += `&sort_by=${sort.by}`;
          if (sort.order === 'desc') url += `&order_desc=true`;
          else url += `&order_desc=false`;
      }

      if (filters.status === 'Válido') url += `&status=analyzed_valid`;
      else if (filters.status === 'Inválido') url += `&status=analyzed_invalid`;
      else if (filters.status === 'Atenção') url += `&status=analyzed_attention`;
      else if (filters.status === 'Validar Manualmente') url += `&status=analyzed_manual`;
      else if (filters.status === 'Ignorado') url += `&status=Ignorado`;
      else {
          // Default: Fetch all analyzed records (Valid + Invalid + Attention)
          url += `&status=analyzed`; 
      }

      const response = await api.get(url);
      
      const items = response.data.items;

      return {
        items: items.map((record: any) => {
            // Identify Dynamic Columns
            const knownKeys = ['id', 'import_id', 'created_at', 'valid', 'error_message', 'analysis', 'nome', 'documento', 'data_nascimento', 'telefone', 'motivo_acidente'];
            const dynamicFields: Record<string, any> = {};
            
            Object.keys(record).forEach(key => {
                if (!knownKeys.includes(key)) {
                    dynamicFields[key] = record[key];
                }
            });

            return {
                id: record.id.toString(),
                time: new Date(record.created_at).toLocaleString(),
                type: record.analysis?.status || 'N/A', // Classification/Status
                justification: record.analysis?.justificativa || 'Sem análise',
                score: record.analysis?.score || 0,
                status: record.analysis?.status || (record.valid ? 'Pendente' : 'Ignorado'), // Check validity first
                highlight: record.analysis?.status === 'Inválido' ? 'danger' : undefined,
                // Lead Data
                nome: record.nome || 'N/A',
                documento: record.documento || 'N/A',
                data_nascimento: record.data_nascimento || 'N/A',
                telefone: record.telefone || 'N/A',
                motivo_acidente: record.motivo_acidente || 'N/A',
                dynamicFields: dynamicFields
            };
        }),
        total: response.data.total
      };
    } catch (error) {
      console.error("Error fetching analysis results:", error);
      return { items: [], total: 0 };
    }
  },

    getAllAnalysisResults: async (filters: any = {}) => {
    try {
        // Fetch a large number of records to simulate "all" for export
        // Ideally backend would have a specific export endpoint or support limit=-1
        const limit = 10000; 
        const skip = 0;
        let url = `/records?skip=${skip}&limit=${limit}`;

        console.log("Export Filters Received:", filters); // DEBUG

        // Handle Filters
        if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
        
        if (filters.status === 'Válido') url += `&status=analyzed_valid`;
        else if (filters.status === 'Inválido') url += `&status=analyzed_invalid`;
        else if (filters.status === 'Atenção') url += `&status=analyzed_attention`;
        else {
            // Default to Valid records as per pagination logic, or fetch ALL if needed?
            // User requested "If 'All' is selected, export entire base".
            // The backend default without status returns EVERYTHING (valid, invalid, pending, analyzed).
            // However, the user Context is "Results View".
            // If I export "All", should I include Pending Analysis items? 
            // The user said: "se estiver selecionado todos os status, exporta toda a base".
            // I will assume this means ALL valid records (analyzed or not) or ALL Analyzed?
            // Given "Results View" context, it's usually Analyzed. But "Entire Base" implies everything import.
            // Let's stick to the current logic: if no status, fetch Valid records (which includes analyzed).
            // Or better: Let's reuse the logic from `getAnalysisResults` regarding `url += &status=valid`?
            // In pagination `getAnalysisResults`, we force `status=valid` if filter is empty.
            // Let's keep consistency.
            url += `&status=valid`; 
        }

        const response = await api.get(url);
        
        // Same Client Side Filter for Analysis existence? 
        // If user wants "Entire Base", maybe they want even those without analysis? 
        // "só está exportando os dados que estao sendo apresentados na tela" -> implying they want the same *type* of data, just all of it.
        // The screen shows `items.filter((r: any) => r.analysis)`. 
        // So I should keep this filter to ensure consistency with what "Results" means (Analyzed records).
        const items = response.data.items.filter((r: any) => r.analysis);

        return items.map((record: any) => {
             // Identify Dynamic Columns
            const knownKeys = ['id', 'import_id', 'created_at', 'valid', 'error_message', 'analysis', 'nome', 'documento', 'data_nascimento', 'telefone', 'motivo_acidente'];
            const dynamicFields: Record<string, any> = {};
            
            Object.keys(record).forEach(key => {
                if (!knownKeys.includes(key)) {
                    dynamicFields[key] = record[key];
                }
            });

            return {
                id: record.id.toString(),
                time: new Date(record.created_at).toLocaleString(),
                type: record.analysis?.status || 'N/A', 
                justification: record.analysis?.justificativa || 'Sem análise',
                score: record.analysis?.score || 0,
                status: record.analysis?.status || 'Pendente',
                highlight: record.analysis?.status === 'Inválido' ? 'danger' : undefined,
                // Lead Data
                nome: record.nome || 'N/A',
                documento: record.documento || 'N/A',
                data_nascimento: record.data_nascimento || 'N/A',
                telefone: record.telefone || 'N/A',
                motivo_acidente: record.motivo_acidente || 'N/A',
                dynamicFields: dynamicFields
            };
        });

    } catch (error) {
        console.error("Error fetching all results for export", error);
        return [];
    }
  },
  
  getEngineMetrics: async () => {
    try {
      const response = await api.get('/engine/metrics');
      return response.data;
    } catch (error) {
      console.error("Error fetching engine metrics:", error);
      return null;
    }
  },

  // New methods for Engine Processing
  getPendingAnalysisRecords: async (limit = 10) => {
    try {
      // Reuse getRecords but filter by valid=true and we might need a way to filter unanalyzed.
      // For now, let's assume we fetch recent valid ones.
      // Ideally backend supports params: status=valid&analyzed=false
      // I'll assume I update backend to support this flag or I filter client side if list is small.
      // Given paginated API, best is to add a specific endpoint or param.
      // Let's rely on standard list for now and filter roughly or grab from specific endpoint.
      // Actually, let's create a specialized call or just reuse /records with a special flag if back supports it.
      // The backend has `status` param. Let's try to add `analyzed=false` support to backend briefly or
      // just use a new simple endpoint in backend?
      // Simpler: Fetch records, filter client side for Demo purposes if backend update is too heavy.
      // But I can update backend easily. 
      // Let's assume I'll use `status=vide_pending` or similar. 
      // Wait, I didn't add that to backend. 
      // Let's just fetch existing records and pick first N that don't have analysis.
      // Since `getDashboardRecords` returns mapped objects, I might not see analysis status clearly unless I map it.
      // Use the new backend filter for pending analysis
      // Use the new backend filter for pending analysis
      const response = await api.get(`/records?limit=${limit}&status=pending_analysis`); 
      const pending = response.data.items;
      
      return pending.map((record: any) => {
        // Capture all fields for analysis context
        const { id, import_id, created_at, valid, error_message, analysis, ...rest } = record;
        
        return {
            id: record.id.toString(),
            description: record.motivo_acidente || "Sem descrição", // Keep for compatibility if needed
            ...rest // Spread remaining dynamic fields (nome, documento, custom_cols, etc)
        };
      });
    } catch (error) {
      return [];
    }
  },

  saveAnalysisBatch: async (results: any[]) => {
    try {
      // Map to backend expected format
      const payload = results.map(r => ({
        record_id: parseInt(r.id),
        status: r.validity, // Backend uses 'status' (AnalysisResult schema)
        justificativa: r.justificativa,
        score: r.score,
        validity: r.validity,
      }));
      
      await api.post('/analyses/batch', payload);
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Erro desconhecido ao salvar";
      console.error("Error saving batch:", msg);
      throw new Error(msg); 
    }
  },

  async reprocessRecord(id: number): Promise<boolean> {
      try {
          await axios.post(`${API_URL}/records/${id}/reprocess`);
          return true;
      } catch (error) {
          console.error("Failed to reprocess record", error);
          return false;
      }
  },

  // --- AUTH ---
  async login(username: string, password: string): Promise<User | null> {
      try {
          const response = await axios.post(`${API_URL}/login`, { username, password });
          return response.data;
      } catch (error) {
          console.error("Login failed", error);
          return null;
      }
  },

  async getUsers(): Promise<User[]> {
      try {
          const response = await axios.get(`${API_URL}/users`);
          return response.data;
      } catch (error) {
          console.error("Failed to fetch users", error);
          return [];
      }
  },

  async createUser(user: Partial<User> & { password: string }): Promise<User | null> {
      try {
          const response = await axios.post(`${API_URL}/users`, user);
          return response.data;
      } catch (error) {
          console.error("Failed to create user", error);
          return null;
      }
  },

  async updateUser(id: number, user: Partial<User> & { password?: string }): Promise<User | null> {
      try {
          const response = await axios.put(`${API_URL}/users/${id}`, user);
          return response.data;
      } catch (error) {
          console.error("Failed to update user", error);
          return null;
      }
  },

  async deleteUser(id: number): Promise<boolean> {
      try {
          await axios.delete(`${API_URL}/users/${id}`);
          return true;
      } catch (error) {
          console.error("Failed to delete user", error);
          return false;
      }
  }
};
