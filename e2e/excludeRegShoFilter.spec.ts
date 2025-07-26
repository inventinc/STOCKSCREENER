
import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if necessary

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

const mockStock = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Industrials',
  price: 100,
  isRegSho: false,
  // Fill in other required Stock properties with defaults
  simpleScore: 50, marketCap: 1e9, avgVolume: 1e5, sharesOutstanding: 10e6,
  peRatioTTM: 15, debtEquityRatioTTM: 0.5, returnOnEquityTTM: 0.15,
  debtToEbitdaTTM: 2, enterpriseValueOverEBITDATTM: 8, freeCashFlowPerShareTTM: 5,
  netIncomePerShareTTM: 3, fcfNiRatioTTM: 1.6, interestCoverageTTM: 5,
  pncaRatio: 1, shareCountCAGR3yr: -0.01, grossMarginTrend: 'stable',
  incrementalROIC: 0.15, netInsiderBuyTxLast6M: 1, insiderOwnershipPercentage: 10,
  avgRotce5yr: 0.15, daysToExitPosition: 5, netCashToMarketCapRatio: 0.1,
  insiderBuyValueToMarketCapRatio: 0.001, revenueCAGR: 0.05, hasCatalyst: false,
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
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }

  // Mock the regsho.json file since stockService loads it
  await page.route('**/regsho.json', async route => {
    const shoSymbols = stocks.filter(s => s.isRegSho).map(s => s.symbol);
    await route.fulfill({ json: shoSymbols });
  });
  
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

test.describe('Reg-SHO Exclusion Filter', () => {
  const stocks = [
    mockStock('GME', { name: 'GameStop Corp.', isRegSho: true }),
    mockStock('AAPL', { name: 'Apple Inc.', isRegSho: false }),
    mockStock('AMC', { name: 'AMC Entertainment', isRegSho: true }),
    mockStock('MSFT', { name: 'Microsoft Corp.', isRegSho: false }),
  ];

  test('should filter out Reg-SHO stocks when checkbox is ticked', async ({ page }) => {
    await setupPageWithStocks(page, stocks);
    await openSidebarIfNeeded(page);

    // Initial state: all stocks are visible
    await expect(page.locator('div.stock-card')).toHaveCount(4);

    // Open the "Ownership & Governance" accordion
    await page.locator('h4:has-text("Ownership & Governance")').click();
    
    // Find and click the "Exclude Reg-SHO names" checkbox
    const regShoCheckbox = page.locator('label:has-text("Exclude Reg-SHO names")');
    await expect(regShoCheckbox).toBeVisible();
    await regShoCheckbox.click();

    // After filtering, only non-SHO stocks should be visible
    await expect(page.locator('div.stock-card:has-text("Apple Inc.")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Microsoft Corp.")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("GameStop Corp.")')).not.toBeVisible();
    await expect(page.locator('div.stock-card:has-text("AMC Entertainment")')).not.toBeVisible();
    await expect(page.locator('div.stock-card')).toHaveCount(2);

    // Verify active filter pill is shown
    await expect(page.locator('#activeFiltersContainer span:has-text("Exclude Reg-SHO names")')).toBeVisible();

    // Verify URL contains the filter state
    await expect(page).toHaveURL(/.*excludeRegSho%22%3A%22true%22/);

    // Uncheck the box to clear the filter
    await regShoCheckbox.click();
    await expect(page.locator('div.stock-card')).toHaveCount(4);
    await expect(page.locator('#activeFiltersContainer span')).toHaveCount(0);
  });
  
  test('should pre-apply the filter from URL on page load', async ({ page }) => {
    await setupPageWithStocks(page, stocks); // Mock setup is needed before navigation

    // Create a filter state and manually navigate to the URL
    const filters = { excludeRegSho: 'true' };
    const urlWithFilter = `${BASE_URL}?filters=${encodeURIComponent(JSON.stringify(filters))}`;
    
    await page.goto(urlWithFilter);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });

    // Verify that the filter is applied on load
    await expect(page.locator('div.stock-card')).toHaveCount(2);
    await expect(page.locator('div.stock-card:has-text("Apple Inc.")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Microsoft Corp.")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("GameStop Corp.")')).not.toBeVisible();

    // Verify the checkbox in the sidebar is checked
    await openSidebarIfNeeded(page);
    await page.locator('h4:has-text("Ownership & Governance")').click();
    const regShoCheckboxInput = page.locator('label:has-text("Exclude Reg-SHO names")').locator('input[type="checkbox"]');
    await expect(regShoCheckboxInput).toBeChecked();
  });
});
