
import { test, expect, Page } from '@playwright/test';
import { Stock, BenchmarkAverages } from '../src/types'; // Adjust path

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

const mockStock = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Technology',
  price: 100,
  // Add defaults for all required properties of Stock
  simpleScore: 70, marketCap: 10e9, avgVolume: 1e6, sharesOutstanding: 100e6,
  peRatioTTM: 15, debtEquityRatioTTM: 0.5, returnOnEquityTTM: 0.2, debtToEbitdaTTM: 1.5,
  enterpriseValueOverEBITDATTM: 8, freeCashFlowPerShareTTM: 9, netIncomePerShareTTM: 5,
  fcfNiRatioTTM: 1.8, interestCoverageTTM: 10, pncaRatio: 1.5, shareCountCAGR3yr: -0.02,
  grossMarginTrend: 'stable', incrementalROIC: 0.18, netInsiderBuyTxLast6M: 2,
  insiderOwnershipPercentage: 15, avgRotce5yr: 0.18, daysToExitPosition: 5,
  netCashToMarketCapRatio: 0.1, insiderBuyValueToMarketCapRatio: 0.001, revenueCAGR: 0.1,
  hasCatalyst: false, score63DaysAgo: 65, rankMomentum63: 5, debtEbitda: "1.5x",
  evEbit: "8.0x", fcfNi: "1.8", rotce: "20.0%", marketCapCategory: "large",
  volumeCategory: "high", debtCategory: "low", valuationCategory: "blend",
  rotceCategory: "good", numericDebtEbitdaCategory: "", numericFcfNiCategory: "",
  shareCountCagrCategory: "reduction_small", numericEvEbitCategory: "", deepValueCategory: "",
  moatKeywordsCategory: "", insiderOwnershipCategory: "", netInsiderBuysCategory: "",
  grossMarginTrendCategory: "stable", incrementalRoicCategory: "", redFlagsCategory: "",
  ownerEarningsYield: 0.09, // 9%
  revenueCAGR5yr: 0.12, // 12%
  ...overrides,
});

async function setupPageWithMocks(page: Page, stocks: Stock[], sp500Averages: BenchmarkAverages) {
    // Mock stock list fetch (can be empty if not needed for the test)
    await page.route('**/api/v3/stock-screener*', route => route.fulfill({ json: stocks.map(s=>({symbol: s.symbol, name: s.name, companyName: s.name, price:s.price, marketCap: s.marketCap, sector:s.sector, isEtf: false, isActivelyTrading: true})) }));

    // Mock individual stock data fetches if needed by the app logic when stocks are rendered
    for(const stock of stocks) {
        await page.route(`**/api/v3/**/${stock.symbol}*`, route => route.fulfill({ json: [{...stock}] }));
        await page.route(`**/api/v4/**/${stock.symbol}*`, route => route.fulfill({ json: [] }));
    }

    // Intercept sessionStorage to inject the S&P500 averages
    await page.addInitScript((averages) => {
        window.sessionStorage.setItem('sp500Averages', JSON.stringify(averages));
    }, sp500Averages);

    await page.goto(BASE_URL);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
}

test.describe('Sprint 3-B: Benchmark Card', () => {

  const mockSp500Averages: BenchmarkAverages = {
    ownerEarningsYield: 0.05, // 5%
    revenueCAGR5yr: 0.08,     // 8%
    avgRotce5yr: 0.15,        // 15%
    netCashToMarketCapRatio: -0.05, // -5%
    rankMomentum63: 2.5,
  };

  test('should display green when passing stocks are better than S&P 500', async ({ page }) => {
    const passingStocks = [
      mockStock('GOOD1', { ownerEarningsYield: 0.10, avgRotce5yr: 0.25 }), // Better than S&P
      mockStock('GOOD2', { ownerEarningsYield: 0.08, avgRotce5yr: 0.23 }), // Better than S&P
    ];

    await setupPageWithMocks(page, passingStocks, mockSp500Averages);
    const benchmarkCard = page.locator('div:has(> h3:has-text("Screen Benchmark vs. S&P 500"))');
    await expect(benchmarkCard).toBeVisible();

    // Check Owner-Earnings Yield row
    const yieldRow = benchmarkCard.locator('tr:has-text("Owner-Earnings Yield")');
    const yourScreenCellYield = yieldRow.locator('td').nth(1);
    await expect(yourScreenCellYield).toHaveText('9.0%');
    await expect(yourScreenCellYield).toHaveClass(/bg-green-100/);

    // Check 5-yr Avg ROE row
    const roeRow = benchmarkCard.locator('tr:has-text("5-yr Avg ROE")');
    const yourScreenCellRoe = roeRow.locator('td').nth(1);
    await expect(yourScreenCellRoe).toHaveText('24.0%');
    await expect(yourScreenCellRoe).toHaveClass(/bg-green-100/);
  });

  test('should display red when passing stocks are worse than S&P 500', async ({ page }) => {
    const passingStocks = [
      mockStock('BAD1', { ownerEarningsYield: 0.02, netCashToMarketCapRatio: -0.10 }), // Worse than S&P
      mockStock('BAD2', { ownerEarningsYield: 0.03, netCashToMarketCapRatio: -0.15 }), // Worse than S&P
    ];

    await setupPageWithMocks(page, passingStocks, mockSp500Averages);
    const benchmarkCard = page.locator('div:has(> h3:has-text("Screen Benchmark vs. S&P 500"))');
    await expect(benchmarkCard).toBeVisible();
    
    // Check Owner-Earnings Yield row
    const yieldRow = benchmarkCard.locator('tr:has-text("Owner-Earnings Yield")');
    const yourScreenCellYield = yieldRow.locator('td').nth(1);
    await expect(yourScreenCellYield).toHaveText('2.5%');
    await expect(yourScreenCellYield).toHaveClass(/bg-red-100/);

    // Check Net-Cash / Mkt Cap row (higher is better, so -12.5% is worse than -5%)
    const netCashRow = benchmarkCard.locator('tr:has-text("Net-Cash / Mkt Cap")');
    const yourScreenCellNetCash = netCashRow.locator('td').nth(1);
    await expect(yourScreenCellNetCash).toHaveText('-12.5%');
    await expect(yourScreenCellNetCash).toHaveClass(/bg-red-100/);
  });
  
  test('should display N/A and neutral color when data is missing', async ({ page }) => {
    const sp500WithNA = { ...mockSp500Averages, revenueCAGR5yr: 'N/A' as const };
    const passingStocks = [
        mockStock('ANY', { revenueCAGR5yr: 0.10 }),
    ];

    await setupPageWithMocks(page, passingStocks, sp500WithNA);
    const benchmarkCard = page.locator('div:has(> h3:has-text("Screen Benchmark vs. S&P 500"))');
    
    const cagrRow = benchmarkCard.locator('tr:has-text("5-yr Rev CAGR")');
    const spCell = cagrRow.locator('td').nth(2);
    await expect(spCell).toHaveText('N/A');

    const yourScreenCell = cagrRow.locator('td').nth(1);
    await expect(yourScreenCell).toHaveClass(/bg-gray-100/);
  });
});
