

import React, { useState, useMemo } from 'react';
import { Stock, KeyMetricVisibility, DisplayMetricConfig, SortConfig } from '../types';
import { DISPLAY_METRICS_CONFIG, NA_STRING } from '../constants';
import { getTextSimpleScoreColor } from '../services/stockService';

interface StockTableProps {
  stocks: Stock[];
  keyMetricsVisibility: KeyMetricVisibility;
  onRowClick: (stock: Stock) => void;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

const StockTable: React.FC<StockTableProps> = ({ stocks, keyMetricsVisibility, onRowClick, watchlist, onToggleWatchlist }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const headersFromConfig = DISPLAY_METRICS_CONFIG.filter(
    dm => dm.type === 'individual' && (dm.alwaysVisible || keyMetricsVisibility[dm.id as keyof KeyMetricVisibility])
  );
  
  const tableHeaders = [{id: 'watchlistStar', label:'★', alwaysVisible: true, type: 'custom', sortable: false} as const, ...headersFromConfig];

  const sortedStocks = useMemo(() => {
    let sortableItems = [...stocks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = sortConfig.key === 'simpleScore' ? a.simpleScore : a[sortConfig.key as keyof Stock];
        const valB = sortConfig.key === 'simpleScore' ? b.simpleScore : b[sortConfig.key as keyof Stock];

        if (valA === null || valA === undefined || valA === NA_STRING) return 1; // Nulls/NA last
        if (valB === null || valB === undefined || valB === NA_STRING) return -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          // Attempt to parse numbers if they are formatted strings like "$10.00" or "15.0x"
          const numA = parseFloat(valA.replace(/[^0-9.-]+/g, ""));
          const numB = parseFloat(valB.replace(/[^0-9.-]+/g, ""));

          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          }
          // Fallback to string comparison if parsing fails or not applicable
          return valA.localeCompare(valB) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        
        // For rankMomentum63, ensure we are comparing numbers even if formatter returns node
        if (sortConfig.key === 'rankMomentum63') {
            const numA = typeof valA === 'number' ? valA : -Infinity; // Treat non-numbers as lowest for sorting
            const numB = typeof valB === 'number' ? valB : -Infinity;
            if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }


        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stocks, sortConfig]);

  const requestSort = (key: keyof Stock | 'simpleScore') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Stock | 'simpleScore' | 'watchlistStar') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  if (stocks.length === 0) {
    return <p className="text-center py-8 text-gray-600 dark:text-gray-400">No stocks match the current filters.</p>;
  }
  
  const getPeColorClass = (peRatio?: number | null): string => {
    if (peRatio === null || peRatio === undefined || peRatio <= 0) return '';
    if (peRatio < 15) return 'text-green-600 dark:text-green-400';
    if (peRatio > 25) return 'text-red-600 dark:text-red-400';
    return '';
  };

  return (
    <div className="table-container">
      <table className="min-w-full stock-table">
        <thead>
          <tr>
            {tableHeaders.map(header => (
              <th 
                key={header.id} 
                className={`py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider ${header.id === 'watchlistStar' ? 'w-10 text-center' : ''} ${header.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
                onClick={() => header.sortable && requestSort(header.dataKey || header.id as any)}
              >
                {header.label}
                {header.sortable && getSortIndicator(header.dataKey || header.id as any)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedStocks.map(stock => {
            const isWatchlisted = watchlist.includes(stock.symbol);
            const handleStarClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                onToggleWatchlist(stock.symbol);
            };

            return (
            <tr 
                key={stock.id} 
                className="hover:bg-gray-100 dark:hover:bg-gray-700" 
                onClick={() => onRowClick(stock)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRowClick(stock)}
            >
              {tableHeaders.map(currentHeader => {
                let cellClass = "py-2 px-2 text-sm";
                
                if (currentHeader.id === 'watchlistStar') {
                    return (
                        <td key={`${stock.id}-star`} className={`${cellClass} text-center`}>
                            <button 
                                onClick={handleStarClick}
                                className={`p-1 text-lg rounded-full focus:outline-none ${
                                  isWatchlisted 
                                    ? 'text-yellow-500 hover:text-yellow-400' 
                                    : 'text-gray-400 hover:text-yellow-400 dark:text-gray-500 dark:hover:text-yellow-300'
                                }`}
                                aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                                title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                            >
                                {isWatchlisted ? '★' : '☆'}
                            </button>
                        </td>
                    );
                }

                const headerConfig = currentHeader as DisplayMetricConfig; // It's DisplayMetricConfig for others
                const dataKey = headerConfig.dataKey!; 
                const rawValue = stock[dataKey];
                let cellContent: string | React.ReactNode = headerConfig.formatter ? headerConfig.formatter(rawValue, stock) : (rawValue ?? NA_STRING);
                
                if (headerConfig.id === 'symbol') {
                    cellClass += " font-semibold";
                    cellContent = (
                        <div className="flex items-center">
                            <span>{rawValue}</span>
                            {stock.hasCatalyst && <span className="ml-1 text-yellow-500" title="Confirmed special-situation catalyst (e.g., spin-off).">⭐</span>}
                        </div>
                    );
                }
                
                if (headerConfig.id === 'price') {
                    cellClass += ` text-gray-800 dark:text-gray-200 font-semibold`;
                }
                if (headerConfig.id === 'simpleScore') {
                    cellClass += ` ${getTextSimpleScoreColor(stock.simpleScore)}`;
                }
                if (headerConfig.dataKey === 'peRatioTTM') { 
                    cellClass += ` ${getPeColorClass(stock.peRatioTTM)}`;
                }
                if (headerConfig.id === 'rankMomentum63') {
                   const momentum = stock.rankMomentum63;
                   if (momentum !== undefined && momentum !== null && momentum !== 0) {
                       cellClass += momentum > 0 ? ' text-green-500' : ' text-red-500';
                   }
                }
                
                let nameSuffix = '';
                if (headerConfig.id === 'name' && stock.styleTags?.includes('highPE')) {
                    nameSuffix = ` <span class="ml-1 text-xs bg-orange-100 text-orange-700 px-1 rounded-full dark:bg-orange-700 dark:text-orange-100">High P/E</span>`;
                }
                if (headerConfig.id === 'name' && stock.styleTags?.includes(' profitableTTM')) {
                     nameSuffix += ` <span class="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded-full dark:bg-green-700 dark:text-green-100">Profitable</span>`;
                }
                 // If the cell content is already a ReactNode (e.g. from formatter), don't wrap it in span/dangerouslySetInnerHTML
                const contentToRender = typeof cellContent === 'string' && nameSuffix 
                                        ? <span dangerouslySetInnerHTML={{ __html: `${cellContent}${nameSuffix}` }} />
                                        : cellContent;


                return (
                  <td key={`${stock.id}-${headerConfig.id}`} className={cellClass}>
                    {contentToRender}
                  </td>
                );
              })}
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

export default StockTable;