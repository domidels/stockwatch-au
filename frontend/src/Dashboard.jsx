import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import {
  fetchMarketSummary,
  fetchTopPerformers,
  fetchVolatilityAnalysis
} from './api';

export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [volatility, setVolatility] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, performersData, volatilityData] = await Promise.all([
        fetchMarketSummary(),
        fetchTopPerformers(),
        fetchVolatilityAnalysis()
      ]);

      setSummary(summaryData);
      setTopPerformers(performersData);
      setVolatility(volatilityData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading ASX data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={loadData}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">
            📊 StockWatch AU
          </h1>
          <p className="text-gray-600 mt-2">Australian Stock Market Analytics</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Stocks Tracked</p>
              <p className="text-3xl font-bold text-blue-600">
                {summary.unique_stocks}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Data Points</p>
              <p className="text-3xl font-bold text-indigo-600">
                {(summary.total_records / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Avg Price</p>
              <p className="text-3xl font-bold text-green-600">
                ${summary.avg_price}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Avg Volume</p>
              <p className="text-3xl font-bold text-purple-600">
                {(summary.avg_volume / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🏆 Top Performers
            </h2>
            {topPerformers.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topPerformers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ticker" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_price" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Volatility Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ⚡ Volatility Analysis
            </h2>
            {volatility.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={volatility}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ticker" />
                  <YAxis />
                  <Tooltip />
                  <Scatter name="Volatility" dataKey="volatility_std" fill="#ef4444" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Stocks</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Volatility
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topPerformers.slice(0, 5).map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {stock.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${stock.avg_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stock.volatility}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Volatile Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Most Volatile</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Volatility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {volatility.slice(0, 5).map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {stock.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {stock.volatility_std}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {stock.avg_daily_change}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>📈 Real-time Australian Stock Market Analytics</p>
          <p className="mt-2">
            Powered by Snowflake | Data from ASX | Hosted on AWS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
