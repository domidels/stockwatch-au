/**
 * api.js — HTTP client for the StockWatch AU API Gateway.
 *
 * The base URL is injected at build time via the REACT_APP_API_URL
 * environment variable (frontend/.env.local for local dev, or as a
 * GitHub Actions secret for CI/CD deployments).
 *
 * All exported functions normalise Snowflake's uppercase column names
 * to lowercase before returning data to components.
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Recursively convert object keys to lowercase to normalise Snowflake responses.
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

export const fetchTopPerformers = async (days = null) => {
  try {
    const params = days ? `?days=${days}` : '';
    const response = await apiClient.get(`/data/top_performers${params}`);
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw error;
  }
};

export const fetchVolatilityAnalysis = async (days = null) => {
  try {
    const params = days ? `?days=${days}` : '';
    const response = await apiClient.get(`/data/volatility${params}`);
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching volatility analysis:', error);
    throw error;
  }
};

export const fetchStockHistory = async (ticker, days = null) => {
  try {
    const params = days ? `&days=${days}` : '';
    const response = await apiClient.get(`/data/history?ticker=${ticker}${params}`);
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    throw error;
  }
};


export const fetchMonthlyReturns = async () => {
  try {
    const response = await apiClient.get('/data/heatmap');
    return lowerKeys(response.data.data || []);
  } catch (error) {
    console.error('Error fetching monthly returns:', error);
    throw error;
  }
};

export default apiClient;
