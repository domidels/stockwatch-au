/**
 * api.js — data client for the StockWatch AU dashboard.
 *
 * The dashboard reads static JSON files pre-computed by the ingestion Lambda
 * (s3://<data bucket>/api/*.json), served by CloudFront under /api/. No Lambda
 * runs when a page loads, so there is no cold start.
 *
 * In production the files are same-origin. For local dev (`npm start`), set
 * REACT_APP_DATA_URL in frontend/.env.local to the site URL, e.g.
 * https://example.com.
 *
 * Each file is fetched once per page load; the exported functions keep the
 * signatures of the former Lambda-backed client and filter in the browser.
 */

import axios from 'axios';

const DATA_BASE_URL = process.env.REACT_APP_DATA_URL || '';

export const apiClient = axios.create({
  baseURL: `${DATA_BASE_URL}/api`,
  timeout: 30000
});

// Recursively convert object keys to lowercase (the payloads use uppercase column names).
const lowerKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(lowerKeys);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])
    );
  }
  return obj;
};

// One in-flight/finished request per file; failed requests are retried next call.
const fileCache = {};
const loadJson = (path) => {
  if (!fileCache[path]) {
    fileCache[path] = apiClient.get(path)
      .then(response => response.data)
      .catch(error => {
        delete fileCache[path];
        throw error;
      });
  }
  return fileCache[path];
};

const periodKey = (days) => (days ? String(days) : 'all');

// Same cut-off as the former API: today (UTC) minus `days`, compared as YYYY-MM-DD.
const cutoffDate = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export const fetchMarketSummary = async () => {
  try {
    const data = await loadJson('/summary.json');
    return lowerKeys(data.data || data);
  } catch (error) {
    console.error('Error fetching market summary:', error);
    throw error;
  }
};

export const fetchTopPerformers = async (days = null) => {
  try {
    const data = await loadJson('/overview.json');
    return lowerKeys(data.periods[periodKey(days)]?.top_performers || []);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    throw error;
  }
};

export const fetchVolatilityAnalysis = async (days = null) => {
  try {
    const data = await loadJson('/overview.json');
    return lowerKeys(data.periods[periodKey(days)]?.volatility || []);
  } catch (error) {
    console.error('Error fetching volatility analysis:', error);
    throw error;
  }
};

export const fetchStockHistory = async (ticker, days = null) => {
  try {
    const data = await loadJson(`/history/${encodeURIComponent(ticker)}.json`);
    const rows = data.data || [];
    if (!days) return rows;
    const cutoff = cutoffDate(days);
    return rows.filter(r => r.date >= cutoff);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    throw error;
  }
};

export const fetchMonthlyReturns = async () => {
  try {
    const data = await loadJson('/heatmap.json');
    return lowerKeys(data.data || []);
  } catch (error) {
    console.error('Error fetching monthly returns:', error);
    throw error;
  }
};

export const fetchPCA = async () => {
  try {
    // camelCase keys generated in Python — no key normalisation needed.
    return await loadJson('/pca.json');
  } catch (error) {
    console.error('Error fetching PCA analysis:', error);
    throw error;
  }
};

export default apiClient;
