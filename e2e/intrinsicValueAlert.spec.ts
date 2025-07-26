import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if necessary

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';
const MOCK_IV_SYMBOL = 'IVTEST';

// Helper to create a mock stock object with overrides
const mockStockData = (symbol: string, overrides: Partial<Stock>): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Industrials',
  // Required defaults
  price: 100, debtEbitda: "N/A", evEbit: "N/A", fcfNi: "N/A", rotce: "N/A", 
  marketCapCategory: "mid", volumeCategory: "medium", debtCategory: "medium", 
  valuationCategory: "blend", rotceCategory: "average", numericDebtEbitdaCategory: "", 
  numericFcfNiCategory: "", shareCountCagrCategory: "flat", numericEvEbitCategory: "", 
  deepValueCategory: "N/A", moatKeywordsCategory: "N/A", insiderOwnershipCategory: "N/A", 
  netInsiderBuysCategory: "N/A", grossMarginTrendCategory: "N/A", 
  incrementalRoicCategory: "N/A", redFlagsCategory: "N/A",
  // Apply specific test overrides
  ...overrides,
});

async function mockStockListApi(page: Page, stocks: Stock[]) {
  // Mock the main screener endpoint
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = stocks.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap || 1e9, sector: s.sector,
        price: s.price, volume: s.avgVolume || 1e5, isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  // Mock the detailed data fetches for each stock
  for (const stock of stocks) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }
}

test.describe('Sprint 3: Intrinsic Value Alert', () => {

  test('toast appears when price drops below 70% IV, and respects session dismissal', async ({ page }) => {
    // Intrinsic Value (IV) = 10 * FCF/share = 10 * 10 = 100
    // 70% Threshold = 70
    const initialStock = mockStockData(MOCK_IV_SYMBOL, { freeCashFlowPerShareTTM: 10, price: 75 }); // Price is ABOVE threshold
    
    await mockStockListApi(page, [initialStock]);
    
    await page.goto(BASE_URL);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });

    // 1. Initial state: No IV toast should be visible
    const toastLocator = page.locator(`div[role="alert"]:has-text("⚠️ ${MOCK_IV_SYMBOL} is now trading at less than 70% of our IV estimate.")`);
    await expect(toastLocator).not.toBeVisible();

    // 2. Update stock data so price is now BELOW threshold
    const updatedStock = mockStockData(MOCK_IV_SYMBOL, { freeCashFlowPerShareTTM: 10, price: 69 });
    await mockStockListApi(page, [updatedStock]); // Re-mock API for the next fetch

    // 3. Trigger a data refresh to update the stock list in the app
    await page.locator('button[aria-label="Refresh data"]').click();
    
    // Wait for loading to finish and data to re-render
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    
    // 4. Assert toast appears after the data update
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    
    // 5. Dismiss the toast, which should set sessionStorage
    await toastLocator.locator('button[aria-label="Dismiss notification"]').click();
    await expect(toastLocator).not.toBeVisible();

    // Verify sessionStorage was set
    const isDismissed = await page.evaluate((symbol) => sessionStorage.getItem(`intrinsicValueToast_${symbol}`), MOCK_IV_SYMBOL);
    expect(isDismissed).toBe('true');

    // 6. Trigger another refresh with the price still below threshold
    await page.locator('button[aria-label="Refresh data"]').click();
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });

    // Assert toast does NOT reappear because it was dismissed
    await expect(toastLocator).not.toBeVisible({ timeout: 1000 });

    // 7. Verify toast reappears in a new session (new context)
    const newPage = await page.context().newPage();
    const newContextInitialStock = mockStockData(MOCK_IV_SYMBOL, { freeCashFlowPerShareTTM: 10, price: 68 });
    await mockStockListApi(newPage, [newContextInitialStock]);
    await newPage.goto(BASE_URL);
    await expect(newPage.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(newPage.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });

    const newToastLocator = newPage.locator(`div[role="alert"]:has-text("⚠️ ${MOCK_IV_SYMBOL} is now trading at less than 70% of our IV estimate.")`);
    await expect(newToastLocator).toBeVisible({ timeout: 5000 });
    await newPage.close();
  });
});