

import React from 'react';
import { Stock, KeyMetricVisibility, StyleTag, KeyMetricVisibility as KeyMetricVisibilityType } from '../types'; // Combined KeyMetricVisibility import
import { DISPLAY_METRICS_CONFIG, NA_STRING } from '../constants'; // Added NA_STRING
import { getSimpleScoreColor, getTextSimpleScoreColor } from '../services/stockService'; 

interface StockCardProps {
  stock: Stock;
  keyMetricsVisibility: KeyMetricVisibility;
  onCardClick: (stock: Stock) => void;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, keyMetricsVisibility, onCardClick, watchlist, onToggleWatchlist }) => {
  const scoreClass = getSimpleScoreColor(stock.simpleScore);
  const priceAndScoreColor = getTextSimpleScoreColor(stock.simpleScore);

  const individualMetricsToShow = DISPLAY_METRICS_CONFIG.filter(
    dm => dm.type === 'individual' && 
          dm.dataKey &&
          !dm.alwaysVisible && 
          keyMetricsVisibility[dm.id as keyof KeyMetricVisibilityType] &&
          dm.id !== 'rankMomentum63' // Exclude rankMomentum63 from here, display it separately
  );

  const isWatchlisted = watchlist.includes(stock.symbol);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when star is clicked
    onToggleWatchlist(stock.symbol);
  };
  
  const renderMomentumArrow = (momentum?: number) => {
    if (momentum === undefined || momentum === null || momentum === 0) return null;
    const arrow = momentum > 0 ? '▲' : '▼';
    const colorClass = momentum > 0 ? 'text-green-500' : 'text-red-500';
    return <span className={`ml-1 text-xs ${colorClass}`}>{arrow}</span>;
  };

  const renderStyleTags = (tags?: StyleTag[]) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1 mb-2">
        {tags.map(tag => {
          let bgColor = 'bg-gray-200 dark:bg-gray-700';
          let textColor = 'text-gray-700 dark:text-gray-200';
          if (tag === 'highPE') {
            bgColor = 'bg-orange-100 dark:bg-orange-700';
            textColor = 'text-orange-700 dark:text-orange-100';
          } else if (tag === ' profitableTTM') {
            bgColor = 'bg-green-100 dark:bg-green-700';
            textColor = 'text-green-700 dark:text-green-100';
          }
          return (
            <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full ${bgColor} ${textColor}`}>
              {tag === 'highPE' ? 'High P/E' : tag === ' profitableTTM' ? 'Profitable (TTM)' : tag}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="stock-card" onClick={() => onCardClick(stock)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCardClick(stock)}>
      <div className="flex justify-between items-start mb-1">
        <div className="text-xl font-bold text-gray-900 flex items-center">
          <span>{stock.symbol}</span>
          {stock.hasCatalyst && <span className="ml-1 text-yellow-500" title="Confirmed special-situation catalyst (e.g., spin-off).">⭐</span>}
        </div>
        <div className="flex flex-col items-end">
            {keyMetricsVisibility.price && (
              <div className={`text-lg font-semibold ${priceAndScoreColor}`}>
                ${stock.price ? stock.price.toFixed(2) : 'N/A'}
              </div>
            )}
            {keyMetricsVisibility.simpleScore && 
                <div className="flex items-center">
                    <span className={`mt-1 score-badge flex items-center justify-center rounded-full text-sm ${scoreClass} w-8 h-8`}>
                        {stock.simpleScore ?? NA_STRING}
                    </span>
                    {keyMetricsVisibility.rankMomentum63 && renderMomentumArrow(stock.rankMomentum63)}
                </div>
            }
        </div>
      </div>
      <div className="flex justify-between items-baseline">
        <p className="text-gray-600 mb-1 text-sm truncate" title={stock.name}>{stock.name}</p>
        <button 
            onClick={handleStarClick} 
            className={`p-1 rounded-full text-xl focus:outline-none ${
              isWatchlisted 
                ? 'text-yellow-500 hover:text-yellow-400' 
                : 'text-gray-400 hover:text-yellow-400 dark:text-gray-500 dark:hover:text-yellow-300'
            }`}
            aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
            title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
        >
            {isWatchlisted ? '★' : '☆'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">{stock.sector}</p>
      {renderStyleTags(stock.styleTags)}
      
      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
        {individualMetricsToShow.map(metric => {
           if (!metric.dataKey || metric.id === 'simpleScore') return null;
           
           const rawStockValue = stock[metric.dataKey as keyof Stock];
           let displayValue: string | React.ReactNode;

           if (metric.formatter) {
             displayValue = metric.formatter(rawStockValue, stock);
           } else if (typeof rawStockValue === 'number') {
             displayValue = rawStockValue.toString();
           } else if (typeof rawStockValue === 'string') {
             displayValue = rawStockValue;
           } else if (rawStockValue === null || rawStockValue === undefined) {
             displayValue = "N/A";
           } else {
             // Handles bigint and any other types by converting to string
             displayValue = String(rawStockValue);
           }
           
           return (
            <div key={metric.id} className="flex flex-col">
              <span className="text-gray-500 text-xs">{metric.label}</span>
              <span className="font-medium text-gray-800 text-sm">{displayValue}</span>
            </div>
           );
        })}
      </div>
    </div>
  );
};

export default StockCard;