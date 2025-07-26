

console.log("[index.tsx] Module execution started."); // Diagnostic log

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
// Import types
import { Theme, Stock, StockDetails, ActiveFilters, KeyMetricVisibility, SortConfig, ToastMessage, SimpleFilterValues, BenchmarkAverages } from './types'; // Added SortConfig, ToastMessage, SimpleFilterValues, BenchmarkAverages
// Import constants
import { STOCKS_PER_PAGE, INITIAL_KEY_METRICS_VISIBILITY, DISPLAY_METRICS_CONFIG, INITIAL_STOCK_LOAD_COUNT, NA_STRING, PRESETS } from './constants'; // Added NA_STRING and PRESETS
// Import services
import { fetchStockListFromFMP, fetchStockDetailsFromFMP, FMPApiError, calculateSP500Averages } from './services/stockService'; // Added calculateSP500Averages
// Import components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import KeyMetricsSection from './components/KeyMetricsSection';
import StocksSection from './components/StocksSection';
import { FilterIcon } from './components/icons';
import CustomizeMetricsModal from './components/CustomizeMetricsModal';
import StockDetailsModal from './components/StockDetailsModal';
import PresetWizardModal from './components/PresetWizardModal'; 
import WatchlistPane from './components/WatchlistPane'; 
import UndoResetBar from './components/UndoResetBar'; 
import ToastContainer from './components/ToastContainer'; // Added for Sprint 2
import BenchmarkCard from './components/BenchmarkCard'; // Added for Sprint 3-B
// Import hooks
import { useStockAlerts } from './hooks/useAlerts'; // Added for Sprint 2
import { useSimpleFilters } from './hooks/useSimpleFilters';


const MAX_UNDO_HISTORY = 3; // For 3-step undo

const App: React.FC = () => {
  console.log("[App component] Initializing."); // Diagnostic log
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [stocksToDisplay, setStocksToDisplay] = useState<Stock[]>([]);
  
  // --- Filter States ---
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('screenerSimpleMode');
    return saved ? JSON.parse(saved) : true; // Default to Simple Mode ON
  });
  const [simpleFilterValues, setSimpleFilterValues] = useState<SimpleFilterValues>({
    size: 50, value: 50, quality: 50,
  });
  const advancedFiltersFromSimple = useSimpleFilters(simpleFilterValues);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentView, setCurrentView] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  const [isCustomizeMetricsModalOpen, setIsCustomizeMetricsModalOpen] = useState<boolean>(false);
  const [isStockDetailsModalOpen, setIsStockDetailsModalOpen] = useState<boolean>(false);
  const [selectedStockDetails, setSelectedStockDetails] = useState<StockDetails | null>(null);
  const [isLoadingStockDetails, setIsLoadingStockDetails] = useState<boolean>(false);
  const [stockDetailsError, setStockDetailsError] = useState<string | null>(null);
  const [keyMetricsVisibility, setKeyMetricsVisibility] = useState<KeyMetricVisibility>(INITIAL_KEY_METRICS_VISIBILITY);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const [isPresetWizardOpen, setIsPresetWizardOpen] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isWatchlistPaneOpen, setIsWatchlistPaneOpen] = useState<boolean>(false);

  // Undo/Reset State
  const [historyStack, setHistoryStack] = useState<Array<{ filters: ActiveFilters; search: string }>>([]);

  // Sprint 2: Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Sprint 3-B: Benchmark Card State
  const [sp500Averages, setSp500Averages] = useState<BenchmarkAverages | null>(null);
  const [isSp500Loading, setIsSp500Loading] = useState<boolean>(false);


  // Toast management functions
  const addToast = useCallback((message: string, type: ToastMessage['type'], sessionStorageKey?: string) => {
    // Prevent exact duplicate active toasts (same message and type)
    if (toasts.some(t => t.message === message && t.type === type)) return;

    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      message,
      type,
      sessionStorageKey, // Store this to be used on dismiss
      duration: 7000, // Default 7 seconds
    };
    setToasts(prevToasts => [newToast, ...prevToasts]);
  }, [toasts]); // Add toasts to dependency array if it might change rapidly


  const removeToastAndStoreDismissal = useCallback((toastId: string, storageKey?: string) => {
    if (storageKey && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch (e) {
        console.warn("Could not set sessionStorage item for toast dismissal:", e);
      }
    }
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== toastId));
  }, []);

  // Initialize stock alerts hook
  useStockAlerts(allStocks, addToast);


  useEffect(() => {
    const savedWatchlist = localStorage.getItem('stockScreenerWatchlist');
    if (savedWatchlist) {
      try {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        if (Array.isArray(parsedWatchlist)) {
            setWatchlist(parsedWatchlist.filter(item => typeof item === 'string'));
        }
      } catch (e) { console.error("Error parsing watchlist from localStorage", e); setWatchlist([]); }
    }
  }, []);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const newWatchlist = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      localStorage.setItem('stockScreenerWatchlist', JSON.stringify(newWatchlist));
      return newWatchlist;
    });
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Persist Simple Mode choice
  useEffect(() => {
    localStorage.setItem('screenerSimpleMode', JSON.stringify(isSimpleMode));
  }, [isSimpleMode]);

  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  const loadInitialStocks = useCallback(async () => {
    setIsInitialLoading(true); setError(null);
    try {
      const stocks = await fetchStockListFromFMP();
      setAllStocks(stocks);
    } catch (err: any) {
      console.error("Failed to load initial stocks:", err);
      if (err instanceof FMPApiError) setError(err.message);
      else setError("An unexpected error occurred while fetching stocks.");
    } finally { setIsInitialLoading(false); }
  }, []);

  // Fetch S&P 500 averages once per session
  useEffect(() => {
    const fetchSP500Data = async () => {
        const cachedData = sessionStorage.getItem('sp500Averages');
        if (cachedData) {
            setSp500Averages(JSON.parse(cachedData));
            return;
        }
        setIsSp500Loading(true);
        try {
            const averages = await calculateSP500Averages();
            setSp500Averages(averages);
            sessionStorage.setItem('sp500Averages', JSON.stringify(averages));
        } catch (e) {
            console.error("Failed to calculate S&P 500 averages:", e);
            // Optionally set an error state for the benchmark card
        } finally {
            setIsSp500Loading(false);
        }
    };
    fetchSP500Data();
  }, []);
  
  useEffect(() => {
    if (window.location.protocol !== 'blob:') { 
        const params = new URLSearchParams(window.location.search);
        let filtersFromUrl: ActiveFilters = {};
        try {
            const filtersParam = params.get('filters');
            if (filtersParam) filtersFromUrl = JSON.parse(decodeURIComponent(filtersParam));
        } catch (e) { console.error("Error parsing filters from URL", e); }
        
        // Check for specific boolean-like filters from URL
        if(params.get('catalystOnly') === 'true') filtersFromUrl.catalystOnly = 'true';
        if(params.get('excludeRegSho') === 'true') filtersFromUrl.excludeRegSho = 'true';

        setActiveFilters(filtersFromUrl);
        
        const searchParam = params.get('search');
        if (searchParam) { setSearchTerm(decodeURIComponent(searchParam)); }
    }
    loadInitialStocks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadInitialStocks]); 

  // Side effect to update URL when filters or search term change
  useEffect(() => {
    if (window.location.protocol === 'blob:') return;
    const filtersToStore = isSimpleMode ? {} : activeFilters;
    const params = new URLSearchParams();
  
    if (Object.keys(filtersToStore).length > 0) {
      // Separate boolean-like quick filters for cleaner URLs
      const advancedFilters: ActiveFilters = { ...filtersToStore };
      if (advancedFilters.catalystOnly) {
          params.set('catalystOnly', 'true');
          delete advancedFilters.catalystOnly;
      }
      if (advancedFilters.excludeRegSho) {
          params.set('excludeRegSho', 'true');
          delete advancedFilters.excludeRegSho;
      }
      
      if (Object.keys(advancedFilters).length > 0) {
        params.set('filters', encodeURIComponent(JSON.stringify(advancedFilters)));
      }
    }
    if (searchTerm.trim() !== '') {
      params.set('search', encodeURIComponent(searchTerm));
    }
  
    const pathname = window.location.pathname || '/';
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    try {
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      console.error("[App component] Error calling window.history.replaceState:", e);
    }
  }, [activeFilters, searchTerm, isSimpleMode]);


  const applyFiltersAndSearch = useCallback((filtersToUse: ActiveFilters) => {
    let tempStocks = [...allStocks];
    
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempStocks = tempStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(lowerSearchTerm) ||
        stock.name.toLowerCase().includes(lowerSearchTerm) ||
        (stock.sector && stock.sector.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    Object.entries(filtersToUse).forEach(([filterKey, filterValue]) => {
      if (!filterValue || filterValue === 'false') return;

      tempStocks = tempStocks.filter(stock => {
        if (filterKey === 'marketCap') return stock.marketCapCategory === filterValue;
        if (filterKey === 'volume') return stock.volumeCategory === filterValue;
        if (filterKey === 'debtEquityRatio') return stock.debtCategory === filterValue;
        if (filterKey === 'peRatio') return stock.valuationCategory === filterValue;
        if (filterKey === 'roe') return stock.rotceCategory === filterValue;
        
        if (filterKey === 'debtToEbitda') {
          const val = stock.debtToEbitdaTTM; if (val === null || val === undefined) return false;
          if (filterValue === 'le1x') return val <= 1; if (filterValue === 'le0.5x') return val <= 0.5; if (filterValue === 'le0.25x') return val <= 0.25; return false; 
        }
        if (filterKey === 'fcfToNetIncome') {
          const val = stock.fcfNiRatioTTM; if (val === null || val === undefined) return false;
          if (filterValue === 'ge0.8') return val >= 0.8; if (filterValue === 'ge1.0') return val >= 1.0; if (filterValue === 'ge1.2') return val >= 1.2; return false; 
        }
        if (filterKey === 'evToEbit') { 
          const val = stock.enterpriseValueOverEBITDATTM; if (val === null || val === undefined) return false;
          if (filterValue === 'le6x') return val <= 6; if (filterValue === 'le8x') return val <= 8; if (filterValue === 'le10x') return val <= 10; return false; 
        }
        if (filterKey === 'shareCountChange') { 
            const val = stock.shareCountCAGR3yr; if (val === null || val === undefined) return false;
            if (filterValue === 'reduction_large') return val <= -0.05; if (filterValue === 'reduction_small') return val < 0 && val > -0.05;
            if (filterValue === 'flat') return val >= -0.005 && val <= 0.005; if (filterValue === 'increasing') return val > 0.005; return false;
        }
        if (filterKey === 'priceToNCAV') {
            const val = stock.pncaRatio; if (val === null || val === undefined) return false;
            if (filterValue === 'le0.5') return val <= 0.5; if (filterValue === 'le0.8') return val <= 0.8; if (filterValue === 'le1.0') return val <= 1.0; return false;
        }
        if (filterKey === 'ncavSafety' && filterValue === 'le0_66') {
            const val = stock.pncaRatio;
            return val !== null && val !== undefined && val <= 0.66;
        }
        if (filterKey === 'insiderOwn') { 
            const val = stock.insiderOwnershipPercentage; if (val === null || val === undefined) return false;
            if (filterValue === 'ge5') return val >= 5; if (filterValue === 'ge10') return val >= 10; if (filterValue === 'ge20') return val >= 20; return false;
        }
        if (filterKey === 'netInsiderTrx') { 
            if (filterValue === 'any') return true; const val = stock.netInsiderBuyTxLast6M; if (val === null || val === undefined) return false;
            if (filterValue === 'net_buying') return val >= 1; if (filterValue === 'neutral') return val === 0; if (filterValue === 'net_selling') return val <= -1; return false;
        }
        if (filterKey === 'gmTrend') { 
            if (filterValue === 'any') return true; if (stock.grossMarginTrend === null || stock.grossMarginTrend === undefined) return false;
            return stock.grossMarginTrend === filterValue;
        }
        if (filterKey === 'incRoic') { 
            const val = stock.incrementalROIC; if (val === null || val === undefined) return false;
            if (filterValue === 'ge15pct') return val >= 0.15; if (filterValue === 'ge20pct') return val >= 0.20; if (filterValue === 'ge25pct') return val >= 0.25; return false;
        }
        if (filterKey === 'interestCoverage') {
            const sliderNumVal = Number(filterValue); if (isNaN(sliderNumVal)) return true;
            const stockVal = stock.interestCoverageTTM; if (stockVal === null || stockVal === undefined) return false;
            return stockVal >= sliderNumVal;
        }
        if (filterKey === 'avgRotce5yr') {
            const stockVal = stock.avgRotce5yr; if (stockVal === null || stockVal === undefined) return false;
            if (filterValue === 'gt20') return stockVal > 0.20;
            if (filterValue === 'gt15') return stockVal > 0.15;
            if (filterValue === 'gt10') return stockVal > 0.10;
            if (filterValue === 'anyPositive') return stockVal > 0;
            return false;
        }
        if (filterKey === 'liquiditySafety') {
            const sliderNumVal = Number(filterValue); if (isNaN(sliderNumVal)) return true; 
            const stockVal = stock.daysToExitPosition; if (stockVal === null || stockVal === undefined) return false;
            return stockVal <= sliderNumVal;
        }
        if (filterKey === 'rankMomentum') {
            if (filterValue === 'positive') return stock.rankMomentum63 !== undefined && stock.rankMomentum63 > 0;
            return true;
        }
        if (filterKey === 'catalystOnly') {
             if (filterValue === 'true' && !stock.hasCatalyst) return false;
        }
        if (filterKey === 'excludeRegSho') {
            if (filterValue === 'true' && stock.isRegSho) return false;
        }
        if (filterKey.startsWith('catalyst_')) {
            // Placeholder for specific catalyst filtering if data becomes available
            return true; // Assume all pass for now
        }
          
        return true; 
      });
    });

    setFilteredStocks(tempStocks);
    setStocksToDisplay(tempStocks.slice(0, STOCKS_PER_PAGE * currentPage)); 
  }, [allStocks, searchTerm, currentPage]);


  useEffect(() => { 
    const filtersToUse = isSimpleMode ? advancedFiltersFromSimple : activeFilters;
    applyFiltersAndSearch(filtersToUse); 
  }, [searchTerm, activeFilters, isSimpleMode, simpleFilterValues, advancedFiltersFromSimple, allStocks, currentPage, applyFiltersAndSearch]); 


  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || stocksToDisplay.length >= filteredStocks.length) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setTimeout(() => { setCurrentPage(nextPage); setIsLoadingMore(false); }, 500); 
  }, [currentPage, filteredStocks.length, isLoadingMore, stocksToDisplay.length]);

  const handleSearchTermChange = (term: string) => {
    setHistoryStack(prev => [...prev.slice(-MAX_UNDO_HISTORY + 1), { filters: activeFilters, search: searchTerm }]);
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleFilterChange = (group: string, value: string) => {
    setHistoryStack(prev => [...prev.slice(-MAX_UNDO_HISTORY + 1), { filters: activeFilters, search: searchTerm }]);
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === 'false') {
        delete newFilters[group];
      } else {
        newFilters[group] = value;
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setHistoryStack(prev => [...prev.slice(-MAX_UNDO_HISTORY + 1), { filters: activeFilters, search: searchTerm }]);
    setActiveFilters({});
    setSearchTerm('');
    setSimpleFilterValues({ size: 50, value: 50, quality: 50 }); // Also reset simple sliders
    setCurrentPage(1);
  };
  
  const handleUndo = () => {
    if (historyStack.length > 0) {
      const lastState = historyStack[historyStack.length - 1];
      setActiveFilters(lastState.filters);
      setSearchTerm(lastState.search);
      setHistoryStack(prev => prev.slice(0, -1));
    }
  };

  const handleStockClick = async (stock: Stock) => {
    setIsLoadingStockDetails(true);
    setStockDetailsError(null);
    setIsStockDetailsModalOpen(true);
    try {
      const details = await fetchStockDetailsFromFMP(stock.symbol);
      setSelectedStockDetails(details);
    } catch (err: any) {
      console.error("Failed to load stock details:", err);
      setStockDetailsError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoadingStockDetails(false);
    }
  };
  
  const handleApplyPreset = (presetFilters: ActiveFilters) => {
    setHistoryStack(prev => [...prev.slice(-MAX_UNDO_HISTORY + 1), { filters: activeFilters, search: searchTerm }]);
    setActiveFilters(presetFilters);
    setIsPresetWizardOpen(false);
    setCurrentPage(1);
  };
  
  // Memoize the averages for the Benchmark Card
  const yourScreenAverages = useMemo((): BenchmarkAverages | null => {
    if (filteredStocks.length === 0) return null;

    const calculateAverageForMetric = (key: keyof Omit<BenchmarkAverages, 'symbol'>): number | 'N/A' => {
        const values = filteredStocks.map(stock => stock[key]).filter((v): v is number => typeof v === 'number' && isFinite(v));
        if (values.length === 0) return 'N/A';
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    };
    return {
        ownerEarningsYield: calculateAverageForMetric('ownerEarningsYield'),
        revenueCAGR5yr: calculateAverageForMetric('revenueCAGR5yr'),
        avgRotce5yr: calculateAverageForMetric('avgRotce5yr'),
        netCashToMarketCapRatio: calculateAverageForMetric('netCashToMarketCapRatio'),
        rankMomentum63: calculateAverageForMetric('rankMomentum63'),
    };
  }, [filteredStocks]);

  return (
    <div className={`theme-${theme} font-sans`}>
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onRefreshData={loadInitialStocks}
        onToggleWatchlistPane={() => setIsWatchlistPaneOpen(prev => !prev)}
      />
      <div className="app-layout">
        <Sidebar 
          isSimpleMode={isSimpleMode}
          setIsSimpleMode={setIsSimpleMode}
          simpleFilterValues={simpleFilterValues}
          onSimpleFilterChange={setSimpleFilterValues}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAllFilters={handleClearAllFilters}
          onApplyPreset={handleApplyPreset}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenPresetWizard={() => setIsPresetWizardOpen(true)}
        />
        <main className="main-content" ref={mainContentRef}>
          {isInitialLoading ? (
            <div className="initial-loading-spinner">
                <div className="spinner"></div>
                <p>Fetching stock data...</p>
            </div>
          ) : error ? (
            <div className="error-banner">
                <h4 className="font-bold">Error Loading Data</h4>
                <p>{error}</p>
                <button onClick={loadInitialStocks} className="error-retry-button">Retry</button>
            </div>
          ) : (
            <>
                <UndoResetBar onUndo={handleUndo} onReset={handleClearAllFilters} canUndo={historyStack.length > 0} />
                <BenchmarkCard 
                    yourScreenAverages={yourScreenAverages}
                    sp500Averages={sp500Averages}
                    isLoading={isSp500Loading}
                />
                <KeyMetricsSection 
                    filteredStocks={filteredStocks} 
                    keyMetricsVisibility={keyMetricsVisibility}
                    onOpenCustomizeModal={() => setIsCustomizeMetricsModalOpen(true)}
                />
                <StocksSection 
                    stocksToDisplay={stocksToDisplay}
                    currentView={currentView}
                    onSetView={setCurrentView}
                    keyMetricsVisibility={keyMetricsVisibility}
                    onStockClick={handleStockClick}
                    isLoadingMore={isLoadingMore}
                    searchTerm={searchTerm}
                    onSearchTermChange={handleSearchTermChange}
                    activeFilters={activeFilters}
                    onRemoveFilter={(group) => handleFilterChange(group, '')}
                    hasMoreStocksToLoad={stocksToDisplay.length < filteredStocks.length}
                    watchlist={watchlist}
                    onToggleWatchlist={toggleWatchlist}
                />
                 {stocksToDisplay.length > 0 && stocksToDisplay.length < filteredStocks.length && (
                    <div className="flex justify-center p-4">
                        <button onClick={handleLoadMore} disabled={isLoadingMore} className="filter-btn filter-btn-active">
                            {isLoadingMore ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                 )}
            </>
          )}
        </main>
      </div>

      <div className="fixed bottom-4 left-4 z-40 sm:hidden">
        <button className="mobile-filter-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open filters">
          <FilterIcon className="w-5 h-5 mr-1" />
          Filters
        </button>
      </div>

      <CustomizeMetricsModal 
        isOpen={isCustomizeMetricsModalOpen}
        onClose={() => setIsCustomizeMetricsModalOpen(false)}
        onApply={setKeyMetricsVisibility}
        currentVisibilityConfig={keyMetricsVisibility}
        displayMetricsConfig={DISPLAY_METRICS_CONFIG}
      />
      <StockDetailsModal 
        isOpen={isStockDetailsModalOpen}
        onClose={() => setIsStockDetailsModalOpen(false)}
        stockDetails={selectedStockDetails}
        isLoading={isLoadingStockDetails}
        watchlist={watchlist}
        onToggleWatchlist={toggleWatchlist}
      />
      <PresetWizardModal 
        isOpen={isPresetWizardOpen}
        onClose={() => setIsPresetWizardOpen(false)}
        onApplyPreset={handleApplyPreset}
      />
      <WatchlistPane 
        isOpen={isWatchlistPaneOpen}
        onClose={() => setIsWatchlistPaneOpen(false)}
        watchlistSymbols={watchlist}
        allStocks={allStocks}
        onStockClick={handleStockClick}
        onToggleWatchlist={toggleWatchlist}
      />
       <ToastContainer toasts={toasts} onDismiss={removeToastAndStoreDismissal} />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
  console.log('[index.tsx] React app rendered.');
} else {
  console.error('[index.tsx] Root element with id "root" not found in the DOM.');
}
