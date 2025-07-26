
import React, { useEffect, useState } from 'react';
import { Stock, WatchlistExtra } from '../types';
import { CloseIcon } from './icons';
import { getSimpleScoreColor } from '../services/stockService';
import { NA_STRING } from '../constants'; 
import { fetchWatchlistExtras } from '../services/stockService';

interface WatchlistPaneProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistSymbols: string[];
  allStocks: Stock[]; // Used to get basic stock info if needed, but extras are fetched separately
  onStockClick: (stock: Stock) => void;
  onToggleWatchlist: (symbol: string) => void;
}

interface ExtraDataState {
  data?: WatchlistExtra;
  isLoading: boolean;
  error?: string;
}

const WatchlistPane: React.FC<WatchlistPaneProps> = ({ 
    isOpen, 
    onClose, 
    watchlistSymbols, 
    allStocks, 
    onStockClick, 
    onToggleWatchlist 
}) => {
  const [extras, setExtras] = useState<Record<string, ExtraDataState>>({});

  useEffect(() => {
    if (isOpen && watchlistSymbols.length > 0) {
      const symbolsToFetch: string[] = [];
      const newExtrasState: Record<string, ExtraDataState> = { ...extras };

      watchlistSymbols.forEach(symbol => {
        if (!extras[symbol] || extras[symbol].error) { // Fetch if not present or errored previously
          symbolsToFetch.push(symbol);
          newExtrasState[symbol] = { ...newExtrasState[symbol], isLoading: true, error: undefined };
        }
      });
      
      if (Object.keys(newExtrasState).some(key => newExtrasState[key].isLoading)) {
        setExtras(newExtrasState); // Update UI to show loading for relevant symbols
      }

      if (symbolsToFetch.length > 0) {
        fetchWatchlistExtras(symbolsToFetch)
          .then(fetchedDataArray => {
            setExtras(prevExtras => {
              const updatedExtras = { ...prevExtras };
              fetchedDataArray.forEach(data => {
                updatedExtras[data.symbol] = { data, isLoading: false };
              });
              // For symbols that were in symbolsToFetch but not in fetchedDataArray (e.g., API error for specific symbol, though fetchWatchlistExtras tries to return all)
              symbolsToFetch.forEach(symbol => {
                if (!fetchedDataArray.find(d => d.symbol === symbol) && updatedExtras[symbol]?.isLoading) {
                     updatedExtras[symbol] = { ...updatedExtras[symbol], isLoading: false, error: "Failed to fetch details."}; // Generic error if not returned
                }
              });
              return updatedExtras;
            });
          })
          .catch(error => {
            console.error("Error fetching watchlist extras:", error);
            setExtras(prevExtras => {
              const erroredExtras = { ...prevExtras };
              symbolsToFetch.forEach(symbol => {
                erroredExtras[symbol] = { isLoading: false, error: "Network Error" };
              });
              return erroredExtras;
            });
          });
      }
    } else if (!isOpen) {
        // Optionally clear extras when pane is closed to re-fetch fresh data next time
        // setExtras({}); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, watchlistSymbols]); // Removed 'extras' from deps to avoid re-triggering on its own update

  const watchlistStocks = watchlistSymbols.map(symbol => 
    allStocks.find(stock => stock.symbol === symbol)
  ).filter(stock => stock !== undefined) as Stock[];

  return (
    <div 
        className={`fixed inset-0 bg-gray-800 bg-opacity-75 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl p-4 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">★ My Watchlist</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none p-1 rounded-full"
            aria-label="Close watchlist"
          >
            <CloseIcon className="w-5 h-5"/>
          </button>
        </div>

        {watchlistStocks.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Your watchlist is empty. Star stocks to add them here.</p>
        )}

        <ul className="space-y-1 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
          {watchlistStocks.map(stock => {
            const extraInfo = extras[stock.symbol];
            let priceChangeDisplay: React.ReactNode = NA_STRING;
            if (extraInfo?.isLoading) {
              priceChangeDisplay = <span className="text-xs text-gray-400 dark:text-gray-500">Loading...</span>;
            } else if (extraInfo?.error) {
              priceChangeDisplay = <span className="text-xs text-red-500" title={extraInfo.error}>Error</span>;
            } else if (extraInfo?.data?.priceChangePct !== undefined && extraInfo.data.priceChangePct !== null) {
              const pct = extraInfo.data.priceChangePct;
              const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
              priceChangeDisplay = <span className={`font-medium ${colorClass}`}>{(pct >= 0 ? '+' : '') + pct.toFixed(2)}%</span>;
            }

            let nextEarningsDisplay: React.ReactNode = NA_STRING;
            if (extraInfo?.isLoading) {
                nextEarningsDisplay = <span className="text-xs text-gray-400 dark:text-gray-500">Loading...</span>;
            } else if (extraInfo?.error) {
                nextEarningsDisplay = <span className="text-xs text-red-500" title={extraInfo.error}>Error</span>;
            } else if (extraInfo?.data?.nextEarnings) {
                nextEarningsDisplay = extraInfo.data.nextEarnings === '—' ? NA_STRING : extraInfo.data.nextEarnings;
            }


            return (
            <li 
              key={stock.symbol} 
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
              onClick={() => { onStockClick(stock); onClose();}}
              title={`View details for ${stock.name} (${stock.symbol})`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-grow min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{stock.symbol}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] sm:max-w-[220px]">{stock.name}</p>
                </div>
                <div className="flex items-center space-x-3 text-xs sm:text-sm flex-shrink-0 ml-2">
                    {stock.price && <span className="font-semibold text-gray-700 dark:text-gray-300">${stock.price.toFixed(2)}</span>}
                    {stock.simpleScore !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-full ${getSimpleScoreColor(stock.simpleScore)} text-xs`}>{stock.simpleScore}</span>
                    )}
                </div>
              </div>
              <div className="mt-1.5 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-start">
                    <span className="text-gray-500 dark:text-gray-500">1D %Chg:</span>
                    {priceChangeDisplay}
                </div>
                <div className="flex flex-col items-start mx-2">
                    <span className="text-gray-500 dark:text-gray-500">Next Earnings:</span>
                    {nextEarningsDisplay}
                </div>
                <button 
                    onClick={(e) => {e.stopPropagation(); onToggleWatchlist(stock.symbol);}}
                    className="text-yellow-500 hover:text-yellow-400 text-xl opacity-75 group-hover:opacity-100 focus:outline-none self-center"
                    title="Remove from watchlist"
                    aria-label={`Remove ${stock.symbol} from watchlist`}
                >
                    ★
                </button>
              </div>
            </li>
          )})}
        </ul>
      </div>
    </div>
  );
};

export default WatchlistPane;
