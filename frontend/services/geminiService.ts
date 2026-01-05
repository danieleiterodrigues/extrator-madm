
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || ''; // Relative path for production

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes timeout
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
    if (error.response) {
       console.error("Details:", error.response.data);
    }
    return null;
  }
};


