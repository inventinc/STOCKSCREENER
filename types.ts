

export interface HistoricalPricePoint {
  date: string;
  close: number;
}

export interface HistoricalFinancialDataPoint {
  year: number;
  fiscalDateEnding: string;
  reportedCurrency?: string;
  commonStockSharesOutstanding?: number | null;
  netIncome?: number | null;
  totalStockholdersEquity?: number | null;
  goodwill?: number | null;
  intangibleAssets?: number | null;
  calculatedROTCE?: number | null; // Return on Tangible Common Equity

  // Fields for Incremental ROIC calculation
  operatingIncome?: number | null;
  incomeTaxExpense?: number | null;
  incomeBeforeTax?: number | null;
  totalDebt?: number | null;
  cashAndCashEquivalents?: number | null;
  grossProfitRatio?: number | null; // For Gross Margin Trend
  revenue?: number | null; // Added for Revenue CAGR
  totalCurrentAssets?: number | null; // Added for P/NCAV calculations
  totalLiabilities?: number | null; // Added for P/NCAV calculations
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number; 
  simpleScore?: number;
  isRegSho?: boolean; // Added for Step 2-D

  // Raw values from API
  marketCap?: number;
  avgVolume?: number;
  peRatioTTM?: number | null;
  debtEquityRatioTTM?: number | null;
  returnOnEquityTTM?: number | null; 
  debtToEbitdaTTM?: number | null;
  enterpriseValueOverEBITDATTM?: number | null; 
  freeCashFlowPerShareTTM?: number | null;
  netIncomePerShareTTM?: number | null;
  fcfNiRatioTTM?: number | null;
  interestCoverageTTM?: number | null; // For Interest Coverage filter
  
  // --- Fields for enhanced filters & refined score ---
  pncaRatio?: number | null; // Price to Net Current Asset Value
  shareCountCAGR3yr?: number | null; // 3-year Share Count CAGR
  grossMarginTrend?: 'improving' | 'stable' | 'declining' | null; // Trend of gross margin
  incrementalROIC?: number | null; // Incremental Return on Invested Capital
  netInsiderBuyTxLast6M?: number | null; // Count of net insider buy transactions in last 6 months
  insiderOwnershipPercentage?: number | null; // Percentage of insider ownership
  avgRotce5yr?: number | null; // For 5-year average ROTCE filter
  daysToExitPosition?: number | null; // For Liquidity-Safety slider
  sharesOutstanding?: number | null; // For daysToExitPosition calculation
  
  // Fields for new refined score
  netCashToMarketCapRatio?: number | null; 
  insiderBuyValueToMarketCapRatio?: number | null; 
  revenueCAGR?: number | null; // e.g., 3yr or 5yr
  hasCatalyst?: boolean; // For refined score (+5 points if true)

  // Sprint 2: Rank Momentum
  score63DaysAgo?: number;
  rankMomentum63?: number;
  // Sprint 2: Watchlist Extras
  priceChangePercentage1D?: number | null; // from priceChangePct (can be null/undefined)
  nextEarningsDate?: string; // from nextEarnings
  
  // --- Fields for Benchmark Card ---
  ownerEarningsYield?: number | null;
  revenueCAGR5yr?: number | null;
  // --- End of new fields ---

  // Categorical and formatted string values
  debtEbitda: string; 
  evEbit: string; 
  fcfNi: string; 
  rotce: string; 

  marketCapCategory: 'nano' | 'micro' | 'small' | 'mid' | 'large' | string;
  volumeCategory: 'low' | 'medium' | 'high' | string;
  debtCategory: 'low' | 'medium' | 'high' | string;
  valuationCategory: 'value' | 'growth' | 'blend' | string;
  rotceCategory: 'poor' | 'average' | 'good' | 'excellent' | string;
  
  styleTags?: StyleTag[];

  // Placeholders/Categories for filters - will be updated based on new raw data
  numericDebtEbitdaCategory: 'le0.25x' | 'le0.5x' | 'le1x' | string;
  numericFcfNiCategory: 'ge0.8' | 'ge1.0' | 'ge1.2' | string;
  shareCountCagrCategory: 'reduction_large' | 'reduction_small' | 'flat' | 'increasing' | string; 
  numericEvEbitCategory: 'le6x' | 'le8x' | 'le10x' | string;
  deepValueCategory: 'le0.5' | 'le0.8' | 'le1.0' | string; // Based on P/NCAV
  moatKeywordsCategory: 'ge3' | 'ge5' | 'ge10' | string; // Remains N/A
  insiderOwnershipCategory: 'ge5' | 'ge10' | 'ge20' | string; 
  netInsiderBuysCategory: 'net_buying' | 'neutral' | 'net_selling' | string;
  grossMarginTrendCategory: 'improving' | 'stable' | 'declining' | 'any' | string;
  incrementalRoicCategory: 'ge15pct' | 'ge20pct' | 'ge25pct' | string;
  redFlagsCategory: 'auditChanges' | 'managementExits' | 'allRedFlags' | string; // Remains N/A
}

export interface TopInstitutionalHolder {
  holder: string;
  shares: number;
  dateReported: string;
  change: number; 
  weight?: number | null;
}

export interface InstitutionalOwnershipSummary {
  symbol: string;
  cik: string | null;
  date: string; 
  institutionalOwnershipPercentage: number | null; 
  numberOfInstitutionalPositions: number | null;
  totalInstitutionalValue: number | null; 
}

export interface EarningsCallTranscriptMeta {
  symbol: string;
  quarter: number;
  year: number;
  date: string; 
  url: string; 
}

export interface StockDetails extends Stock {
  description: string;
  dividendYield: string; 
  '52WeekHigh': string;
  '52WeekLow': string;
  latestNews: { title: string; url: string; date: string }[];
  image?: string;
  website?: string;
  ceo?: string;
  industry?: string;
  fullTimeEmployees?: string;

  historicalPriceData?: HistoricalPricePoint[];
  historicalFinancials?: HistoricalFinancialDataPoint[];

  institutionalOwnershipSummary?: InstitutionalOwnershipSummary | null;
  topInstitutionalHolders?: TopInstitutionalHolder[];
  latestTranscript?: EarningsCallTranscriptMeta | null;
}

export interface ActiveFilters {
  [key: string]: string | undefined | boolean; // Allow boolean for checkbox-like filters (e.g. regSho)
  marketCap?: string;
  volume?: string;
  debtEquityRatio?: string; 
  peRatio?: string;       
  roe?: string;          
  
  debtToEbitda?: string; 
  fcfToNetIncome?: string; 
  shareCountChange?: string; 
  evToEbit?: string; 
  priceToNCAV?: string; 
  ncavSafety?: 'le0_66'; 
  
  moatKws?: string; 
  insiderOwn?: string; 
  netInsiderTrx?: string; 
  gmTrend?: string; 
  incRoic?: string; 
  rdFlags?: string; 
  regSho?: boolean; // Added for Step 2-D Reg-SHO filter

  catalyst_spinOff?: string;
  liquiditySafety?: string; 
  interestCoverage?: string; 
  avgRotce5yr?: string; 
  rankMomentum?: 'positive'; 
  regShoListFilter?: 'filterOn'; 
  excludeRegSho?: 'true';
  catalystOnly?: 'true';
}

export type Theme = 'light' | 'dark';

export interface KeyMetricVisibility {
  stocksPassingFilters: boolean;
  avgDebtEbitda: boolean;
  avgEvEbit: boolean;
  avgFcfNi: boolean;
  avgRotce: boolean;
  price: boolean;
  simpleScore: boolean; 
  debtEbitdaIndividual: boolean;
  evEbitIndividual: boolean;
  fcfNiIndividual: boolean;
  rotceIndividual: boolean;
  interestCoverageTTM?: boolean; 
  avgRotce5yr?: boolean; 
  daysToExitPosition?: boolean; 
  pncaRatio?: boolean;
  shareCountCAGR3yr?: boolean;
  grossMarginTrend?: boolean;
  incrementalROIC?: boolean;
  insiderOwnershipPercentage?: boolean;
  netInsiderBuyTxLast6M?: boolean;
  // Added for new score components display if needed
  netCashToMarketCapRatio?: boolean;
  insiderBuyValueToMarketCapRatio?: boolean;
  revenueCAGR?: boolean;
  // Sprint 2 Rank Momentum
  rankMomentum63?: boolean;
}

export interface DisplayMetricConfig {
  id: keyof Stock | keyof KeyMetricVisibility | 'avgDebtEbitda' | 'avgEvEbit' | 'avgFcfNi' | 'avgRotce' | 'stocksPassingFilters' | 'debtEbitdaIndividual' | 'evEbitIndividual' | 'fcfNiIndividual' | 'rotceIndividual' | 'simpleScore' | 'interestCoverageTTM' | 'avgRotce5yr' | 'daysToExitPosition' | 'pncaRatio' | 'shareCountCAGR3yr' | 'grossMarginTrend' | 'incrementalROIC' | 'insiderOwnershipPercentage' | 'netInsiderBuyTxLast6M' | 'netCashToMarketCapRatio' | 'insiderBuyValueToMarketCapRatio' | 'revenueCAGR' | 'rankMomentum63';
  label: string;
  type: 'summary' | 'individual' | 'custom'; // Added 'custom' for watchlist star
  dataKey?: keyof Stock; 
  alwaysVisible?: boolean; 
  formatter?: (value: any, stock?: Stock) => string | React.ReactNode; 
  sortable?: boolean; 
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface SubFilterGroupDef {
  id: string; 
  title: string;
  options: FilterOption[];
  tooltip?: string;
  controlType?: 'buttons' | 'slider' | 'checkbox' | 'checkboxes'; 
  sliderMin?: number; 
  sliderMax?: number; 
  sliderStep?: number; 
  sliderDefault?: number; 
  checkboxValue?: string; 
}

export interface FilterGroupDef {
  id: string; 
  title: string;
  emoji: string;
  tooltip?: string;
  subGroups?: SubFilterGroupDef[];
  options?: FilterOption[]; 
  controlType?: 'checkboxes' | 'buttons'; 
}

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  filters: ActiveFilters;
}

export type StyleTag = '⚡ High Momentum' | '🛡️ Deep Value' | '🌱 Quality Compounder' | ' profitableTTM' | 'highPE';


// FMP API Response Types
export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  marketCap: number | null;
  avgVolume: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  exchange: string;
  pe: number | null; 
  sharesOutstanding?: number | null; 
  change?: number; 
  changesPercentage?: number; 
}

export interface FMPRatiosTTM {
  symbol: string;
  debtEquityRatioTTM: number | null;
  priceEarningsRatioTTM: number | null;
  returnOnEquityTTM: number | null;
  returnOnTangibleEquityTTM: number | null; 
  netIncomePerShareTTM?: number | null;
  interestCoverageTTM?: number | null; 
}

export interface FMPKeyMetricsTTM {
  symbol: string;
  debtToEbitdaTTM: number | null;
  enterpriseValueOverEBITDATTM: number | null; 
  freeCashFlowPerShareTTM?: number | null;
}

export interface FMPProfile {
    symbol: string;
    price: number;
    beta: number;
    volAvg: number;
    mktCap: number;
    lastDiv: number;
    range: string;
    changes: number;
    companyName: string;
    currency: string;
    cik: string;
    isin: string;
    cusip: string;
    exchange: string;
    exchangeShortName: string;
    industry: string;
    website: string;
    description: string;
    ceo: string;
    sector: string;
    country: string;
    fullTimeEmployees: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    dcfDiff: number;
    dcf: number;
    image: string;
    ipoDate: string;
    defaultImage: boolean;
    isEtf: boolean;
    isActivelyTrading: boolean;
    isAdr: boolean;
    isFund: boolean;
}

export interface FMPScreenerResult {
    symbol: string;
    companyName: string;
    marketCap: number | null;
    sector: string | null;
    industry: string | null;
    beta: number | null;
    price: number | null;
    lastAnnualDividend: number | null;
    volume: number | null;
    exchange: string | null;
    exchangeShortName: string | null;
    country: string | null;
    isEtf: boolean;
    isActivelyTrading: boolean;
    isFund?: boolean; 
}

export interface FMPStockNewsItem {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export interface FMPHistoricalPriceDataEntry { 
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  unadjustedVolume: number;
  change: number;
  changePercent: number;
  vwap: number;
  label: string;
  changeOverTime: number;
}
export interface FMPHistoricalPriceData {
  symbol: string;
  historical: FMPHistoricalPriceDataEntry[];
}


export interface FMPAnnualIncomeStatement {
    date: string;
    symbol: string;
    reportedCurrency: string;
    cik: string;
    fillingDate: string;
    acceptedDate: string;
    calendarYear: string;
    period: string;
    revenue: number; 
    costOfRevenue: number;
    grossProfit: number;
    grossProfitRatio: number; 
    researchAndDevelopmentExpenses: number;
    generalAndAdministrativeExpenses: number;
    sellingAndMarketingExpenses: number;
    sellingGeneralAndAdministrativeExpenses: number;
    otherExpenses: number;
    operatingExpenses: number;
    costAndExpenses: number;
    interestIncome: number;
    interestExpense: number;
    depreciationAndAmortization: number;
    ebitda: number;
    ebitdaratio: number;
    operatingIncome: number; 
    operatingIncomeRatio: number;
    totalOtherIncomeExpensesNet: number;
    incomeBeforeTax: number; 
    incomeBeforeTaxRatio: number;
    incomeTaxExpense: number; 
    netIncome: number;
    netIncomeRatio: number;
    eps: number;
    epsdiluted: number;
    weightedAverageShsOut: number; 
    weightedAverageShsOutDil: number; 
    link: string;
    finalLink: string;
}

export interface FMPAnnualBalanceSheet {
    date: string;
    symbol: string;
    reportedCurrency: string;
    cik: string;
    fillingDate: string;
    acceptedDate: string;
    calendarYear: string;
    period: string;
    cashAndCashEquivalents: number; 
    shortTermInvestments: number;
    cashAndShortTermInvestments: number;
    netReceivables: number;
    inventory: number;
    otherCurrentAssets: number;
    totalCurrentAssets: number; 
    propertyPlantEquipmentNet: number;
    goodwill: number | null; 
    intangibleAssets: number | null; 
    goodwillAndIntangibleAssets: number | null; 
    longTermInvestments: number;
    taxAssets: number;
    otherNonCurrentAssets: number;
    totalNonCurrentAssets: number;
    otherAssets: number;
    totalAssets: number;
    accountPayables: number;
    shortTermDebt: number;
    taxPayables: number;
    deferredRevenue: number;
    otherCurrentLiabilities: number;
    totalCurrentLiabilities: number;
    longTermDebt: number;
    deferredRevenueNonCurrent: number;
    deferredTaxLiabilitiesNonCurrent: number;
    otherNonCurrentLiabilities: number;
    totalNonCurrentLiabilities: number;
    otherLiabilities: number;
    capitalLeaseObligations: number;
    totalLiabilities: number; 
    preferredStock: number;
    commonStock: number; 
    retainedEarnings: number;
    accumulatedOtherComprehensiveIncomeLoss: number;
    othertotalStockholdersEquity: number;
    totalStockholdersEquity: number; 
    totalEquity: number;
    totalLiabilitiesAndStockholdersEquity: number;
    minorityInterest: number;
    totalLiabilitiesAndTotalEquity: number;
    totalInvestments: number;
    totalDebt: number; 
    netDebt: number;
    link: string;
    finalLink: string;
}


export interface FMPInstitutionalOwnership { 
  symbol: string;
  cik: string | null;
  date: string;
  institutionalOwnershipPercentage: number | null;
  numberOfInstitutionalPositions: number | null;
  totalInstitutionalValue: number | null;
}

export interface FMPTopInstitutionalHolder { 
  holder: string;
  shares: number;
  dateReported: string;
  change: number; 
  weight?: number | null; 
}

export interface FMPEarningsTranscriptMeta { 
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  url: string; 
}

export interface FMPInsiderTradingItem {
  symbol: string;
  filingDate: string; 
  transactionDate: string; 
  reportingCik: string;
  reportingName: string;
  formType: string; 
  securitiesOwned: number;
  securitiesTransacted: number;
  transactionType: "P-Purchase" | "S-Sale" | string; 
  price: number;
  securityName: string;
  link: string;
}

export interface FMPInsiderOwnershipItem { 
    symbol: string;
    cik: string;
    date: string; 
    companyName: string;
    source: string;
    filingDate: string; 
    investorName: string; 
    ownershipType: string; 
    sharesHeld: number;
    changeInOwnership: number;
    ownershipPercentage: number | null; 
    isDirector: boolean;
    isOfficer: boolean;
    isTenPercentOwner: boolean;
    officerTitle: string | null;
}

export type SortKey = keyof Stock | 'simpleScore';
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { key: SortKey; direction: SortDirection; } | null;

// Sprint 2: Toast Message System
export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; 
  sessionStorageKey?: string; 
}

export interface FMPEarningCalendarItem { 
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string; 
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
}

// Sprint 2-E: Watchlist Extras
export interface WatchlistExtra {
  symbol: string;
  priceChangePct: number | null | undefined; // FMP API might return null/undefined for changesPercentage
  nextEarnings: string; // Will be date string or '—'
}

// Simple Mode
export interface SimpleFilterValues {
  size: number;
  value: number;
  quality: number;
}

// Sprint 3-B: Benchmark Card
export interface BenchmarkAverages {
    ownerEarningsYield: number | 'N/A';
    revenueCAGR5yr: number | 'N/A';
    avgRotce5yr: number | 'N/A';
    netCashToMarketCapRatio: number | 'N/A';
    rankMomentum63: number | 'N/A';
}
