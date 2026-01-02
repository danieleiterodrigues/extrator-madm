import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

export interface SystemSettings {
  ai_provider: 'gemini' | 'gpt';
  gemini_key: string;
  openai_key: string;
  analysis_prompt?: string;
  
  // Database
  db_host?: string;
  db_port?: string;
  db_name?: string;
  db_user?: string;
  db_password?: string;
}

export const settingsService = {
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const response = await api.get('/settings');
      return response.data;
    } catch (error) {
      console.error("Error fetching settings:", error);
      return { ai_provider: 'gemini', gemini_key: '', openai_key: '', analysis_prompt: '' };
    }
  },

  updateSettings: async (settings: SystemSettings) => {
    try {
      await api.post('/settings', settings);
      return true;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  }
};
