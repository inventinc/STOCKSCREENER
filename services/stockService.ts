

console.log("[stockService.ts] Module execution started."); // Diagnostic log

import { 
    Stock, StockDetails, 
    FMPQuote, FMPRatiosTTM, FMPKeyMetricsTTM, FMPProfile, FMPScreenerResult, FMPStockNewsItem,
    HistoricalPricePoint, HistoricalFinancialDataPoint,
    FMPHistoricalPriceData, FMPAnnualIncomeStatement, FMPAnnualBalanceSheet,
    InstitutionalOwnershipSummary, TopInstitutionalHolder, EarningsCallTranscriptMeta, 
    FMPInstitutionalOwnership, FMPTopInstitutionalHolder, FMPEarningsTranscriptMeta,
    FMPInsiderTradingItem, FMPInsiderOwnershipItem, FMPEarningCalendarItem, WatchlistExtra,
    BenchmarkAverages // Added BenchmarkAverages
} from '../types';
import { INITIAL_STOCK_LOAD_COUNT, HISTORICAL_YEARS_FOR_TRENDS, HISTORICAL_YEARS_FOR_AVG, NA_STRING } from '../constants';

const getApiKey = (): string | undefined => {
  console.log("[stockService.ts] getApiKey called."); 
  if (typeof window !== 'undefined' &&
      (window as any).APP_CONFIG &&
      (window as any).APP_CONFIG.FMP_API_KEY &&
      (window as any).APP_CONFIG.FMP_API_KEY !== "YOUR_FMP_API_KEY_HERE") {
    console.log("[stockService.ts] API key found in window.APP_CONFIG."); 
    return (window as any).APP_CONFIG.FMP_API_KEY;
  }
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.API_KEY) {
    console.log("[stockService.ts] API key found in process.env."); 
    return process.env.API_KEY;
  }
  console.log("[stockService.ts] No API key found."); 
  return undefined; 
};

const API_KEY = getApiKey();
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_V4_BASE_URL = 'https://financialmodelingprep.com/api/v4';

export class FMPApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "FMPApiError";
  }
}

const safeNum = (val: any): number | null => (typeof val === 'number' && isFinite(val) ? val : null);
const formatNum = (val: number | null | undefined, decimals = 2, suffix = '', ifNullReturn: string = NA_STRING): string => {
  if (val === null || val === undefined || isNaN(val)) return ifNullReturn;
  return val.toFixed(decimals) + suffix;
};

// --- Category Calculation Functions ---
const getMarketCapCategory = (marketCap: number | null | undefined): Stock['marketCapCategory'] => {
  if (marketCap === null || marketCap === undefined) return NA_STRING;
  if (marketCap >= 2_000_000_000) return 'midLarge';
  if (marketCap >= 300_000_000) return 'small';
  if (marketCap >= 50_000_000) return 'micro';
  if (marketCap > 0) return 'nano';
  return NA_STRING;
};

const getVolumeCategory = (avgVolume: number | null | undefined): Stock['volumeCategory'] => {
  if (avgVolume === null || avgVolume === undefined) return NA_STRING;
  if (avgVolume >= 1_000_000) return 'high';
  if (avgVolume >= 100_000) return 'medium';
  if (avgVolume > 0) return 'low';
  return NA_STRING;
};

const getDebtCategory = (debtEquityRatio: number | null | undefined): Stock['debtCategory'] => {
  if (debtEquityRatio === null || debtEquityRatio === undefined) return NA_STRING;
  if (debtEquityRatio < 0.5) return 'low';
  if (debtEquityRatio <= 1.0) return 'medium';
  return 'high';
};

const getValuationCategory = (peRatio: number | null | undefined): Stock['valuationCategory'] => {
  if (peRatio === null || peRatio === undefined) return NA_STRING;
  if (peRatio < 15 && peRatio > 0) return 'value';
  if (peRatio > 25) return 'growth';
  if (peRatio >=15 && peRatio <=25) return 'blend';
  return NA_STRING; 
};

const getRotceCategory = (roe: number | null | undefined): Stock['rotceCategory'] => { 
  if (roe === null || roe === undefined) return NA_STRING;
  const roePercent = roe * 100;
  if (roePercent > 20) return 'excellent';
  if (roePercent >= 15) return 'good';
  if (roePercent >= 10) return 'average';
  return 'poor';
};

const getPncaCategory = (pncaRatio: number | null): Stock['deepValueCategory'] => {
    if (pncaRatio === null) return NA_STRING;
    if (pncaRatio <= 0.5) return 'le0.5';
    if (pncaRatio <= 0.8) return 'le0.8';
    if (pncaRatio <= 1.0) return 'le1.0';
    return NA_STRING; 
};

const getShareCountCagrCategory = (cagr: number | null): Stock['shareCountCagrCategory'] => {
    if (cagr === null) return NA_STRING;
    if (cagr <= -0.05) return 'reduction_large';
    if (cagr < 0) return 'reduction_small';
    if (cagr >= -0.005 && cagr <= 0.005) return 'flat'; 
    return 'increasing';
};

const getInsiderOwnershipCategory = (percentage: number | null): Stock['insiderOwnershipCategory'] => {
    if (percentage === null) return NA_STRING;
    if (percentage >= 20) return 'ge20';
    if (percentage >= 10) return 'ge10';
    if (percentage >= 5) return 'ge5';
    return NA_STRING;
};

const getNetInsiderBuysCategory = (netTransactions: number | null): Stock['netInsiderBuysCategory'] => {
    if (netTransactions === null) return NA_STRING;
    if (netTransactions >= 1) return 'net_buying';
    if (netTransactions === 0) return 'neutral';
    return 'net_selling'; 
};

const getIncrementalRoicCategory = (incRoic: number | null): Stock['incrementalRoicCategory'] => {
    if (incRoic === null) return NA_STRING;
    if (incRoic >= 0.25) return 'ge25pct';
    if (incRoic >= 0.20) return 'ge20pct';
    if (incRoic >= 0.15) return 'ge15pct';
    return NA_STRING;
};


// --- Score Color Functions ---
export const getSimpleScoreColor = (score?: number): string => {
    if (score === undefined || score === null) return 'bg-gray-400 dark:bg-gray-600';
    if (score >= 75) return 'bg-green-500 text-white';
    if (score >= 50) return 'bg-blue-500 text-white';
    if (score >= 25) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
};
export const getTextSimpleScoreColor = (score?: number): string => {
    if (score === undefined || score === null) return 'text-gray-500 dark:text-gray-400';
    if (score >= 75) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-blue-600 dark:text-blue-400';
    if (score >= 25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
};

// Refined Simple Score Calculation for Sprint 1
const calculateSimpleScore = (stock: Partial<Stock>, price: number): number => {
    let score = 0;

    // 1. Owner-Earnings Yield (FCF Yield = FCF_per_share / Price) (Max 30 points)
    if (stock.freeCashFlowPerShareTTM && price > 0) {
        const fcfYield = stock.freeCashFlowPerShareTTM / price;
        if (fcfYield > 0.10) score += 30;       // >10%
        else if (fcfYield > 0.08) score += 25;  // >8%
        else if (fcfYield > 0.06) score += 20;  // >6%
        else if (fcfYield > 0.04) score += 15;  // >4%
        else if (fcfYield > 0.02) score += 10;  // >2%
        else if (fcfYield > 0) score += 5;      // >0%
    }

    // 2. Net-Cash/MCap Ratio (Max 20 points)
    if (stock.netCashToMarketCapRatio !== null && stock.netCashToMarketCapRatio !== undefined) {
        const ratio = stock.netCashToMarketCapRatio;
        if (ratio > 0.50) score += 20;      // >50%
        else if (ratio > 0.25) score += 15; // >25%
        else if (ratio > 0.10) score += 10; // >10%
        else if (ratio > 0) score += 5;     // >0%
        // No points if ratio is <= 0
    }
    
    // 3. InsiderBuys/MCap Ratio (Value of insider buys in last 6m / MCap) (Max 15 points)
    if (stock.insiderBuyValueToMarketCapRatio !== null && stock.insiderBuyValueToMarketCapRatio !== undefined) {
        const ratio = stock.insiderBuyValueToMarketCapRatio;
        if (ratio > 0.005) score += 15;     // >0.5% of MCap
        else if (ratio > 0.002) score += 10;// >0.2% of MCap
        else if (ratio > 0.0005) score += 5;// >0.05% of MCap (0.5 per mille)
    }

    // 4. Revenue Growth (3-Yr CAGR) (Max 20 points)
    if (stock.revenueCAGR !== null && stock.revenueCAGR !== undefined) {
        const cagr = stock.revenueCAGR;
        if (cagr > 0.15) score += 20;       // >15%
        else if (cagr > 0.10) score += 15;  // >10%
        else if (cagr > 0.05) score += 10;  // >5%
        else if (cagr > 0) score += 5;      // >0%
        // No points if CAGR is <= 0
    }
    
    // 5. Catalyst Bonus (+5 pts if hasCatalyst true)
    if (stock.hasCatalyst) { // hasCatalyst defaults to false in type and fetch
        score += 5;
    }
    
    return Math.round(Math.max(0, Math.min(100, score))); // Max score can be 90 (30+20+15+20+5)
};


// --- Calculation Helper Functions ---
const calculateCAGR = (values: (number | null | undefined)[], years: number): number | null => {
    if (values.length < 2 || years < 1) return null;
    
    // Filter out null/undefined, ensure we have numeric values, and take the first and last of the *actual* data points for the period.
    const numericValues = values.map(safeNum).filter(v => v !== null) as number[];
    if (numericValues.length < 2) return null;

    const startValue = numericValues[0];
    const endValue = numericValues[numericValues.length - 1];
    const actualYears = numericValues.length -1; // Number of periods between the first and last numeric value

    if (actualYears === 0) return null; // Avoid division by zero if only one distinct period with data after filtering
    if (startValue === null || endValue === null || startValue === 0) return null;
    
    // Handle cases where start or end values might be negative, which can lead to NaN for CAGR.
    // If start is negative and end is positive, CAGR is complex. If both are negative, interpretation is tricky.
    // For simplicity, if start is non-positive and end is positive, or vice-versa with issues for roots, return null.
    if (startValue <= 0 && endValue > 0) return null; 
    if (startValue > 0 && endValue <= 0 && (1 / actualYears) % 1 !== 0 && actualYears % 2 === 0) return null; // Avoid issues with even roots of negative numbers.

    const cagr = Math.pow(endValue / startValue, 1 / actualYears) - 1;
    return isFinite(cagr) ? cagr : null;
};

const determineTrend = (values: (number | null | undefined)[]): 'improving' | 'stable' | 'declining' | null => {
    const validValues = values.map(safeNum).filter(v => v !== null) as number[];
    if (validValues.length < 2) return null;

    const first = validValues[0];
    const last = validValues[validValues.length - 1];
    
    let increasingConsistently = true;
    let decreasingConsistently = true;
    for (let i = 1; i < validValues.length; i++) {
        if (validValues[i] < validValues[i-1] * 0.98) increasingConsistently = false; 
        if (validValues[i] > validValues[i-1] * 1.02) decreasingConsistently = false; 
    }

    if (increasingConsistently && last > first * 1.05) return 'improving'; 
    if (decreasingConsistently && last < first * 0.95) return 'declining'; 
    
    if (last > first * 1.05) return 'improving';
    if (last < first * 0.95) return 'declining';
    
    return 'stable';
};


// --- FMP API Fetching Helpers ---
const fetchScreenerData = async (url: string, description: string): Promise<FMPScreenerResult[]> => {
    console.log(`[stockService.ts] Fetching ${description} from: ${url.replace(API_KEY!, "REDACTED_API_KEY")}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Could not retrieve error details.");
            console.error(`FMP Screener API error for ${description}: ${response.status}. Response: ${errorText}`);
            if (response.status === 401) {
                throw new FMPApiError(
                    `FMP API Authentication Failed (401 Unauthorized) for ${description}. Please verify API_KEY.`, 
                    response.status
                );
            }
            return [];
        }
        const data: FMPScreenerResult[] = await response.json();
        if (!Array.isArray(data)) {
            console.error(`FMP Screener data for ${description} is not an array:`, data);
            return []; 
        }
        console.log(`[stockService.ts] Received ${data.length} items from ${description}.`);
        return data;
    } catch (fetchErr: any) {
        console.error(`Network error during fetch for ${description}:`, fetchErr.message || fetchErr);
        return []; 
    }
};

async function fetchFMPData<T>(url: string, symbolForLog: string, dataTypeForLog: string): Promise<T[] | null> {
    if (!API_KEY) {
        console.error(`API Key missing for ${dataTypeForLog} fetch for ${symbolForLog}`);
        return null;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status !== 404 && response.status !== 401) { 
                 console.warn(`FMP ${dataTypeForLog} API error for ${symbolForLog}: ${response.status}. URL: ${url.replace(API_KEY!, "REDACTED_API_KEY")}`);
            }
            if (response.status === 401) throw new FMPApiError(`FMP API Auth Failed (401) for ${dataTypeForLog} of ${symbolForLog}`, 401);
            return null;
        }
        const data = await response.json();
        return Array.isArray(data) ? data : (data ? [data] : null); 
    } catch (error: any) {
        console.error(`Network error fetching ${dataTypeForLog} for ${symbolForLog}:`, error.message || error);
        return null;
    }
}

// --- Step 2-D: Reg-SHO Data ---
let regShoSymbolsSet: Set<string> | null = null;
export async function loadRegSHO(): Promise<Set<string>> {
  if (regShoSymbolsSet) return regShoSymbolsSet;
  try {
    const response = await fetch('/regsho.json'); // Path relative to public folder
    if (!response.ok) {
      console.warn(`Failed to load regsho.json: ${response.status}`);
      regShoSymbolsSet = new Set<string>(); // Initialize to empty set on failure
      return regShoSymbolsSet;
    }
    const tickers: string[] = await response.json();
    regShoSymbolsSet = new Set(tickers.map(t => t.toUpperCase()));
    console.log("[stockService.ts] RegSHO symbols loaded:", regShoSymbolsSet);
    return regShoSymbolsSet;
  } catch (error) {
    console.error("Error loading or parsing regsho.json:", error);
    regShoSymbolsSet = new Set<string>(); // Initialize to empty set on error
    return regShoSymbolsSet;
  }
}


export const fetchStockListFromFMP = async (): Promise<Stock[]> => {
  console.log("[stockService.ts] fetchStockListFromFMP called.");
  if (!API_KEY) {
    const errMsg = "FMP API Key is missing. Please ensure it is set correctly in index.html (window.APP_CONFIG.FMP_API_KEY) or as process.env.API_KEY in your environment.";
    console.error(errMsg);
    throw new FMPApiError(errMsg, 401);
  }

  try {
    const countPerCategory = Math.floor(INITIAL_STOCK_LOAD_COUNT / 4);
    const NANO_CAP_TARGET_COUNT = countPerCategory;
    const MICRO_CAP_TARGET_COUNT = countPerCategory;
    const SMALL_CAP_TARGET_COUNT = countPerCategory;
    const MID_LARGE_CAP_TARGET_COUNT = Math.max(10, INITIAL_STOCK_LOAD_COUNT - (NANO_CAP_TARGET_COUNT + MICRO_CAP_TARGET_COUNT + SMALL_CAP_TARGET_COUNT));
    
    const commonScreenerParams = `exchange=NASDAQ,NYSE,OTC&isActivelyTrading=true&apikey=${API_KEY}`;
    
    const nanoCapScreenerUrl = `${FMP_BASE_URL}/stock-screener?limit=${NANO_CAP_TARGET_COUNT}&marketCapLowerThan=50000000&${commonScreenerParams}`;
    const microCapScreenerUrl = `${FMP_BASE_URL}/stock-screener?limit=${MICRO_CAP_TARGET_COUNT}&marketCapMoreThan=50000000&marketCapLowerThan=300000000&${commonScreenerParams}`;
    const smallCapScreenerUrl = `${FMP_BASE_URL}/stock-screener?limit=${SMALL_CAP_TARGET_COUNT}&marketCapMoreThan=300000000&marketCapLowerThan=2000000000&${commonScreenerParams}`;
    const midLargeCapScreenerUrl = `${FMP_BASE_URL}/stock-screener?limit=${MID_LARGE_CAP_TARGET_COUNT}&marketCapMoreThan=2000000000&${commonScreenerParams}`;


    const [nanoCapScreenerData, microCapScreenerData, smallCapScreenerData, midLargeCapScreenerData, loadedRegShoSet] = await Promise.all([
        fetchScreenerData(nanoCapScreenerUrl, "nano-cap stocks"),
        fetchScreenerData(microCapScreenerUrl, "micro-cap stocks"),
        fetchScreenerData(smallCapScreenerUrl, "small-cap stocks"),
        fetchScreenerData(midLargeCapScreenerUrl, "mid-large-cap stocks"),
        loadRegSHO() // Load RegSHO data
    ]);
    regShoSymbolsSet = loadedRegShoSet; // Ensure module-level set is updated

    const filterValidItems = (items: FMPScreenerResult[]): FMPScreenerResult[] => items.filter(item => !item.isEtf && !item.isFund && (item.isActivelyTrading !== false));
    
    const combinedScreenerItems: FMPScreenerResult[] = [];
    const seenSymbols = new Set<string>();
    const addUniqueItems = (list: FMPScreenerResult[]) => list.forEach(item => {
        if (item.symbol && !seenSymbols.has(item.symbol)) {
            combinedScreenerItems.push(item);
            seenSymbols.add(item.symbol);
        }
    });
    
    addUniqueItems(filterValidItems(nanoCapScreenerData));
    addUniqueItems(filterValidItems(microCapScreenerData));
    addUniqueItems(filterValidItems(smallCapScreenerData));
    addUniqueItems(filterValidItems(midLargeCapScreenerData));

    const eligibleScreenerItems = combinedScreenerItems.slice(0, Math.min(combinedScreenerItems.length, INITIAL_STOCK_LOAD_COUNT));

    if (eligibleScreenerItems.length === 0) return [];

    const CHUNK_SIZE = 3; 
    const DELAY_BETWEEN_CHUNKS = 1500; 
    const allResolvedStocks: (Stock | null)[] = [];

    for (let i = 0; i < eligibleScreenerItems.length; i += CHUNK_SIZE) {
        const chunk = eligibleScreenerItems.slice(i, i + CHUNK_SIZE);
        
        const stockPromisesInChunk = chunk.map(async (screenerItem): Promise<Stock | null> => {
          try {
            if (!screenerItem.symbol || typeof screenerItem.symbol !== 'string' || screenerItem.symbol.trim() === '') return null;
            const symbol = screenerItem.symbol;

            const ratiosUrl = `${FMP_BASE_URL}/ratios-ttm/${symbol}?apikey=${API_KEY}`;
            const keyMetricsUrl = `${FMP_BASE_URL}/key-metrics-ttm/${symbol}?apikey=${API_KEY}`;
            const quoteUrl = `${FMP_BASE_URL}/quote/${symbol}?apikey=${API_KEY}`; 
            
            const [ratiosDataArr, keyMetricsDataArr, quoteDataArr] = await Promise.all([
                fetchFMPData<FMPRatiosTTM>(ratiosUrl, symbol, "Ratios TTM"),
                fetchFMPData<FMPKeyMetricsTTM>(keyMetricsUrl, symbol, "Key Metrics TTM"),
                fetchFMPData<FMPQuote>(quoteUrl, symbol, "Quote")
            ]);
            const ratiosData = ratiosDataArr?.[0] || null;
            const keyMetricsData = keyMetricsDataArr?.[0] || null;
            const quoteData = quoteDataArr?.[0] || null;

            // Fetch for HISTORICAL_YEARS_FOR_AVG for avgRotce5yr, and HISTORICAL_YEARS_FOR_TRENDS for others.
            const yearsToFetchFinancials = Math.max(HISTORICAL_YEARS_FOR_TRENDS, HISTORICAL_YEARS_FOR_AVG, 6); // Fetch 6 for 5-yr CAGR
            const incomeStatementUrl = `${FMP_BASE_URL}/income-statement/${symbol}?period=annual&limit=${yearsToFetchFinancials}&apikey=${API_KEY}`;
            const balanceSheetUrl = `${FMP_BASE_URL}/balance-sheet-statement/${symbol}?period=annual&limit=${yearsToFetchFinancials}&apikey=${API_KEY}`;
            const [incomeStatements, balanceSheets] = await Promise.all([
                fetchFMPData<FMPAnnualIncomeStatement>(incomeStatementUrl, symbol, "Annual Income Statements"),
                fetchFMPData<FMPAnnualBalanceSheet>(balanceSheetUrl, symbol, "Annual Balance Sheets")
            ]);

            const insiderTradingUrl = `${FMP_V4_BASE_URL}/insider-trading?symbol=${symbol}&limit=100&page=0&apikey=${API_KEY}`;
            const insiderOwnershipUrl = `${FMP_V4_BASE_URL}/insider-ownership?symbol=${symbol}&apikey=${API_KEY}`;
             const [insiderTradesData, insiderOwnershipDataArr] = await Promise.all([
                fetchFMPData<FMPInsiderTradingItem>(insiderTradingUrl, symbol, "Insider Trading"),
                fetchFMPData<FMPInsiderOwnershipItem>(insiderOwnershipUrl, symbol, "Insider Ownership")
            ]);
            
            const marketCap = safeNum(screenerItem.marketCap);
            const avgVolume = safeNum(quoteData?.avgVolume) ?? safeNum(screenerItem.volume);
            const price = safeNum(screenerItem.price) ?? 0;
            const sharesOutstandingRaw = safeNum(quoteData?.sharesOutstanding) ?? 
                                      (incomeStatements?.[0] ? safeNum(incomeStatements[0].weightedAverageShsOutDil) : null) ??
                                      (balanceSheets?.[0] ? safeNum(balanceSheets[0].commonStock) : null);
            const sharesOutstanding = sharesOutstandingRaw && sharesOutstandingRaw > 0 ? sharesOutstandingRaw : null;


            const peRatioTTM = ratiosData ? safeNum(ratiosData.priceEarningsRatioTTM) : null;
            const debtEquityRatioTTM = ratiosData ? safeNum(ratiosData.debtEquityRatioTTM) : null;
            const roeTTM = ratiosData ? (safeNum(ratiosData.returnOnTangibleEquityTTM) ?? safeNum(ratiosData.returnOnEquityTTM)) : null; 
            const debtToEbitdaTTM = keyMetricsData ? safeNum(keyMetricsData.debtToEbitdaTTM) : null;
            const evOverEbitdaTTM = keyMetricsData ? safeNum(keyMetricsData.enterpriseValueOverEBITDATTM) : null; 
            const fcfPerShareTTM = keyMetricsData ? safeNum(keyMetricsData.freeCashFlowPerShareTTM) : null;
            const netIncomePerShareTTM = ratiosData ? safeNum(ratiosData.netIncomePerShareTTM) : null;
            const interestCoverageTTM = ratiosData ? safeNum(ratiosData.interestCoverageTTM) : null;
            let fcfNiRatioTTM: number | null = null;
            if (fcfPerShareTTM !== null && netIncomePerShareTTM !== null && netIncomePerShareTTM !== 0) {
                fcfNiRatioTTM = fcfPerShareTTM / netIncomePerShareTTM;
            }
            
            // --- Calculate Sprint 1 Filter Metrics & New Score Metrics ---
            let pncaRatio: number | null = null;
            if (balanceSheets && balanceSheets.length > 0 && price > 0 && sharesOutstanding && sharesOutstanding > 0) {
                const latestBS = balanceSheets.sort((a,b) => parseInt(b.calendarYear) - parseInt(a.calendarYear))[0];
                const currentAssets = safeNum(latestBS.totalCurrentAssets);
                const totalLiabilities = safeNum(latestBS.totalLiabilities);
                if (currentAssets !== null && totalLiabilities !== null) {
                    const ncav = currentAssets - totalLiabilities;
                    const ncavPerShare = ncav / sharesOutstanding;
                    if (ncavPerShare > 0) pncaRatio = price / ncavPerShare;
                    else if (ncavPerShare <=0 && price > 0) pncaRatio = Infinity; // Or some large number to indicate not favorable
                }
            }

            let shareCountCAGR3yr: number | null = null;
            if (incomeStatements && incomeStatements.length >= HISTORICAL_YEARS_FOR_TRENDS) {
                const sharesHist = incomeStatements
                    .sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear)) 
                    .slice(-HISTORICAL_YEARS_FOR_TRENDS) 
                    .map(is => safeNum(is.weightedAverageShsOutDil));
                if (sharesHist.length >= 2) { 
                    shareCountCAGR3yr = calculateCAGR(sharesHist, sharesHist.length - 1);
                }
            }
            
            let grossMarginTrend: Stock['grossMarginTrend'] = null;
            if (incomeStatements && incomeStatements.length >= 2) {
                 const margins = incomeStatements
                    .sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear))
                    .slice(-HISTORICAL_YEARS_FOR_TRENDS)
                    .map(is => safeNum(is.grossProfitRatio));
                grossMarginTrend = determineTrend(margins);
            }

            let incrementalROIC: number | null = null;
            if (incomeStatements && incomeStatements.length >= 2 && balanceSheets && balanceSheets.length >= 2) {
                const sortedIS = [...incomeStatements].sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear));
                const sortedBS = [...balanceSheets].sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear));

                const N_IS = sortedIS[sortedIS.length-1];
                const N_1_IS = sortedIS[sortedIS.length-2];
                const N_BS = sortedBS.find(bs => bs.calendarYear === N_IS.calendarYear);
                const N_1_BS = sortedBS.find(bs => bs.calendarYear === N_1_IS.calendarYear);

                if (N_IS && N_1_IS && N_BS && N_1_BS) {
                    const calcNopat = (is: FMPAnnualIncomeStatement) => {
                        const opInc = safeNum(is.operatingIncome);
                        const taxExp = safeNum(is.incomeTaxExpense);
                        const incBeforeTax = safeNum(is.incomeBeforeTax);
                        if (opInc === null || taxExp === null || incBeforeTax === null || incBeforeTax === 0) return null;
                        const taxRate = taxExp / incBeforeTax;
                        return opInc * (1 - taxRate);
                    };
                    const calcInvCap = (bs: FMPAnnualBalanceSheet) => {
                        const debt = safeNum(bs.totalDebt);
                        const equity = safeNum(bs.totalStockholdersEquity);
                        const cash = safeNum(bs.cashAndCashEquivalents);
                        if (debt === null || equity === null || cash === null) return null;
                        return debt + equity - cash;
                    };

                    const nopatN = calcNopat(N_IS);
                    const nopatN1 = calcNopat(N_1_IS);
                    const invCapN = calcInvCap(N_BS);
                    const invCapN1 = calcInvCap(N_1_BS);

                    if (nopatN !== null && nopatN1 !== null && invCapN !== null && invCapN1 !== null) {
                        const changeInNopat = nopatN - nopatN1;
                        const changeInInvCap = invCapN - invCapN1;
                        if (changeInInvCap > 0) incrementalROIC = changeInNopat / changeInInvCap;
                    }
                }
            }
            
            let netInsiderBuyTxLast6M: number = 0; // Default to 0, not null, for easier category assignment
            let totalInsiderBuyValueLast6M: number = 0;
            if (insiderTradesData) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                insiderTradesData.forEach(trade => {
                    if (new Date(trade.transactionDate) >= sixMonthsAgo) {
                        if (trade.transactionType === "P-Purchase") {
                             netInsiderBuyTxLast6M += 1;
                             totalInsiderBuyValueLast6M += (safeNum(trade.securitiesTransacted) ?? 0) * (safeNum(trade.price) ?? 0);
                        }
                        else if (trade.transactionType === "S-Sale") netInsiderBuyTxLast6M -= 1;
                    }
                });
            }

            let insiderOwnershipPercentage: number | null = null;
            if (insiderOwnershipDataArr && insiderOwnershipDataArr.length > 0) {
                const latestOwnershipEntry = insiderOwnershipDataArr
                    .filter(item => item.ownershipPercentage !== null && item.ownershipPercentage !== undefined)
                    .sort((a,b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())[0];
                if (latestOwnershipEntry) insiderOwnershipPercentage = safeNum(latestOwnershipEntry.ownershipPercentage);
            }

            let avgRotce5yr: number | null = null;
            if (balanceSheets && incomeStatements && balanceSheets.length >= HISTORICAL_YEARS_FOR_AVG && incomeStatements.length >= HISTORICAL_YEARS_FOR_AVG) {
                const rotceValues: number[] = [];
                const sortedHistoricalIS = incomeStatements.sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear)).slice(-HISTORICAL_YEARS_FOR_AVG);
                
                sortedHistoricalIS.forEach(is => {
                    const bs = balanceSheets.find(b => b.calendarYear === is.calendarYear);
                    if (!bs) return;
                    const netInc = safeNum(is.netIncome);
                    const equity = safeNum(bs.totalStockholdersEquity);
                    const goodwill = safeNum(bs.goodwill) ?? 0;
                    const intangibles = safeNum(bs.intangibleAssets) ?? 0;
                    if (netInc !== null && equity !== null) {
                        const tangibleEquity = equity - goodwill - intangibles;
                        if (tangibleEquity > 0) rotceValues.push(netInc / tangibleEquity);
                    }
                });
                
                if (rotceValues.length > 0) {
                    avgRotce5yr = rotceValues.reduce((sum, val) => sum + val, 0) / rotceValues.length;
                }
            }
            
            let daysToExitPosition: number | null = null;
            if (sharesOutstanding && avgVolume && avgVolume > 0 && sharesOutstanding > 0) {
                const sharesToSell = 0.05 * sharesOutstanding; // 5% of outstanding shares
                const maxTradeableSharesPerDay = 0.10 * avgVolume; // Trading 10% of ADV
                if (maxTradeableSharesPerDay > 0) {
                    daysToExitPosition = sharesToSell / maxTradeableSharesPerDay;
                }
            }

            // New Score Components
            let netCashToMarketCapRatio: number | null = null;
            if (balanceSheets && balanceSheets.length > 0 && marketCap && marketCap > 0) {
                const latestBS = balanceSheets.sort((a, b) => parseInt(b.calendarYear) - parseInt(a.calendarYear))[0];
                const cash = safeNum(latestBS.cashAndCashEquivalents);
                const debt = safeNum(latestBS.totalDebt);
                if (cash !== null && debt !== null) {
                    netCashToMarketCapRatio = (cash - debt) / marketCap;
                }
            }

            let revenueCAGR: number | null = null; // 3-year by default
            if (incomeStatements && incomeStatements.length >= HISTORICAL_YEARS_FOR_TRENDS) {
                const revenues = incomeStatements
                    .sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear))
                    .slice(-HISTORICAL_YEARS_FOR_TRENDS)
                    .map(is => safeNum(is.revenue));
                if (revenues.length >= 2) {
                     revenueCAGR = calculateCAGR(revenues, revenues.length - 1);
                }
            }
            
            const insiderBuyValueToMarketCapRatio = (marketCap && marketCap > 0 && totalInsiderBuyValueLast6M > 0) 
                ? totalInsiderBuyValueLast6M / marketCap 
                : (totalInsiderBuyValueLast6M <= 0 ? 0 : null); // If no buys or MCap is zero, set to 0 or null
            
            const hasCatalyst = Math.random() < 0.2; // ~20% of stocks will have a catalyst for testing purposes
            
            // --- Benchmark Card Metrics ---
            const ownerEarningsYield = (fcfPerShareTTM && price > 0) ? fcfPerShareTTM / price : null;
            let revenueCAGR5yr: number | null = null;
            if (incomeStatements && incomeStatements.length >= 6) { // Need 6 years of data for 5-year CAGR
                const revenues5yr = incomeStatements
                    .sort((a,b) => parseInt(a.calendarYear) - parseInt(b.calendarYear))
                    .slice(-6)
                    .map(is => safeNum(is.revenue));
                if (revenues5yr.length >= 2) {
                     revenueCAGR5yr = calculateCAGR(revenues5yr, 5);
                }
            }
            // -----------------------------

            const stockForScore: Partial<Stock> = {
                freeCashFlowPerShareTTM: fcfPerShareTTM,
                netCashToMarketCapRatio,
                insiderBuyValueToMarketCapRatio,
                revenueCAGR,
                hasCatalyst, 
                peRatioTTM, // Though not directly in the new score, it's good context
            };
            const simpleScore = calculateSimpleScore(stockForScore, price);

            // Sprint 2: Rank Momentum
            const score63DaysAgo = simpleScore !== undefined ? Math.max(0, Math.min(100, Math.round(simpleScore * (1 + (Math.random() * 0.10 - 0.05))))) : undefined; // +/- 5% jitter
            const rankMomentum63 = (simpleScore !== undefined && score63DaysAgo !== undefined) ? simpleScore - score63DaysAgo : undefined;
            const isRegSho = regShoSymbolsSet ? regShoSymbolsSet.has(symbol.toUpperCase()) : false; // Check RegSHO status


            
            let styleTags: Stock['styleTags'] = [];
            if (peRatioTTM !== null && peRatioTTM > 30) styleTags.push('highPE');
            if (roeTTM !== null && roeTTM > 0) styleTags.push(' profitableTTM');

            return {
              id: symbol, symbol,
              name: screenerItem.companyName || NA_STRING,
              sector: screenerItem.sector || NA_STRING,
              price, simpleScore, styleTags, isRegSho,
              marketCap: marketCap ?? undefined, avgVolume: avgVolume ?? undefined, sharesOutstanding,
              peRatioTTM, debtEquityRatioTTM, returnOnEquityTTM: roeTTM, 
              debtToEbitdaTTM, enterpriseValueOverEBITDATTM: evOverEbitdaTTM,
              freeCashFlowPerShareTTM: fcfPerShareTTM, netIncomePerShareTTM, fcfNiRatioTTM,
              interestCoverageTTM, 

              pncaRatio, shareCountCAGR3yr, grossMarginTrend, incrementalROIC,
              netInsiderBuyTxLast6M, insiderOwnershipPercentage,
              avgRotce5yr, daysToExitPosition, 
              netCashToMarketCapRatio, insiderBuyValueToMarketCapRatio, revenueCAGR, hasCatalyst, 
              score63DaysAgo: score63DaysAgo ?? undefined, 
              rankMomentum63: rankMomentum63 ?? undefined,
              priceChangePercentage1D: quoteData?.changesPercentage ?? undefined, 
              nextEarningsDate: undefined, // Will be filled by fetchWatchlistExtras if needed
              
              ownerEarningsYield, revenueCAGR5yr, // Benchmark Card metrics

              marketCapCategory: getMarketCapCategory(marketCap),
              volumeCategory: getVolumeCategory(avgVolume),
              debtCategory: getDebtCategory(debtEquityRatioTTM), 
              valuationCategory: getValuationCategory(peRatioTTM), 
              rotceCategory: getRotceCategory(roeTTM), 
              
              debtEbitda: formatNum(debtToEbitdaTTM, 2, 'x'), 
              evEbit: formatNum(evOverEbitdaTTM, 2, 'x'), 
              fcfNi: formatNum(fcfNiRatioTTM, 2), 
              rotce: formatNum(roeTTM !== null ? roeTTM * 100 : null, 1, '%'),

              numericDebtEbitdaCategory: debtToEbitdaTTM !== null ? (debtToEbitdaTTM <= 0.25 ? 'le0.25x' : debtToEbitdaTTM <= 0.5 ? 'le0.5x' : debtToEbitdaTTM <= 1 ? 'le1x' : '') : '',
              numericFcfNiCategory: fcfNiRatioTTM !== null ? (fcfNiRatioTTM >= 1.2 ? 'ge1.2' : fcfNiRatioTTM >= 1.0 ? 'ge1.0' : fcfNiRatioTTM >= 0.8 ? 'ge0.8' : '') : '',
              numericEvEbitCategory: evOverEbitdaTTM !== null ? (evOverEbitdaTTM <= 6 ? 'le6x' : evOverEbitdaTTM <= 8 ? 'le8x' : evOverEbitdaTTM <= 10 ? 'le10x' : '') : '',
              
              deepValueCategory: getPncaCategory(pncaRatio),
              shareCountCagrCategory: getShareCountCagrCategory(shareCountCAGR3yr),
              grossMarginTrendCategory: grossMarginTrend || NA_STRING,
              incrementalRoicCategory: getIncrementalRoicCategory(incrementalROIC),
              insiderOwnershipCategory: getInsiderOwnershipCategory(insiderOwnershipPercentage),
              netInsiderBuysCategory: getNetInsiderBuysCategory(netInsiderBuyTxLast6M),
              
              moatKeywordsCategory: NA_STRING, 
              redFlagsCategory: NA_STRING, 
            };
          } catch (e: any) {
            console.error(`Error processing stock ${screenerItem.symbol} in chunk mapping:`, e.message || e);
            if (e instanceof FMPApiError && e.status === 401) throw e; 
            return null;
          }
        });

        try {
            const resolvedStocksInChunk = await Promise.all(stockPromisesInChunk);
            allResolvedStocks.push(...resolvedStocksInChunk);
        } catch (chunkError: any) {
            console.error(`[stockService.ts] Critical error processing a chunk of stocks:`, chunkError.message || chunkError);
            if (chunkError instanceof FMPApiError && chunkError.status === 401) throw chunkError;
        }
      
        if (i + CHUNK_SIZE < eligibleScreenerItems.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
        }
    }

    const finalStocks = allResolvedStocks.filter(stock => stock !== null) as Stock[];
    console.log(`[stockService.ts] Processed ${finalStocks.length} stocks after detailed fetching with chunking.`);
    return finalStocks;

  } catch (error) {
    if (error instanceof FMPApiError) throw error; 
    console.error("Error fetching stock list from FMP:", error);
    throw new FMPApiError("An unexpected error occurred while fetching stock list.", 500);
  }
};


// --- Stock Detail Fetching ---
const fetchHistoricalPriceData = async (symbol: string, days: number = 90): Promise<HistoricalPricePoint[]> => {
  if (!API_KEY) throw new FMPApiError("API Key not found for historical price data.", 401);
  const url = `${FMP_BASE_URL}/historical-price-full/${symbol}?timeseries=${days}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401) throw new FMPApiError(`FMP API Auth Failed (401) for historical price of ${symbol}`, 401);
      return [];
    }
    const data: FMPHistoricalPriceData = await response.json();
    if (data && Array.isArray(data.historical)) {
      return data.historical.map(item => ({ date: item.date, close: item.close })).reverse();
    }
    return [];
  } catch (error: any) {
    console.error(`Error fetching historical price data for ${symbol}:`, error.message || error);
    return [];
  }
};

const fetchHistoricalFinancialStatements = async (symbol: string, years: number = 12): Promise<HistoricalFinancialDataPoint[]> => {
  if (!API_KEY) throw new FMPApiError("API Key not found for historical financials.", 401);

  const incomeStmtUrl = `${FMP_BASE_URL}/income-statement/${symbol}?period=annual&limit=${years}&apikey=${API_KEY}`;
  const balanceSheetUrl = `${FMP_BASE_URL}/balance-sheet-statement/${symbol}?period=annual&limit=${years}&apikey=${API_KEY}`;

  try {
    const [incomeResponse, balanceSheetResponse] = await Promise.all([
      fetch(incomeStmtUrl),
      fetch(balanceSheetUrl)
    ]);

    if (!incomeResponse.ok || !balanceSheetResponse.ok) {
        if (incomeResponse.status === 401 || balanceSheetResponse.status === 401) {
            throw new FMPApiError(`FMP API Auth Failed (401) for historical financials of ${symbol}`, 401);
        }
      return [];
    }

    const incomeData: FMPAnnualIncomeStatement[] = await incomeResponse.json();
    const balanceSheetData: FMPAnnualBalanceSheet[] = await balanceSheetResponse.json();

    if (!Array.isArray(incomeData) || !Array.isArray(balanceSheetData)) return [];

    const combinedData: HistoricalFinancialDataPoint[] = [];
    incomeData.forEach(incomeItem => {
      const correspondingBalanceSheet = balanceSheetData.find(bsItem => bsItem.calendarYear === incomeItem.calendarYear);
      if (correspondingBalanceSheet) {
        const netIncome = safeNum(incomeItem.netIncome);
        const totalStockholdersEquity = safeNum(correspondingBalanceSheet.totalStockholdersEquity);
        const goodwill = safeNum(correspondingBalanceSheet.goodwill) ?? 0;
        const intangibleAssets = safeNum(correspondingBalanceSheet.intangibleAssets) ?? 0;
        const totalGoodwillAndIntangibles = (goodwill + intangibleAssets > 0) 
            ? (goodwill + intangibleAssets)
            : safeNum(correspondingBalanceSheet.goodwillAndIntangibleAssets) ?? 0;

        let calculatedROTCE: number | null = null;
        if (netIncome !== null && totalStockholdersEquity !== null) {
          const tangibleCommonEquity = totalStockholdersEquity - totalGoodwillAndIntangibles;
          if (tangibleCommonEquity > 0) {
            calculatedROTCE = netIncome / tangibleCommonEquity;
          }
        }
        
        combinedData.push({
          year: parseInt(incomeItem.calendarYear, 10),
          fiscalDateEnding: incomeItem.date,
          reportedCurrency: incomeItem.reportedCurrency,
          commonStockSharesOutstanding: safeNum(incomeItem.weightedAverageShsOutDil) ?? safeNum(correspondingBalanceSheet.commonStock), 
          netIncome: netIncome,
          totalStockholdersEquity: totalStockholdersEquity,
          goodwill: goodwill,
          intangibleAssets: intangibleAssets,
          calculatedROTCE: calculatedROTCE,
          operatingIncome: safeNum(incomeItem.operatingIncome),
          incomeTaxExpense: safeNum(incomeItem.incomeTaxExpense),
          incomeBeforeTax: safeNum(incomeItem.incomeBeforeTax),
          totalDebt: safeNum(correspondingBalanceSheet.totalDebt),
          cashAndCashEquivalents: safeNum(correspondingBalanceSheet.cashAndCashEquivalents),
          grossProfitRatio: safeNum(incomeItem.grossProfitRatio),
          revenue: safeNum(incomeItem.revenue),
          totalCurrentAssets: safeNum(correspondingBalanceSheet.totalCurrentAssets),
          totalLiabilities: safeNum(correspondingBalanceSheet.totalLiabilities),
        });
      }
    });
    
    return combinedData.sort((a, b) => a.year - b.year);

  } catch (error: any) {
    console.error(`Error fetching historical financial statements for ${symbol}:`, error.message || error);
    return [];
  }
};


export const fetchStockDetailsFromFMP = async (stockSymbol: string): Promise<StockDetails | null> => {
  console.log(`[stockService.ts] fetchStockDetailsFromFMP called for ${stockSymbol}.`);
  if (!API_KEY) {
    const errMsg = "FMP API Key is missing.";
    console.error(errMsg);
    throw new FMPApiError(errMsg, 401);
  }
  try {
    const profileUrl = `${FMP_BASE_URL}/profile/${stockSymbol}?apikey=${API_KEY}`;
    const quoteUrl = `${FMP_BASE_URL}/quote/${stockSymbol}?apikey=${API_KEY}`; 
    const ratiosUrl = `${FMP_BASE_URL}/ratios-ttm/${stockSymbol}?apikey=${API_KEY}`;
    const keyMetricsUrl = `${FMP_BASE_URL}/key-metrics-ttm/${stockSymbol}?apikey=${API_KEY}`;
    const newsUrl = `${FMP_BASE_URL}/stock_news?tickers=${stockSymbol}&limit=5&apikey=${API_KEY}`;
    
    const institutionalOwnershipUrl = `${FMP_V4_BASE_URL}/institutional-ownership/symbol_ownership?symbol=${stockSymbol}&apikey=${API_KEY}`;
    const topInstitutionalHoldersUrl = `${FMP_BASE_URL}/institutional-holder/${stockSymbol}?limit=5&apikey=${API_KEY}`;
    const earningsTranscriptsListUrl = `${FMP_V4_BASE_URL}/batch_earning_call_transcript/${stockSymbol}?apikey=${API_KEY}`;

    const insiderTradingUrl = `${FMP_V4_BASE_URL}/insider-trading?symbol=${stockSymbol}&limit=100&page=0&apikey=${API_KEY}`;
    const insiderOwnershipUrl = `${FMP_V4_BASE_URL}/insider-ownership?symbol=${stockSymbol}&apikey=${API_KEY}`;

    let profileRes, quoteRes, ratiosRes, keyMetricsRes, newsRes, 
        institutionalOwnershipRes, topHoldersRes, transcriptsListRes,
        insiderTradesRes, insiderOwnershipResRaw,
        historicalPrice, historicalFinancials;
    
    try {
        [profileRes, quoteRes, ratiosRes, keyMetricsRes, newsRes, 
         institutionalOwnershipRes, topHoldersRes, transcriptsListRes,
         insiderTradesRes, insiderOwnershipResRaw] = await Promise.all([
          fetch(profileUrl), fetch(quoteUrl), fetch(ratiosUrl), fetch(keyMetricsUrl), fetch(newsUrl),
          fetch(institutionalOwnershipUrl), fetch(topInstitutionalHoldersUrl), fetch(earningsTranscriptsListUrl),
          fetch(insiderTradingUrl), fetch(insiderOwnershipUrl)
        ].map(p => p.catch(e => { 
            console.error(`A fetch operation failed for ${stockSymbol}:`, e.message || e);
            return new Response(null, {status: 503, statusText: "Service Unavailable or Network Error"}); 
        })));
        
        const yearsToFetchFinancialsDetails = Math.max(HISTORICAL_YEARS_FOR_TRENDS, HISTORICAL_YEARS_FOR_AVG, 10); // Fetch more for details modal charts
        historicalPrice = await fetchHistoricalPriceData(stockSymbol);
        historicalFinancials = await fetchHistoricalFinancialStatements(stockSymbol, yearsToFetchFinancialsDetails);

    } catch (fetchErr: any) { 
        console.error(`General network error during initial detail fetch for ${stockSymbol}:`, fetchErr.message || fetchErr);
        throw new FMPApiError(`Network error fetching details for ${stockSymbol}.`, 500);
    }

    if (!profileRes.ok || !quoteRes.ok) {
        const errorStatus = !profileRes.ok ? profileRes.status : quoteRes.status;
        let message = `Failed to fetch essential data for ${stockSymbol}. Profile: ${profileRes.status}, Quote: ${quoteRes.status}`;
        if (errorStatus === 401) message = `FMP API Auth Failed (401) for ${stockSymbol}.`;
        console.error(message);
        throw new FMPApiError(message, errorStatus);
    }
    
    const profileDataArr: FMPProfile[] = await profileRes.json();
    const quoteDataArr: FMPQuote[] = await quoteRes.json();
    const profile = profileDataArr?.[0];
    const quote = quoteDataArr?.[0];

    if (!profile || !quote) {
        throw new FMPApiError(`Incomplete profile or quote data received for ${stockSymbol}.`, 500);
    }

    const ratios = ratiosRes.ok ? (await ratiosRes.json() as FMPRatiosTTM[])?.[0] : null;
    const keyMetrics = keyMetricsRes.ok ? (await keyMetricsRes.json() as FMPKeyMetricsTTM[])?.[0] : null;
    const newsData = newsRes.ok ? await newsRes.json() as FMPStockNewsItem[] : [];
    
    const institutionalOwnershipData = institutionalOwnershipRes.ok ? (await institutionalOwnershipRes.json() as FMPInstitutionalOwnership[])?.[0] : null;
    const topInstitutionalHoldersData = topHoldersRes.ok ? await topHoldersRes.json() as FMPTopInstitutionalHolder[] : [];
    const transcriptsListData = transcriptsListRes.ok ? await transcriptsListRes.json() as FMPEarningsTranscriptMeta[] : [];
    
    const insiderTradesData = insiderTradesRes.ok ? await insiderTradesRes.json() as FMPInsiderTradingItem[] : null;
    const insiderOwnershipDataArr = insiderOwnershipResRaw.ok ? await insiderOwnershipResRaw.json() as FMPInsiderOwnershipItem[] : null;

    // --- Recalculate all metrics including new ones for StockDetails (copy from fetchStockList for consistency) ---
    const price = safeNum(profile.price) ?? 0;
    const marketCap = safeNum(profile.mktCap);
    const avgVolume = safeNum(quote.avgVolume);
    // Use historicalFinancials from details fetch which might have more years.
    const sharesOutstandingRaw = safeNum(quote?.sharesOutstanding) ??
                                (historicalFinancials && historicalFinancials.length > 0 ? safeNum(historicalFinancials[historicalFinancials.length -1].commonStockSharesOutstanding) : null);
    const sharesOutstanding = sharesOutstandingRaw && sharesOutstandingRaw > 0 ? sharesOutstandingRaw : null;
    
    const peRatioTTM = ratios ? safeNum(ratios.priceEarningsRatioTTM) : null;
    const debtEquityRatioTTM = ratios ? safeNum(ratios.debtEquityRatioTTM) : null;
    const roeTTM = ratios ? (safeNum(ratios.returnOnTangibleEquityTTM) ?? safeNum(ratios.returnOnEquityTTM)) : null;
    const debtToEbitdaTTM = keyMetrics ? safeNum(keyMetrics.debtToEbitdaTTM) : null;
    const evOverEbitdaTTM = keyMetrics ? safeNum(keyMetrics.enterpriseValueOverEBITDATTM) : null;
    const fcfPerShareTTM = keyMetrics ? safeNum(keyMetrics.freeCashFlowPerShareTTM) : null;
    const netIncomePerShareTTM = ratios ? safeNum(ratios.netIncomePerShareTTM) : null;
    const interestCoverageTTM = ratios ? safeNum(ratios.interestCoverageTTM) : null;
    let fcfNiRatioTTM: number | null = null;
    if (fcfPerShareTTM !== null && netIncomePerShareTTM !== null && netIncomePerShareTTM !== 0) {
        fcfNiRatioTTM = fcfPerShareTTM / netIncomePerShareTTM;
    }

    let pncaRatio: number | null = null;
    if (historicalFinancials && historicalFinancials.length > 0 && price > 0 && sharesOutstanding && sharesOutstanding > 0) {
        const latestBSData = historicalFinancials.sort((a,b) => b.year - a.year)[0];
        const currentAssets = safeNum(latestBSData.totalCurrentAssets); 
        const totalLiabilitiesVal = safeNum(latestBSData.totalLiabilities);

        if (currentAssets !== null && totalLiabilitiesVal !== null) {
            const ncav = currentAssets - totalLiabilitiesVal;
            const ncavPerShare = ncav / sharesOutstanding;
            if (ncavPerShare > 0) pncaRatio = price / ncavPerShare;
             else if (ncavPerShare <=0 && price > 0) pncaRatio = Infinity;
        }
    }
    
    let shareCountCAGR3yr: number | null = null;
    if (historicalFinancials && historicalFinancials.length >= HISTORICAL_YEARS_FOR_TRENDS) {
        const shares = historicalFinancials
            .sort((a,b) => a.year - b.year) 
            .slice(-HISTORICAL_YEARS_FOR_TRENDS)
            .map(hf => safeNum(hf.commonStockSharesOutstanding));
         if (shares.length >= 2) {
             shareCountCAGR3yr = calculateCAGR(shares, shares.length - 1);
         }
    }

    let grossMarginTrend: Stock['grossMarginTrend'] = null;
    if (historicalFinancials && historicalFinancials.length >= 2) {
         const margins = historicalFinancials
            .sort((a,b) => a.year - b.year)
            .slice(-HISTORICAL_YEARS_FOR_TRENDS)
            .map(hf => safeNum(hf.grossProfitRatio));
        grossMarginTrend = determineTrend(margins);
    }
    
    let incrementalROIC: number | null = null;
    if (historicalFinancials && historicalFinancials.length >= 2) {
        const sortedHF = [...historicalFinancials].sort((a,b) => a.year - b.year);
        const N_HF = sortedHF[sortedHF.length-1];
        const N_1_HF = sortedHF[sortedHF.length-2];

        if (N_HF && N_1_HF) {
            const calcNopat = (hf: HistoricalFinancialDataPoint) => {
                const opInc = safeNum(hf.operatingIncome);
                const taxExp = safeNum(hf.incomeTaxExpense);
                const incBeforeTax = safeNum(hf.incomeBeforeTax);
                if (opInc === null || taxExp === null || incBeforeTax === null || incBeforeTax === 0) return null;
                const taxRate = taxExp / incBeforeTax;
                return opInc * (1 - taxRate);
            };
            const calcInvCap = (hf: HistoricalFinancialDataPoint) => {
                const debt = safeNum(hf.totalDebt);
                const equity = safeNum(hf.totalStockholdersEquity);
                const cash = safeNum(hf.cashAndCashEquivalents);
                if (debt === null || equity === null || cash === null) return null;
                return debt + equity - cash;
            };

            const nopatN = calcNopat(N_HF);
            const nopatN1 = calcNopat(N_1_HF);
            const invCapN = calcInvCap(N_HF);
            const invCapN1 = calcInvCap(N_1_HF);

            if (nopatN !== null && nopatN1 !== null && invCapN !== null && invCapN1 !== null) {
                const changeInNopat = nopatN - nopatN1;
                const changeInInvCap = invCapN - invCapN1;
                if (changeInInvCap > 0) incrementalROIC = changeInNopat / changeInInvCap;
            }
        }
    }

    let netInsiderBuyTxLast6M: number = 0;
    let totalInsiderBuyValueLast6M: number = 0;
    if (insiderTradesData) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        insiderTradesData.forEach(trade => {
            if (new Date(trade.transactionDate) >= sixMonthsAgo) {
                 if (trade.transactionType === "P-Purchase") {
                    netInsiderBuyTxLast6M +=1;
                    totalInsiderBuyValueLast6M += (safeNum(trade.securitiesTransacted) ?? 0) * (safeNum(trade.price) ?? 0);
                 } else if (trade.transactionType === "S-Sale") {
                    netInsiderBuyTxLast6M -=1;
                 }
            }
        });
    }
    
    let insiderOwnershipPercentage: number | null = null;
    if (insiderOwnershipDataArr && insiderOwnershipDataArr.length > 0) {
        const latestOwnershipEntry = insiderOwnershipDataArr
            .filter(item => item.ownershipPercentage !== null && item.ownershipPercentage !== undefined)
            .sort((a,b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())[0];
        if (latestOwnershipEntry) insiderOwnershipPercentage = safeNum(latestOwnershipEntry.ownershipPercentage);
    }
    
    let avgRotce5yr: number | null = null;
    if (historicalFinancials && historicalFinancials.length >= HISTORICAL_YEARS_FOR_AVG) {
        const rotceValues = historicalFinancials
            .slice(-HISTORICAL_YEARS_FOR_AVG)
            .map(hf => hf.calculatedROTCE)
            .filter(val => val !== null && val !== undefined) as number[];
        if (rotceValues.length > 0) {
            avgRotce5yr = rotceValues.reduce((sum, val) => sum + val, 0) / rotceValues.length;
        }
    }

    let daysToExitPosition: number | null = null;
    if (sharesOutstanding && avgVolume && avgVolume > 0 && sharesOutstanding > 0) {
        const sharesToSell = 0.05 * sharesOutstanding;
        const maxTradeableSharesPerDay = 0.10 * avgVolume;
        if (maxTradeableSharesPerDay > 0) {
             daysToExitPosition = sharesToSell / maxTradeableSharesPerDay;
        }
    }
    
    let netCashToMarketCapRatio: number | null = null;
    let revenueCAGR: number | null = null; 
    if (historicalFinancials && historicalFinancials.length > 0 && marketCap && marketCap > 0) {
        const latestHF = historicalFinancials.sort((a,b) => b.year - a.year)[0];
        const cash = safeNum(latestHF.cashAndCashEquivalents);
        const debtVal = safeNum(latestHF.totalDebt);
        if (cash !== null && debtVal !== null) {
            netCashToMarketCapRatio = (cash - debtVal) / marketCap;
        }
        
        if (historicalFinancials.length >= HISTORICAL_YEARS_FOR_TRENDS) {
            const revenues = historicalFinancials
                .sort((a,b) => a.year - b.year)
                .slice(-HISTORICAL_YEARS_FOR_TRENDS) 
                .map(hf => safeNum(hf.revenue));
            if (revenues.length >= 2) {
                 revenueCAGR = calculateCAGR(revenues, revenues.length - 1);
            }
        }
    }
    
    const insiderBuyValueToMarketCapRatio = (marketCap && marketCap > 0 && totalInsiderBuyValueLast6M > 0) 
        ? totalInsiderBuyValueLast6M / marketCap 
        : (totalInsiderBuyValueLast6M <= 0 ? 0 : null);
    
    const hasCatalyst = Math.random() < 0.2;

    const ownerEarningsYield = (fcfPerShareTTM && price > 0) ? fcfPerShareTTM / price : null;
    let revenueCAGR5yr: number | null = null;
    if (historicalFinancials && historicalFinancials.length >= 6) {
        const revenues5yr = historicalFinancials
            .sort((a,b) => a.year - b.year)
            .slice(-6)
            .map(hf => safeNum(hf.revenue));
        if (revenues5yr.length >= 2) {
            revenueCAGR5yr = calculateCAGR(revenues5yr, 5);
        }
    }

    const stockForScore: Partial<Stock> = {
        freeCashFlowPerShareTTM: fcfPerShareTTM,
        netCashToMarketCapRatio,
        insiderBuyValueToMarketCapRatio,
        revenueCAGR,
        hasCatalyst,
        peRatioTTM,
    };
    const simpleScore = calculateSimpleScore(stockForScore, price);
    
    // Sprint 2: Rank Momentum for details
    const score63DaysAgo = simpleScore !== undefined ? Math.max(0, Math.min(100, Math.round(simpleScore * (1 + (Math.random() * 0.10 - 0.05))))) : undefined;
    const rankMomentum63 = (simpleScore !== undefined && score63DaysAgo !== undefined) ? simpleScore - score63DaysAgo : undefined;
    const isRegSho = regShoSymbolsSet ? regShoSymbolsSet.has(stockSymbol.toUpperCase()) : false;

    let styleTags: Stock['styleTags'] = [];
    if (peRatioTTM !== null && peRatioTTM > 30) styleTags.push('highPE');
    if (roeTTM !== null && roeTTM > 0) styleTags.push(' profitableTTM');

    const result: StockDetails = {
      id: profile.symbol, symbol: profile.symbol, name: profile.companyName || NA_STRING,
      sector: profile.sector || NA_STRING, price, simpleScore, styleTags, isRegSho,
      description: profile.description || "No description available.",
      marketCap: marketCap ?? undefined, avgVolume: avgVolume ?? undefined, sharesOutstanding,
      peRatioTTM, debtEquityRatioTTM, returnOnEquityTTM: roeTTM, debtToEbitdaTTM,
      enterpriseValueOverEBITDATTM: evOverEbitdaTTM, freeCashFlowPerShareTTM: fcfPerShareTTM, netIncomePerShareTTM, fcfNiRatioTTM,
      interestCoverageTTM,
      
      pncaRatio, shareCountCAGR3yr, grossMarginTrend, incrementalROIC, netInsiderBuyTxLast6M, insiderOwnershipPercentage,
      avgRotce5yr, daysToExitPosition,
      netCashToMarketCapRatio, insiderBuyValueToMarketCapRatio, revenueCAGR, hasCatalyst,
      score63DaysAgo: score63DaysAgo ?? undefined, 
      rankMomentum63: rankMomentum63 ?? undefined,
      priceChangePercentage1D: quote?.changesPercentage ?? undefined,
      nextEarningsDate: undefined, // Will be filled by fetchWatchlistExtras if needed

      ownerEarningsYield, revenueCAGR5yr, // Benchmark Card Metrics

      dividendYield: formatNum(safeNum(profile.lastDiv) && price ? (safeNum(profile.lastDiv)! / price!) * 100 : null, 2, '%'),
      '52WeekHigh': formatNum(safeNum(quote.yearHigh)), '52WeekLow': formatNum(safeNum(quote.yearLow)),
      latestNews: newsData.map(n => ({ title: n.title, url: n.url, date: new Date(n.publishedDate).toLocaleDateString() })).slice(0,5),
      image: profile.image, website: profile.website, ceo: profile.ceo, industry: profile.industry, fullTimeEmployees: profile.fullTimeEmployees,

      marketCapCategory: getMarketCapCategory(safeNum(profile.mktCap)),
      volumeCategory: getVolumeCategory(safeNum(profile.volAvg)),
      debtCategory: getDebtCategory(debtEquityRatioTTM),
      valuationCategory: getValuationCategory(peRatioTTM),
      rotceCategory: getRotceCategory(roeTTM),
      
      debtEbitda: formatNum(debtToEbitdaTTM, 2, 'x'), evEbit: formatNum(evOverEbitdaTTM, 2, 'x'), 
      fcfNi: formatNum(fcfNiRatioTTM, 2), rotce: formatNum(roeTTM !== null ? roeTTM * 100 : null, 1, '%'),

      numericDebtEbitdaCategory: debtToEbitdaTTM !== null ? (debtToEbitdaTTM <= 0.25 ? 'le0.25x' : debtToEbitdaTTM <= 0.5 ? 'le0.5x' : debtToEbitdaTTM <= 1 ? 'le1x' : '') : '',
      numericFcfNiCategory: fcfNiRatioTTM !== null ? (fcfNiRatioTTM >= 1.2 ? 'ge1.2' : fcfNiRatioTTM >= 1.0 ? 'ge1.0' : fcfNiRatioTTM >= 0.8 ? 'ge0.8' : '') : '',
      numericEvEbitCategory: evOverEbitdaTTM !== null ? (evOverEbitdaTTM <= 6 ? 'le6x' : evOverEbitdaTTM <= 8 ? 'le8x' : evOverEbitdaTTM <= 10 ? 'le10x' : '') : '',
      
      deepValueCategory: getPncaCategory(pncaRatio),
      shareCountCagrCategory: getShareCountCagrCategory(shareCountCAGR3yr),
      grossMarginTrendCategory: grossMarginTrend || NA_STRING,
      incrementalRoicCategory: getIncrementalRoicCategory(incrementalROIC),
      insiderOwnershipCategory: getInsiderOwnershipCategory(insiderOwnershipPercentage),
      netInsiderBuysCategory: getNetInsiderBuysCategory(netInsiderBuyTxLast6M),
      
      moatKeywordsCategory: NA_STRING, redFlagsCategory: NA_STRING,

      historicalPriceData: historicalPrice,
      historicalFinancials: historicalFinancials, 

      institutionalOwnershipSummary: institutionalOwnershipData ? {
           symbol: institutionalOwnershipData.symbol, cik: institutionalOwnershipData.cik, date: institutionalOwnershipData.date,
           institutionalOwnershipPercentage: institutionalOwnershipData.institutionalOwnershipPercentage,
           numberOfInstitutionalPositions: institutionalOwnershipData.numberOfInstitutionalPositions,
           totalInstitutionalValue: institutionalOwnershipData.totalInstitutionalValue
      } : null,
      topInstitutionalHolders: topInstitutionalHoldersData,
      latestTranscript: transcriptsListData.length > 0 ? {
            symbol: transcriptsListData[0].symbol, quarter: transcriptsListData[0].quarter, year: transcriptsListData[0].year,
            date: transcriptsListData[0].date,
            url: `https://financialmodelingprep.com/api/v3/earning_call_transcript/${transcriptsListData[0].symbol}?quarter=${transcriptsListData[0].quarter}&year=${transcriptsListData[0].year}&apikey=${API_KEY}`
      } : null,
    };
    console.log(`[stockService.ts] Successfully fetched details for ${stockSymbol}.`); 
    return result;

  } catch (error) {
    if (error instanceof FMPApiError) throw error; 
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching full details for ${stockSymbol}:`, errorMessage);
    if (error instanceof TypeError && errorMessage.includes("failed to fetch")) {
         throw new FMPApiError(`Network error prevented fetching details for ${stockSymbol}. Check connectivity.`, 500);
    }
    throw new FMPApiError(`An unexpected error occurred while fetching details for ${stockSymbol}. Error: ${errorMessage}`, 500); 
  }
};

export const formatMarketCap = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return NA_STRING;
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'; 
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(0); 
};


// Sprint 2-E: Fetch Watchlist Extras
export async function fetchWatchlistExtras(symbols: string[]): Promise<WatchlistExtra[]> {
  if (!API_KEY) {
    console.error("API Key missing for fetchWatchlistExtras");
    return symbols.map(s => ({ symbol: s, priceChangePct: undefined, nextEarnings: '—' }));
  }
  if (!symbols || symbols.length === 0) {
    return [];
  }

  const list = symbols.join(',');
  const quotesUrl = `${FMP_BASE_URL}/quote/${list}?apikey=${API_KEY}`;
  // FMP earnings calendar can take a list of symbols in the path for v3, or use `symbol` query param for v4.
  // Using path for v3 as per prompt's implied structure.
  const earningsCalendarUrl = `${FMP_BASE_URL}/earning_calendar/${list}?apikey=${API_KEY}`;
  
  try {
    const [quotesResponse, earningsResponse] = await Promise.all([
      fetch(quotesUrl).catch(e => { console.warn(`Fetch error for quotes (${list}):`, e); return null; }),
      fetch(earningsCalendarUrl).catch(e => { console.warn(`Fetch error for earnings calendar (${list}):`, e); return null; })
    ]);

    let quotesData: FMPQuote[] = [];
    if (quotesResponse && quotesResponse.ok) {
      const rawQuotesData = await quotesResponse.json();
      // Ensure quotesData is an array, as /quote/{list} returns an array.
      quotesData = Array.isArray(rawQuotesData) ? rawQuotesData : (rawQuotesData ? [rawQuotesData] : []);
    } else if (quotesResponse) {
      console.warn(`Failed to fetch quotes for ${list}: Status ${quotesResponse.status}`);
    }

    let earningsCalendarData: FMPEarningCalendarItem[] = [];
    if (earningsResponse && earningsResponse.ok) {
        const rawEarningsData = await earningsResponse.json();
        earningsCalendarData = Array.isArray(rawEarningsData) ? rawEarningsData : (rawEarningsData ? [rawEarningsData] : []);
    } else if (earningsResponse) {
      console.warn(`Failed to fetch earnings calendar for ${list}: Status ${earningsResponse.status}`);
    }
    
    const earningsMap: Record<string, string> = {};
    const today = new Date();
    today.setHours(0,0,0,0); // For accurate date comparison

    // Filter earnings for upcoming dates and map them
    earningsCalendarData.forEach((e: FMPEarningCalendarItem) => {
      const earningsDate = new Date(e.date);
      if (earningsDate >= today) { // Only consider upcoming or today's earnings
        if (!earningsMap[e.symbol] || earningsDate < new Date(earningsMap[e.symbol])) {
          earningsMap[e.symbol] = e.date; // Store as YYYY-MM-DD string
        }
      }
    });
    
    // Map results based on the original symbols list to ensure all symbols are covered
    return symbols.map(symbol => {
      const quote = quotesData.find(q => q.symbol === symbol);
      return {
        symbol: symbol,
        priceChangePct: quote?.changesPercentage, // This can be null or undefined from FMP
        nextEarnings: earningsMap[symbol] ?? '—'
      };
    });

  } catch (error) {
    console.error(`Error in fetchWatchlistExtras for symbols ${list}:`, error);
    return symbols.map(s => ({ symbol: s, priceChangePct: undefined, nextEarnings: '—' }));
  }
}

// --- Benchmark Card Functions ---

export const getSP500Symbols = async (): Promise<string[]> => {
    try {
        const response = await fetch('/data/sp500.json');
        if (!response.ok) {
            console.warn(`Could not load sp500.json: ${response.status}`);
            return [];
        }
        const data = await response.json();
        // The file is an array of objects like { "Symbol": "AAPL", ... }, extract just the symbols
        if (Array.isArray(data)) {
            return data.map(item => item.Symbol).filter(Boolean);
        }
        return [];
    } catch (e) {
        console.error("Error fetching or parsing sp500.json", e);
        return [];
    }
}

// Fetches a single stock's metrics relevant for averaging. Returns null if data is insufficient.
async function fetchStockMetricsForAveraging(symbol: string): Promise<Partial<Stock> | null> {
    try {
        const stockDetails = await fetchStockDetailsFromFMP(symbol);
        if (!stockDetails) return null;
        return {
            ownerEarningsYield: stockDetails.ownerEarningsYield,
            revenueCAGR5yr: stockDetails.revenueCAGR5yr,
            avgRotce5yr: stockDetails.avgRotce5yr,
            netCashToMarketCapRatio: stockDetails.netCashToMarketCapRatio,
            rankMomentum63: stockDetails.rankMomentum63
        };
    } catch (e) {
        // Don't log spammy errors for every S&P stock that fails, just return null.
        return null;
    }
}

export const calculateSP500Averages = async (): Promise<BenchmarkAverages> => {
    const symbols = await getSP500Symbols();
    if (symbols.length === 0) {
        throw new Error("S&P 500 symbol list is empty.");
    }
    
    const CHUNK_SIZE = 10;
    const allMetrics: (Partial<Stock> | null)[] = [];
    
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(symbol => fetchStockMetricsForAveraging(symbol));
        const chunkResults = await Promise.all(promises);
        allMetrics.push(...chunkResults);
        // Small delay to be respectful to the API.
        if (i + CHUNK_SIZE < symbols.length) {
            await new Promise(res => setTimeout(res, 500));
        }
    }

    const validMetrics = allMetrics.filter((m): m is Partial<Stock> => m !== null);
    const totalCount = symbols.length;

    const calculateAverageForMetric = (key: keyof Omit<BenchmarkAverages, 'symbol'>): number | 'N/A' => {
        const values = validMetrics.map(m => m[key]).filter((v): v is number => typeof v === 'number' && isFinite(v));
        const validDataCount = values.length;
        
        if (validDataCount < totalCount * 0.8) { // If >20% of data is missing
            return 'N/A';
        }
        
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / validDataCount;
    };

    return {
        ownerEarningsYield: calculateAverageForMetric('ownerEarningsYield'),
        revenueCAGR5yr: calculateAverageForMetric('revenueCAGR5yr'),
        avgRotce5yr: calculateAverageForMetric('avgRotce5yr'),
        netCashToMarketCapRatio: calculateAverageForMetric('netCashToMarketCapRatio'),
        rankMomentum63: calculateAverageForMetric('rankMomentum63'),
    };
};


console.log("[stockService.ts] Module execution finished.");
