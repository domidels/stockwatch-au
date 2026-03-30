import axios from 'axios';

// Configure API endpoint from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.ap-southeast-2.amazonaws.com/dev';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
});

// API Methods
export const fetchMarketSummary = async () => {
  try {
    const response = await apiClient.get('/data/summary');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching market summary:', error);
    throw error;
  }
};

export const fetchTopPerformers = async () => {
  try {
    const response = await apiClient.get('/data/top_performers');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw error;
  }
};

export const fetchVolatilityAnalysis = async () => {
  try {
    const response = await apiClient.get('/data/volatility');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching volatility analysis:', error);
    throw error;
  }
};

export default apiClient;
