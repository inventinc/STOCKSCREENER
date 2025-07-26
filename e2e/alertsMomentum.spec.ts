

import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if your types.ts is elsewhere

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';
const MOCK_STOCK_SYMBOL = 'POLTEST';

// Helper to create a mock stock object with overrides
const mockStockData = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Technology',
  price: Math.random() * 100 + 50,
  simpleScore: overrides.simpleScore !== undefined ? overrides.simpleScore : Math.floor(Math.random() * 60) + 20,
  score63DaysAgo: overrides.score63DaysAgo !== undefined ? overrides.score63DaysAgo : (overrides.simpleScore !== undefined && overrides.rankMomentum63 !== undefined ? overrides.simpleScore - overrides.rankMomentum63 : Math.floor(Math.random() * 60) + 20),
  rankMomentum63: overrides.rankMomentum63 !== undefined ? overrides.rankMomentum63 : (overrides.simpleScore !== undefined && overrides.score63DaysAgo !== undefined ? overrides.simpleScore - overrides.score63DaysAgo : Math.floor(Math.random() * 21) - 10),
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
  debtEbitda: "N/A", evEbit: "N/A", fcfNi: "N/A", rotce: "N/A", marketCapCategory: "mid",
  volumeCategory: "medium", debtCategory: "medium", valuationCategory: "blend", rotceCategory: "average",
  numericDebtEbitdaCategory: "", numericFcfNiCategory: "", shareCountCagrCategory: "flat", 
  numericEvEbitCategory: "", deepValueCategory: "N/A", moatKeywordsCategory: "N/A", 
  insiderOwnershipCategory: "N/A", netInsiderBuysCategory: "N/A", grossMarginTrendCategory: "N/A",
  incrementalRoicCategory: "N/A", redFlagsCategory: "N/A",
  ...overrides,
});

async function mockStockListApi(page: Page, stocks: Stock[]) {
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = stocks.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap, sector: s.sector,
        industry: s.industry || "General", beta: 1.0, price: s.price,
        lastAnnualDividend: 0, volume: s.avgVolume, exchange: "NASDAQ",
        exchangeShortName: "NASDAQ", country: "US", isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  for (const stock of stocks) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock, yearHigh: stock.price * 1.2, yearLow: stock.price * 0.8 }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", revenue: stock.marketCap ? stock.marketCap / 2 : 5e8, netIncome: 5e7, weightedAverageShsOutDil: stock.sharesOutstanding }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", totalCurrentAssets: 2e8, totalLiabilities: 1e8, commonStock: stock.sharesOutstanding }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }
}

test.describe('Sprint 2-C: Rank Momentum Toast Alert', () => {
  test.beforeEach(async ({ page }) => {
    // Enable __MOCK_POLL__ for the hook to listen to custom events
    await page.addInitScript(() => {
      window.__MOCK_POLL__ = true;
    });
  });

  test('toast appears when momentum turns positive, respects sessionStorage', async ({ page }) => {
    const initialStock = mockStockData(MOCK_STOCK_SYMBOL, { simpleScore: 50, rankMomentum63: -5 });
    await mockStockListApi(page, [initialStock]);
    
    await page.goto(BASE_URL);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });

    // 1. Initial state: No toast for MOCK_STOCK_SYMBOL
    await expect(page.locator(`div[role="alert"]:has-text("${MOCK_STOCK_SYMBOL} momentum just turned positive")`)).not.toBeVisible();

    // 2. Update stock data so momentum becomes positive
    const updatedStock = mockStockData(MOCK_STOCK_SYMBOL, { simpleScore: 60, rankMomentum63: 10 });
    await mockStockListApi(page, [updatedStock]); // Re-mock for next fetch

    // 3. Trigger a data refresh in the UI (e.g., click refresh button in header)
    // This updates allStocks in App.tsx, which then updates allStocksRef.current in useStockAlerts.
    await page.locator('button[aria-label="Refresh data"]').click();
    // Wait for loading to finish and data to re-render (important for allStocksRef to update in hook)
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    // It's possible the toast appears here due to useEffect[allStocks] in useStockAlerts.
    // We will check for it. If it does, the subsequent mockPoll won't show a *new* toast.

    // 4. Dispatch "mockPoll" event (optional if useEffect already caught it, but good for testing mockPoll handler)
    // The hook's mockPoll listener will use the *updated* allStocksRef.current.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("mockPoll")));
    
    // 5. Assert toast appears (once)
    const toastLocator = page.locator(`div[role="alert"]:has-text("📈 ${MOCK_STOCK_SYMBOL} momentum just turned positive")`);
    await expect(toastLocator).toBeVisible({ timeout: 5000 }); // Wait for toast to appear

    // 6. Dismiss the toast (simulating user click or auto-dismiss)
    // This should set sessionStorage for this toast
    await toastLocator.locator('button[aria-label="Dismiss notification"]').click();
    await expect(toastLocator).not.toBeVisible(); // Toast should be removed from DOM

    // Verify sessionStorage was set
    const isDismissed = await page.evaluate((symbol) => sessionStorage.getItem(`momentumToast_${symbol}`), MOCK_STOCK_SYMBOL);
    expect(isDismissed).toBe('true');

    // 7. Trigger another data refresh and mockPoll event with the same positive momentum data
    // (sessionStorage should prevent new toast)
    await mockStockListApi(page, [updatedStock]); // Ensure data is still positive momentum
    await page.locator('button[aria-label="Refresh data"]').click();
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("mockPoll")));

    // Assert toast does NOT reappear
    await expect(toastLocator).not.toBeVisible({ timeout: 1000 }); // Check for a short duration
  });
});