

import { KeyMetricVisibility, DisplayMetricConfig, FilterGroupDef, Preset, Stock } from './types';

export const STOCKS_PER_PAGE = 15;
export const INITIAL_STOCK_LOAD_COUNT = 50; 
export const NA_STRING = "N/A"; 
export const HISTORICAL_YEARS_FOR_TRENDS = 3; // Used for CAGR (e.g. Revenue CAGR, Share Count CAGR), trends like GM trend
export const HISTORICAL_YEARS_FOR_AVG = 5; // Specifically for 5-year averages like ROTCE

export const INITIAL_KEY_METRICS_VISIBILITY: KeyMetricVisibility = {
  stocksPassingFilters: true,
  avgDebtEbitda: true,
  avgEvEbit: true,
  avgFcfNi: true,
  avgRotce: true, 
  price: true,
  simpleScore: true, 
  debtEbitdaIndividual: true,
  evEbitIndividual: true,
  fcfNiIndividual: true,
  rotceIndividual: true,
  interestCoverageTTM: true,
  avgRotce5yr: true,
  daysToExitPosition: false,
  pncaRatio: false,
  shareCountCAGR3yr: false,
  grossMarginTrend: false,
  incrementalROIC: false,
  insiderOwnershipPercentage: false,
  netInsiderBuyTxLast6M: false,
  netCashToMarketCapRatio: false,
  insiderBuyValueToMarketCapRatio: false,
  revenueCAGR: false,
  rankMomentum63: true, // Added for Sprint 2
};

const renderMomentumArrow = (value: number | undefined | null): string | React.ReactNode => {
  if (value === undefined || value === null || value === 0) return '';
  if (value > 0) return '▲'; // Green arrow preferred with styling if possible
  return '▼'; // Red arrow preferred
};

export const DISPLAY_METRICS_CONFIG: DisplayMetricConfig[] = [
  { id: 'stocksPassingFilters', label: 'Stocks Passing', type: 'summary' },
  { id: 'avgDebtEbitda', label: 'Avg. Debt/EBITDA', type: 'summary' },
  { id: 'avgEvEbit', label: 'Avg. EV/EBITDA', type: 'summary' }, 
  { id: 'avgFcfNi', label: 'Avg. FCF/NI', type: 'summary' },
  { id: 'avgRotce', label: 'Avg. ROE (TTM)', type: 'summary' },
  
  { id: 'symbol', label: 'Symbol', type: 'individual', dataKey: 'symbol', alwaysVisible: true, sortable: true },
  { id: 'name', label: 'Name', type: 'individual', dataKey: 'name', alwaysVisible: true, sortable: true },
  { id: 'sector', label: 'Sector', type: 'individual', dataKey: 'sector', alwaysVisible: true, sortable: true },
  { id: 'price', label: 'Price', type: 'individual', dataKey: 'price', alwaysVisible: false, formatter: (val) => val ? `$${Number(val).toFixed(2)}` : NA_STRING, sortable: true},
  { id: 'simpleScore', label: 'Score', type: 'individual', dataKey: 'simpleScore', alwaysVisible: false, sortable: true }, 
  { 
    id: 'rankMomentum63', 
    label: 'Mom.', // Short label for table
    type: 'individual', 
    dataKey: 'rankMomentum63', 
    formatter: (val, stock) => renderMomentumArrow(stock?.rankMomentum63), // Display arrow, actual value for sorting
    sortable: true 
  },
  { id: 'debtEbitdaIndividual', label: 'Debt/EBITDA', type: 'individual', dataKey: 'debtEbitda', alwaysVisible: false, sortable: true },
  { id: 'evEbitIndividual', label: 'EV/EBITDA', type: 'individual', dataKey: 'evEbit', alwaysVisible: false, sortable: true }, 
  { id: 'fcfNiIndividual', label: 'FCF/NI', type: 'individual', dataKey: 'fcfNi', alwaysVisible: false, sortable: true },
  { id: 'rotceIndividual', label: 'ROE (TTM)', type: 'individual', dataKey: 'rotce', alwaysVisible: false, sortable: true }, 

  // Core metrics for Sprint 1 filters
  { id: 'interestCoverageTTM', label: 'Interest Cov.', type: 'individual', dataKey: 'interestCoverageTTM', formatter: (val) => typeof val === 'number' ? val.toFixed(1) + 'x' : NA_STRING, sortable: true },
  { id: 'avgRotce5yr', label: 'Avg ROE (5yr)', type: 'individual', dataKey: 'avgRotce5yr', formatter: (val) => typeof val === 'number' ? (val * 100).toFixed(1) + '%' : NA_STRING, sortable: true },
  { id: 'daysToExitPosition', label: 'Days to Exit 5%', type: 'individual', dataKey: 'daysToExitPosition', formatter: (val) => typeof val === 'number' ? val.toFixed(1) + 'd' : NA_STRING, sortable: true },
  { id: 'pncaRatio', label: 'P/NCAV', type: 'individual', dataKey: 'pncaRatio', formatter: (val) => typeof val === 'number' ? val.toFixed(2) + 'x' : NA_STRING, sortable: true },
  
  // Other existing metrics
  { id: 'shareCountCAGR3yr', label: 'Share CAGR (3yr)', type: 'individual', dataKey: 'shareCountCAGR3yr', formatter: (val) => typeof val === 'number' ? (val * 100).toFixed(1) + '%' : NA_STRING, sortable: true },
  { id: 'grossMarginTrend', label: 'GM Trend', type: 'individual', dataKey: 'grossMarginTrend', formatter: (val) => val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : NA_STRING, sortable: true },
  { id: 'incrementalROIC', label: 'Inc. ROIC', type: 'individual', dataKey: 'incrementalROIC', formatter: (val) => typeof val === 'number' ? (val * 100).toFixed(1) + '%' : NA_STRING, sortable: true },
  { id: 'insiderOwnershipPercentage', label: 'Insider Own %', type: 'individual', dataKey: 'insiderOwnershipPercentage', formatter: (val) => typeof val === 'number' ? val.toFixed(1) + '%' : NA_STRING, sortable: true },
  { id: 'netInsiderBuyTxLast6M', label: 'Net Insider Buys (6M)', type: 'individual', dataKey: 'netInsiderBuyTxLast6M', sortable: true },

  // New score component metrics (can be added via customize)
  { id: 'netCashToMarketCapRatio', label: 'Net Cash/MCap', type: 'individual', dataKey: 'netCashToMarketCapRatio', formatter: (val) => typeof val === 'number' ? (val * 100).toFixed(1) + '%' : NA_STRING, sortable: true },
  { id: 'insiderBuyValueToMarketCapRatio', label: 'Insider Buy Val/MCap', type: 'individual', dataKey: 'insiderBuyValueToMarketCapRatio', formatter: (val) => typeof val === 'number' ? (val * 1000).toFixed(2) + '‰' : NA_STRING, sortable: true }, // Per mille for small ratios
  { id: 'revenueCAGR', label: 'Rev CAGR (3yr)', type: 'individual', dataKey: 'revenueCAGR', formatter: (val) => typeof val === 'number' ? (val * 100).toFixed(1) + '%' : NA_STRING, sortable: true },
];

export const STOCK_DATA_BASE = [ /* Fallback data, not primary */ ];

export const FILTER_GROUPS: FilterGroupDef[] = [
  {
    id: 'quickFilters', title: 'Quick Filters', emoji: '⚡',
    tooltip: 'Commonly used one-click filters.',
    subGroups: [
       {
        id: 'catalystFilter', title: 'Special Situations ⭐',
        tooltip: "Filters for stocks with a confirmed special-situation catalyst (e.g., spin-off).",
        options: [{value: 'true', label: 'Catalyst only ⭐'}],
        controlType: 'buttons',
      },
      {
        id: 'rankMomentumFilter', title: 'Momentum Filter',
        tooltip: "Filters based on changes in stock's simple score.",
        options: [{value: 'positive', label: 'Momentum > 0'}],
        controlType: 'buttons',
      }
    ]
  },
  {
    id: 'companySizeAndLiquidity', title: 'Company Size & Liquidity', emoji: '🏢',
    subGroups: [
      { 
        id: 'marketCap', 
        title: 'Market Cap', 
        tooltip: "Market capitalization.", 
        options: [
          {value: 'nano', label: 'Nano Cap (< $50M)'},
          {value: 'micro', label: 'Micro Cap ($50M-$300M)'}, 
          {value: 'small', label: 'Small Cap ($300M-$2B)'}, 
          {value: 'midLarge', label: 'Mid/Large Cap (> $2B)'}
        ]
      },
      { 
        id: 'volume', 
        title: 'Avg. Daily Volume', 
        tooltip: "Average number of shares traded per day.", 
        options: [
          {value: 'high', label: 'High Vol (>1M)'}, 
          {value: 'medium', label: 'Med Vol (100k-1M)'}, 
          {value: 'low', label: 'Low Vol (<100k)'}
        ]
      },
      {
        id: 'liquiditySafety', title: 'Liquidity Safety (Days to Exit 5% Position)',
        tooltip: 'Estimated days to sell 5% of outstanding shares, trading 10% of average daily volume. Lower is better.',
        controlType: 'slider', sliderMin: 1, sliderMax: 30, sliderStep: 1, sliderDefault: 10, // Default to a reasonable max
        options: [] 
      }
    ]
  },
  {
    id: 'capitalStructure', title: 'Capital Structure & Solvency', emoji: '🏗️',
    tooltip: "How a company finances its operations and its ability to meet long-term obligations.",
    subGroups: [
      { 
        id: 'debtEquityRatio', 
        title: 'Debt/Equity Ratio', 
        tooltip: "Compares total liabilities to shareholder equity.", 
        options: [
          {value: 'low', label: 'Low D/E (<0.5)'}, 
          {value: 'medium', label: 'Med D/E (0.5-1)'}, 
          {value: 'high', label: 'High D/E (>1)'}
        ]
      },
      { 
        id: 'debtToEbitda', 
        title: 'Debt/EBITDA', 
        tooltip: "Company's ability to pay off debt. Lower is often better.", 
        options: [{value: 'le1x', label: '≤ 1x'}, {value: 'le0.5x', label: '≤ 0.5x'}, {value: 'le0.25x', label: '≤ 0.25x'}]
      },
      {
        id: 'interestCoverage', title: 'Interest Coverage (TTM)',
        tooltip: 'Company\'s ability to pay interest on outstanding debt (EBIT/Interest Expense). Higher is better. Default filter shows >= 3x.',
        controlType: 'slider', sliderMin: 0, sliderMax: 20, sliderStep: 1, sliderDefault: 3, 
        options: [] 
      },
    ]
  },
  {
    id: 'profitability', title: 'Profitability', emoji: '💰',
    tooltip: "Company's ability to generate profit relative to its revenue, assets, equity.",
    subGroups: [
       { 
        id: 'roe', 
        title: 'Return on Equity (ROE TTM)', 
        tooltip: "Profitability relative to shareholder equity. Net Income / Shareholder's Equity (TTM).", 
        options: [
          {value: 'excellent', label: 'Excellent (>20%)'}, 
          {value: 'good', label: 'Good (15-20%)'}, 
          {value: 'average', label: 'Average (10-15%)'}, 
          {value: 'poor', label: 'Poor (<10%)'}
        ]
      },
      { 
        id: 'avgRotce5yr', 
        title: '5-Year Average ROE', 
        tooltip: "Average Return on Equity over the last 5 years.", 
        options: [
          {value: 'gt20', label: '> 20%'}, 
          {value: 'gt15', label: '> 15%'}, 
          {value: 'gt10', label: '> 10%'},
          {value: 'anyPositive', label: 'Any Positive'}
        ]
      },
      { 
        id: 'fcfToNetIncome', 
        title: 'FCF/Net Income Ratio', 
        tooltip: "Free Cash Flow to Net Income. Ratio > 1 can indicate high earnings quality.", 
        options: [{value: 'ge0.8', label: '≥ 0.8'}, {value: 'ge1.0', label: '≥ 1.0'}, {value: 'ge1.2', label: '≥ 1.2'}]
      },
      { 
        id: 'gmTrend', 
        title: 'Gross Margin Trend (3yr)', 
        tooltip: "Direction of gross profit margin over last 3 years.", 
        options: [{value: 'improving', label: 'Improving'}, {value: 'stable', label: 'Stable'}, {value: 'declining', label: 'Declining'}, {value: 'any', label: 'Any'}]
      },
    ]
  },
  {
    id: 'capitalDiscipline', title: 'Capital Discipline', emoji: '⚖️',
    tooltip: "How well a company manages its investments and capital allocation.",
    subGroups: [
      { 
        id: 'incRoic', 
        title: 'Incremental ROIC', 
        tooltip: "Return on new capital invested (latest year vs prior).", 
        options: [{value: 'ge15pct', label: '≥ 15%'}, {value: 'ge20pct', label: '≥ 20%'}, {value: 'ge25pct', label: '≥ 25%'}]},
      { 
        id: 'shareCountChange', 
        title: 'Share Count Change (3yr CAGR)', 
        tooltip: "3-year compound annual growth rate of shares outstanding. Negative (buybacks) often positive.", 
        options: [
            {value: 'reduction_large', label: 'Large Reduction (≤ -5%)'}, 
            {value: 'reduction_small', label: 'Small Reduction (-5% to <0%)'}, 
            {value: 'flat', label: 'Flat (~0%)'},
            {value: 'increasing', label: 'Increasing (>0%)'}
        ]},
    ]
  },
  {
    id: 'valuation', title: 'Valuation', emoji: '💎',
    tooltip: "Metrics to assess if a stock is under or overvalued.",
    subGroups: [
       { 
        id: 'peRatio', 
        title: 'Price/Earnings (P/E) Ratio', 
        tooltip: "Stock price relative to earnings per share.", 
        options: [
          {value: 'value', label: 'Value (<15 P/E)'}, 
          {value: 'growth', label: 'Growth (>25 P/E)'}, 
          {value: 'blend', label: 'Blend (15-25 P/E)'}
        ]
      },
      { 
        id: 'evToEbit', 
        title: 'EV/EBITDA', 
        tooltip: "Enterprise Value to EBITDA. Lower values often preferred.", 
        options: [{value: 'le10x', label: '≤ 10x'}, {value: 'le8x', label: '≤ 8x'}, {value: 'le6x', label: '≤ 6x'}]
      },
      { 
        id: 'priceToNCAV', 
        title: 'Price/Net Current Asset Value (P/NCAV)', 
        tooltip: "P/NCAV < 1 may indicate deep value. NCAV = Current Assets - Total Liabilities.", 
        options: [
            {value: 'le0.5', label: '≤ 0.5x'}, 
            {value: 'le0.8', label: '≤ 0.8x'}, 
            {value: 'le1.0', label: '≤ 1.0x'}
        ]
      },
      {
        id: 'ncavSafety', title: 'NCAV Safety Check (P/NCAV ≤ 0.66x)',
        tooltip: 'Filters for stocks where Price is less than or equal to 0.66 times Net Current Asset Value. This is a specific deep value criterion.',
        controlType: 'checkbox',
        checkboxValue: 'le0_66', 
        options: [{value: 'le0_66', label: 'Price ≤ 0.66 × NCAV'}],
      }
    ]
  },
  {
    id: 'ownershipGovernance', title: 'Ownership & Governance', emoji: '👥',
    tooltip: "Factors related to company ownership, insider activity, and governance.",
    subGroups: [
       { 
        id: 'insiderOwn', 
        title: 'Insider Ownership %', 
        tooltip: "Stock held by insiders (officers, directors, 10%+ owners).", 
        options: [
            {value: 'ge5', label: '≥ 5%'}, 
            {value: 'ge10', label: '≥ 10%'}, 
            {value: 'ge20', label: '≥ 20%'}
        ]},
      { 
        id: 'netInsiderTrx', 
        title: 'Net Insider Buys (Last 6M)', 
        tooltip: "Net number of insider buy transactions minus sell transactions in the last 6 months.", 
        options: [
            {value: 'net_buying', label: 'Net Buying (≥1 Tx)'}, 
            {value: 'neutral', label: 'Neutral (0 Tx)'}, 
            {value: 'net_selling', label: 'Net Selling (≤-1 Tx)'},
            {value: 'any', label: 'Any'}
        ]},
      { 
        id: 'rdFlags', 
        title: 'Exclude Red Flags', 
        tooltip: "Auditor changes, management exits. (Placeholder - data not live)", 
        options: [{value: 'auditChanges', label: 'Audit Changes'}, {value: 'managementExits', label: 'Mgmt Exits'}, {value: 'allRedFlags', label: 'All Red Flags'}]},
      {
        id: 'excludeRegSho', title: 'Reg-SHO Status',
        tooltip: "Hides stocks currently on the SEC’s hard-to-borrow list.",
        controlType: 'checkbox',
        checkboxValue: 'true',
        options: [{value: 'true', label: 'Exclude Reg-SHO names'}],
      }
    ]
  },
  {
    id: 'qualitativeAndCatalysts', title: 'Qualitative & Catalysts', emoji: '✨',
    tooltip: "Qualitative aspects and potential event-driven catalysts.",
    subGroups: [
      { 
        id: 'moatKws', 
        title: 'Moat Keywords', 
        tooltip: "Keywords in reports (e.g., 'competitive advantage'). (Placeholder - data not live)", 
        options: [{value: 'ge3', label: '≥ 3 hits'}, {value: 'ge5', label: '≥ 5 hits'}, {value: 'ge10', label: '≥ 10 hits'}]
      },
      {
        id: 'catalyst',
        title: 'Specific Catalysts',
        tooltip: 'Event-driven opportunities.',
        controlType: 'checkboxes',
        options: [
          { value: 'spinOff', label: 'Spin-off (Catalyst)' },
          { value: 'selfTender', label: 'Self-tender (Catalyst)' },
        ],
      }
    ]
  }
];

export const PRESETS: Preset[] = [
  { 
    id: 'deepValueNCAV', 
    name: "Deep Value (NCAV Focus)", 
    emoji: '🛡️', 
    description: "Low P/NCAV (≤0.66x), positive Interest Coverage (>1x), smaller cap stocks.", 
    filters: { marketCap: 'small', ncavSafety: 'le0_66', interestCoverage: '1' }
  },
  { 
    id: 'qualityCompoundersROE', 
    name: "Quality Compounders (ROE Focus)", 
    emoji: '🌱', 
    description: "High 5-Yr Avg ROE (>15%), good GM trend, reasonable debt, share buybacks.", 
    filters: { avgRotce5yr: 'gt15', debtEquityRatio: 'medium', marketCap: 'midLarge', gmTrend: 'improving', shareCountChange: 'reduction_small' }
  },
  { 
    id: 'insiderActivityFocus', 
    name: "Insider Activity Focus", 
    emoji: '📈', 
    description: "Focus on significant insider ownership and net buying activity, with decent liquidity.", 
    filters: { insiderOwn: 'ge10', netInsiderTrx: 'net_buying', volume: 'medium', liquiditySafety: '15' }
  },
  {
    id: 'positiveMomentumStocks', // Added for Sprint 2
    name: "Positive Momentum Stocks",
    emoji: '🚀',
    description: "Stocks where the simple score has increased in the last 63 days.",
    filters: { rankMomentum: 'positive' }
  },
  {
    id: 'catalystStocks',
    name: "Catalyst-Driven Stocks",
    emoji: '⭐',
    description: "Stocks with confirmed special-situation catalysts.",
    filters: { catalystOnly: 'true' }
  }
];