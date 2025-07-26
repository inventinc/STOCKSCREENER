
import React from 'react';
import { Stock, KeyMetricVisibility, ActiveFilters } from '../types';
import StockCard from './StockCard';
import StockTable from './StockTable';
import StockSearch from './StockSearch';
import ActiveFiltersDisplay from './ActiveFiltersDisplay';
import LoadingIndicator from './LoadingIndicator';

interface StocksSectionProps {
  stocksToDisplay: Stock[];
  currentView: 'card' | 'table';
  onSetView: (view: 'card' | 'table') => void;
  keyMetricsVisibility: KeyMetricVisibility;
  onStockClick: (stock: Stock) => void;
  isLoadingMore: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: ActiveFilters;
  onRemoveFilter: (group: string) => void;
  hasMoreStocksToLoad: boolean;
  watchlist: string[]; // New
  onToggleWatchlist: (symbol: string) => void; // New
}

const StocksSection: React.FC<StocksSectionProps> = ({
  stocksToDisplay,
  currentView,
  onSetView,
  keyMetricsVisibility,
  onStockClick,
  isLoadingMore,
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onRemoveFilter,
  hasMoreStocksToLoad,
  watchlist,
  onToggleWatchlist
}) => {
  const commonButtonStyles = "px-4 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1";
  const activeButtonStyles = "bg-blue-600 text-white hover:bg-blue-700";
  const inactiveButtonStyles = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-500 dark:hover:text-gray-200";

  const noStocksMatchFilters = stocksToDisplay.length === 0 && !isLoadingMore;

  return (
    <section className="bg-white main-content-section p-4 sm:p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 stocks-header-mobile-layout">
        <h3 className="text-lg font-medium mb-2 sm:mb-0">Stocks</h3>
        <div className="flex space-x-2 self-center sm:self-auto">
          <button 
            onClick={() => onSetView('card')}
            className={`${commonButtonStyles} ${currentView === 'card' ? activeButtonStyles : inactiveButtonStyles}`}
            aria-pressed={currentView === 'card'}
          >
            Card View
          </button>
          <button 
            onClick={() => onSetView('table')}
            className={`${commonButtonStyles} ${currentView === 'table' ? activeButtonStyles : inactiveButtonStyles}`}
            aria-pressed={currentView === 'table'}
          >
            Table View
          </button>
        </div>
      </div>

      <div className="mb-6">
        <StockSearch searchTerm={searchTerm} onSearchTermChange={onSearchTermChange} />
        <ActiveFiltersDisplay activeFilters={activeFilters} onRemoveFilter={onRemoveFilter} />
      </div>

      {currentView === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocksToDisplay.map(stock => (
            <StockCard 
                key={stock.id} 
                stock={stock} 
                keyMetricsVisibility={keyMetricsVisibility} 
                onCardClick={onStockClick}
                watchlist={watchlist}
                onToggleWatchlist={onToggleWatchlist}
            />
          ))}
          {noStocksMatchFilters && (
            <p className="col-span-full text-center py-8 text-gray-600 dark:text-gray-400">
              No stocks match the current filters. Try adjusting your criteria.
            </p>
          )}
        </div>
      ) : (
        <>
          <StockTable 
            stocks={stocksToDisplay} 
            keyMetricsVisibility={keyMetricsVisibility} 
            onRowClick={onStockClick}
            watchlist={watchlist}
            onToggleWatchlist={onToggleWatchlist}
          />
          {noStocksMatchFilters && (
             <p className="col-span-full text-center py-8 text-gray-600 dark:text-gray-400">
              No stocks match the current filters. Try adjusting your criteria.
            </p>
          )}
        </>
      )}

      {isLoadingMore && <LoadingIndicator />}
      {!isLoadingMore && stocksToDisplay.length > 0 && !hasMoreStocksToLoad && (
        <p className="text-center py-4 text-gray-500 dark:text-gray-400">End of results.</p>
      )}
    </section>
  );
};

export default StocksSection;
