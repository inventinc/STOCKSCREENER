
import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if your types.ts is elsewhere

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

// Helper to create a mock stock object with overrides
const mockStock = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Technology',
  price: Math.random() * 100 + 50,
  simpleScore: Math.floor(Math.random() * 60) + 20, // Score between 20-80
  marketCap: (Math.random() * 10 + 1) * 1e9,
  avgVolume: Math.random() * 1e6 + 1e5,
  sharesOutstanding: (Math.random() * 50 + 10) * 1e6,
  peRatioTTM: Math.random() * 20 + 5,
  debtEquityRatioTTM: Math.random() * 1.5,
  returnOnEquityTTM: Math.random() * 0.3 - 0.1,
  debtToEbitdaTTM: Math.random() * 5,
  enterpriseValueOverEBITDATTM: Math.random() * 15 + 3,
  freeCashFlowPerShareTTM: Math.random() * 10 - 2,
  netIncomePerShareTTM: Math.random() * 5 + 1,
  fcfNiRatioTTM: Math.random() * 1.5 + 0.5,
  interestCoverageTTM: Math.random() * 10 + 1,
  pncaRatio: Math.random() * 2,
  shareCountCAGR3yr: Math.random() * 0.1 - 0.05,
  grossMarginTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as 'improving' | 'stable' | 'declining',
  incrementalROIC: Math.random() * 0.3,
  netInsiderBuyTxLast6M: Math.floor(Math.random() * 10) - 5,
  insiderOwnershipPercentage: Math.random() * 30,
  avgRotce5yr: Math.random() * 0.25,
  daysToExitPosition: Math.random() * 20 + 1,
  netCashToMarketCapRatio: Math.random() * 0.5 - 0.1,
  insiderBuyValueToMarketCapRatio: Math.random() * 0.005,
  revenueCAGR: Math.random() * 0.2,
  hasCatalyst: Math.random() > 0.8,
  score63DaysAgo: overrides.simpleScore !== undefined ? Math.max(0, Math.min(100, Math.round(overrides.simpleScore - (overrides.rankMomentum63 || 0)))) : Math.floor(Math.random() * 60) + 20,
  rankMomentum63: overrides.simpleScore !== undefined && overrides.score63DaysAgo !== undefined ? overrides.simpleScore - overrides.score63DaysAgo : Math.floor(Math.random() * 21) - 10, // -10 to +10 momentum

  // Ensure all required string fields from Stock type are present
  debtEbitda: "N/A", 
  evEbit: "N/A", 
  fcfNi: "N/A", 
  rotce: "N/A", 
  marketCapCategory: "mid",
  volumeCategory: "medium",
  debtCategory: "medium",
  valuationCategory: "blend",
  rotceCategory: "average",
  numericDebtEbitdaCategory: "",
  numericFcfNiCategory: "",
  shareCountCagrCategory: "flat", 
  numericEvEbitCategory: "",
  deepValueCategory: "N/A",
  moatKeywordsCategory: "N/A", 
  insiderOwnershipCategory: "N/A", 
  netInsiderBuysCategory: "N/A",
  grossMarginTrendCategory: "N/A",
  incrementalRoicCategory: "N/A",
  redFlagsCategory: "N/A",
  ...overrides, // Apply specific overrides
});


// Helper to set up mocks and navigate
async function setupPageWithStocks(page: Page, stocksData: Stock[]) {
  // Mock the primary stock list fetch
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = stocksData.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap, sector: s.sector,
        industry: s.industry || "General", beta: 1.0, price: s.price,
        lastAnnualDividend: 0, volume: s.avgVolume, exchange: "NASDAQ",
        exchangeShortName: "NASDAQ", country: "US", isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  // Mock detailed data fetches for each stock
  for (const stock of stocksData) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock, yearHigh: stock.price * 1.2, yearLow: stock.price * 0.8 }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", revenue: stock.marketCap ? stock.marketCap / 2 : 5e8, netIncome: 5e7, weightedAverageShsOutDil: stock.sharesOutstanding }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", totalCurrentAssets: 2e8, totalLiabilities: 1e8, commonStock: stock.sharesOutstanding }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }
  
  await page.goto(BASE_URL);
  await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
  await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });
}

async function openSidebarIfNeeded(page: Page) {
  const sidebarButton = page.locator('button[aria-label="Open filters"]');
  if (await sidebarButton.isVisible()) {
    await sidebarButton.click();
    await expect(page.locator('aside.sidebar.sidebar-mobile-open')).toBeVisible();
  }
}

async function getStockCardOrRowLocator(page: Page, stockSymbol: string, view: 'card' | 'table') {
    if (view === 'card') {
        return page.locator(`div.stock-card:has-text("${stockSymbol}")`);
    }
    return page.locator(`table.stock-table tr:has-text("${stockSymbol}")`);
}

test.describe('Sprint 2 - Rank Momentum Filter', () => {
  const stocks: Stock[] = [
    mockStock('POSMOM', { simpleScore: 70, score63DaysAgo: 60, rankMomentum63: 10 }), // Positive momentum
    mockStock('NEGMOM', { simpleScore: 50, score63DaysAgo: 60, rankMomentum63: -10 }), // Negative momentum
    mockStock('ZEROMOM', { simpleScore: 80, score63DaysAgo: 80, rankMomentum63: 0 }),   // Zero momentum
    mockStock('HIGHMOM', { simpleScore: 85, score63DaysAgo: 70, rankMomentum63: 15 }), // Positive momentum
  ];

  for (const view of ['card', 'table'] as const) {
    test(`Momentum > 0 filter works in ${view} view`, async ({ page }) => {
      await setupPageWithStocks(page, stocks);
      if (view === 'table') {
        await page.locator('button:has-text("Table View")').click();
        await expect(page.locator('table.stock-table')).toBeVisible();
      }

      await openSidebarIfNeeded(page);

      // Open the "Rank Momentum" accordion if it exists and is not open
      const momentumAccordionHeader = page.locator('div.filter-group-bg h4:has-text("Rank Momentum")');
      if (await momentumAccordionHeader.isVisible()){
          const accordionButton = momentumAccordionHeader.locator('xpath=./ancestor::div[contains(@class, "cursor-pointer")]');
          const isExpanded = await accordionButton.getAttribute('aria-expanded');
          if(isExpanded === 'false'){
              await accordionButton.click();
          }
      }
      
      const momentumFilterButton = page.locator('button.filter-btn[data-filter-value="positive"]:has-text("Momentum > 0")');
      await expect(momentumFilterButton).toBeVisible();
      await momentumFilterButton.click();
      await page.waitForTimeout(500); // Allow filter application

      // Verify POSMOM and HIGHMOM are visible
      await expect(await getStockCardOrRowLocator(page, 'POSMOM', view)).toBeVisible();
      await expect(await getStockCardOrRowLocator(page, 'HIGHMOM', view)).toBeVisible();
      
      // Verify NEGMOM and ZEROMOM are NOT visible
      await expect(await getStockCardOrRowLocator(page, 'NEGMOM', view)).not.toBeVisible();
      await expect(await getStockCardOrRowLocator(page, 'ZEROMOM', view)).not.toBeVisible();

      // Assert that visible stocks show the up arrow
      const visibleStockSymbols = ['POSMOM', 'HIGHMOM'];
      for (const symbol of visibleStockSymbols) {
        const stockElement = await getStockCardOrRowLocator(page, symbol, view);
        if (view === 'card') {
          // In card view, arrow is next to the score
          const scoreArea = stockElement.locator('.score-badge').locator('xpath=./following-sibling::span | ./parent::div[.//span[contains(@class, "score-badge")]]');
          await expect(scoreArea).toContainText('▲');
        } else {
          // In table view, arrow is in the 'Mom.' column
          const momentumCell = stockElement.locator('td').filter({ hasText: '▲' }); // This assumes the arrow is direct text
          await expect(momentumCell.first()).toBeVisible(); // Check if any cell in the row contains the arrow
        }
      }
    });
  }
});

