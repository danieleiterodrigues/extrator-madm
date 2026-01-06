
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'; // Fallback to local backend only if undefined

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 minutes timeout
});

// Define input type
type RecordToAnalyze = {
  id: string;
  description: string;
  [key: string]: any; // Allow dynamic columns
};

export const analyzeAccidentBatch = async (records: RecordToAnalyze[]) => {
  try {
    // Call Backend Endpoint instead of Frontend SDK
    const response = await api.post('/engine/analyze', records);
    return response.data;
  } catch (error: any) {
    console.error("Backend analysis failed:", error);
    throw error; // Propagate error to context for logging
  }
};


