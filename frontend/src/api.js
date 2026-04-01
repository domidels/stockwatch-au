import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.ap-southeast-2.amazonaws.com/dev';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Snowflake returns column names in UPPERCASE — normalise to lowercase
const lowerKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(lowerKeys);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])
    );
  }
  return obj;
};

export const fetchMarketSummary = async () => {
  try {
    const response = await apiClient.get('/data/summary');
    return lowerKeys(response.data.data || response.data);
  } catch (error) {
    console.error('Error fetching market summary:', error);
    throw error;
  }
};

export const fetchTopPerformers = async () => {
  try {
    const response = await apiClient.get('/data/top_performers');
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw error;
  }
};

export const fetchVolatilityAnalysis = async () => {
  try {
    const response = await apiClient.get('/data/volatility');
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching volatility analysis:', error);
    throw error;
  }
};

export const fetchStockHistory = async (ticker) => {
  try {
    const response = await apiClient.get(`/data/history?ticker=${ticker}`);
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    throw error;
  }
};

export default apiClient;
