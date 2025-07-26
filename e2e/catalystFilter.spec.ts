

import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if necessary

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

const mockStock = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Industrials',
  price: 100,
  hasCatalyst: false,
  // Fill in other required Stock properties with defaults
  simpleScore: 50, marketCap: 1e9, avgVolume: 1e5, sharesOutstanding: 10e6,
  peRatioTTM: 15, debtEquityRatioTTM: 0.5, returnOnEquityTTM: 0.15,
  debtToEbitdaTTM: 2, enterpriseValueOverEBITDATTM: 8, freeCashFlowPerShareTTM: 5,
  netIncomePerShareTTM: 3, fcfNiRatioTTM: 1.6, interestCoverageTTM: 5,
  pncaRatio: 1, shareCountCAGR3yr: -0.01, grossMarginTrend: 'stable',
  incrementalROIC: 0.15, netInsiderBuyTxLast6M: 1, insiderOwnershipPercentage: 10,
  avgRotce5yr: 0.15, daysToExitPosition: 5, netCashToMarketCapRatio: 0.1,
  insiderBuyValueToMarketCapRatio: 0.001, revenueCAGR: 0.05,
  score63DaysAgo: 48, rankMomentum63: 2,
  debtEbitda: "2.0x", evEbit: "8.0x", fcfNi: "1.6", rotce: "15.0%",
  marketCapCategory: "mid", volumeCategory: "medium", debtCategory: "low",
  valuationCategory: "blend", rotceCategory: "good", numericDebtEbitdaCategory: "",
  numericFcfNiCategory: "", shareCountCagrCategory: "reduction_small", numericEvEbitCategory: "",
  deepValueCategory: "", moatKeywordsCategory: "", insiderOwnershipCategory: "",
  netInsiderBuysCategory: "", grossMarginTrendCategory: "stable",
  incrementalRoicCategory: "", redFlagsCategory: "",
  ...overrides,
});

async function setupPageWithStocks(page: Page, stocks: Stock[]) {
  // Mock the main stock list fetch to return our test stocks
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = stocks.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap, sector: s.sector,
        price: s.price, volume: s.avgVolume, isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  // Mock detailed data fetches for each stock
  for (const stock of stocks) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock, yearHigh: (stock.price || 0) * 1.2, yearLow: (stock.price || 0) * 0.8, sharesOutstanding: stock.sharesOutstanding || 10e6, avgVolume: stock.avgVolume || 1e5 }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v3/stock_news?tickers=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/institutional-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v3/institutional-holder/${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/batch_earning_call_transcript/${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v3/historical-price-full/${stock.symbol}*`, route => route.fulfill({ json: { historical: [] } }));
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

test.describe('Catalyst Filter and UI', () => {
  const stocks = [
    mockStock('CAT1', { name: 'Catalyst Corp', hasCatalyst: true }),
    mockStock('NOCAT', { name: 'No Catalyst Inc', hasCatalyst: false }),
    mockStock('CAT2', { name: 'Special Sit Co', hasCatalyst: true }),
    mockStock('NORMAL', { name: 'Normal Industries', hasCatalyst: false }),
  ];

  test('should display star for catalyst stocks and filter correctly', async ({ page }) => {
    await setupPageWithStocks(page, stocks);
    
    // 1. Visual Cue Check
    const cat1Card = page.locator('div.stock-card:has-text("CAT1")');
    const nocatCard = page.locator('div.stock-card:has-text("NOCAT")');
    await expect(cat1Card.locator('span[title*="catalyst"]')).toBeVisible(); // Check for star via tooltip
    await expect(nocatCard.locator('span[title*="catalyst"]')).not.toBeVisible();

    // 2. Filter Functionality
    await openSidebarIfNeeded(page);
    await page.locator('h4:has-text("Quick Filters")').click();
    const catalystButton = page.locator('button:has-text("Catalyst only ⭐")');
    await catalystButton.click();

    // Assert correct stocks are visible/hidden
    await expect(page.locator('div.stock-card:has-text("Catalyst Corp")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Special Sit Co")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("No Catalyst Inc")')).not.toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Normal Industries")')).not.toBeVisible();
    await expect(page.locator('div.stock-card')).toHaveCount(2);

    // 3. URL State Check
    await expect(page).toHaveURL(/catalystOnly%22%3A%22true/);

    // 4. Modal Check
    await page.locator('div.stock-card:has-text("Catalyst Corp")').click();
    const modal = page.locator('div[aria-modal="true"]');
    await expect(modal).toBeVisible();
    const modalHeader = modal.locator('#stockDetailsModalTitle');
    await expect(modalHeader.locator('span[title*="catalyst"]')).toBeVisible();
  });

  test('should load filter state from URL', async ({ page }) => {
    // Setup mocks before navigating
    await setupPageWithStocks(page, stocks);
    
    // Go to URL with filter pre-applied
    const filters = { catalystOnly: 'true' };
    const urlWithFilter = `${BASE_URL}?filters=${encodeURIComponent(JSON.stringify(filters))}`;
    await page.goto(urlWithFilter);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('div.stock-card')).not.toHaveCount(0, { timeout: 15000 });

    // Verify filter is applied on load
    await expect(page.locator('div.stock-card')).toHaveCount(2);
    await expect(page.locator('div.stock-card:has-text("Catalyst Corp")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("No Catalyst Inc")')).not.toBeVisible();

    // Verify button in sidebar is active
    await openSidebarIfNeeded(page);
    await page.locator('h4:has-text("Quick Filters")').click();
    const catalystButton = page.locator('button:has-text("Catalyst only ⭐")');
    await expect(catalystButton).toHaveClass(/filter-btn-active/);
  });
});
