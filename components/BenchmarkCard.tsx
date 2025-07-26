
import React, { useState } from 'react';
import { BenchmarkAverages } from '../types';

interface BenchmarkCardProps {
  yourScreenAverages: BenchmarkAverages | null;
  sp500Averages: BenchmarkAverages | null;
  isLoading: boolean;
}

type MetricKey = keyof BenchmarkAverages;

const BENCHMARK_METRICS_CONFIG: { key: MetricKey; label: string; higherIsBetter: boolean; format: 'percent' | 'number' | 'days' }[] = [
    { key: 'ownerEarningsYield', label: 'Owner-Earnings Yield', higherIsBetter: true, format: 'percent' },
    { key: 'revenueCAGR5yr', label: '5-yr Rev CAGR', higherIsBetter: true, format: 'percent' },
    { key: 'avgRotce5yr', label: '5-yr Avg ROE', higherIsBetter: true, format: 'percent' },
    { key: 'netCashToMarketCapRatio', label: 'Net-Cash / Mkt Cap', higherIsBetter: true, format: 'percent' },
    { key: 'rankMomentum63', label: 'Rank-Momentum (63d)', higherIsBetter: true, format: 'days' },
];

const formatValue = (value: number | 'N/A', format: 'percent' | 'number' | 'days'): string => {
    if (value === 'N/A') return 'N/A';
    if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (format === 'days') return `${value.toFixed(1)}d`;
    return value.toFixed(2);
};

export const getComparisonColorClass = (yourValue: number | 'N/A', spValue: number | 'N/A', higherIsBetter: boolean): string => {
    if (yourValue === 'N/A' || spValue === 'N/A') {
        return 'bg-gray-100 dark:bg-gray-700'; // Neutral
    }
    if (yourValue === spValue) {
        return 'bg-gray-100 dark:bg-gray-700'; // Neutral
    }
    const isBetter = higherIsBetter ? yourValue > spValue : yourValue < spValue;
    return isBetter ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
};


const BenchmarkCard: React.FC<BenchmarkCardProps> = ({ yourScreenAverages, sp500Averages, isLoading }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300">Metric</th>
            <th className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center">Your Screen Avg.</th>
            <th className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center">S&P 500 Avg.</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {BENCHMARK_METRICS_CONFIG.map(({ key, label, higherIsBetter, format }) => {
            const yourValue = yourScreenAverages ? yourScreenAverages[key] : 'N/A';
            const spValue = sp500Averages ? sp500Averages[key] : 'N/A';
            const colorClass = getComparisonColorClass(yourValue, spValue, higherIsBetter);

            return (
              <tr key={key}>
                <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                <td className={`px-4 py-2 text-center font-mono ${yourScreenAverages ? colorClass : ''}`}>
                    {yourScreenAverages ? formatValue(yourValue, format) : '...'}
                </td>
                <td className="px-4 py-2 text-center font-mono text-gray-600 dark:text-gray-400">
                    {isLoading ? '...' : formatValue(spValue, format)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 main-content-section p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
      {/* Title with tooltip */}
      <div 
        className="flex justify-between items-center mb-4 cursor-pointer sm:cursor-auto"
        onClick={() => setIsCollapsed(prev => !prev)}
        title="Benchmark = arithmetic mean of S&P 500 constituents (updated once per session)."
      >
        <h3 className="text-lg font-medium">
          Screen Benchmark vs. S&P 500
        </h3>
        <button className="sm:hidden text-gray-500 dark:text-gray-400">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Loading S&P 500 benchmark data...</p>}
      
      {/* Content: always render for desktop, conditionally for mobile */}
      {!isLoading && (
        <>
            <div className="hidden sm:block">
                {renderTable()}
            </div>
            {!isCollapsed && (
                <div className="sm:hidden">
                    {renderTable()}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default BenchmarkCard;
