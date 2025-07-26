import { test, expect, Page } from '@playwright/test';
import { Stock } from '../src/types'; // Adjust path if necessary

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

// Mock stocks with varying quality/value attributes
const mockStocks: Stock[] = [
    // High Quality, High Value
    { id: 'HQHV', symbol: 'HQHV', name: 'High Quality High Value', price: 50, roeCategory: 'excellent', debtCategory: 'low', valuationCategory: 'value', sector: 'Tech' } as Stock,
    // Low Quality, High Value
    { id: 'LQHV', symbol: 'LQHV', name: 'Low Quality High Value', price: 60, roeCategory: 'poor', debtCategory: 'high', valuationCategory: 'value', sector: 'Industrials' } as Stock,
    // High Quality, Low Value (Expensive)
    { id: 'HQLV', symbol: 'HQLV', name: 'High Quality Low Value', price: 200, roeCategory: 'excellent', debtCategory: 'low', valuationCategory: 'growth', sector: 'Healthcare' } as Stock,
    // Low Quality, Low Value (Expensive)
    { id: 'LQLV', symbol: 'LQLV', name: 'Low Quality Low Value', price: 250, roeCategory: 'poor', debtCategory: 'high', valuationCategory: 'growth', sector: 'Energy' } as Stock,
];

async function setupPageWithStocks(page: Page) {
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = mockStocks.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap || 1e9, sector: s.sector,
        price: s.price, volume: s.avgVolume || 1e5, isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  for (const stock of mockStocks) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ returnOnEquityTTM: stock.roeCategory === 'excellent' ? 0.25 : 0.05, priceEarningsRatioTTM: stock.valuationCategory === 'value' ? 10 : 30 }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ debtToEbitdaTTM: stock.debtCategory === 'low' ? 1 : 5 }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ price: stock.price }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({}) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({}) }));
    await page.route(`**/api/v4/**`, route => route.fulfill({ json: [] }));
  }

  await page.goto(BASE_URL);
  await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
}

async function openSidebarIfNeeded(page: Page) {
  const sidebarButton = page.locator('button[aria-label="Open filters"]');
  if (await sidebarButton.isVisible()) {
    await sidebarButton.click();
    await expect(page.locator('aside.sidebar.sidebar-mobile-open')).toBeVisible();
  }
}

test.describe('Simple Mode UI and Functionality', () => {

  test('should default to Simple Mode on first visit and persist choice', async ({ page }) => {
    // Simulate first visit by clearing localStorage
    await page.addInitScript(() => {
        window.localStorage.clear();
    });
    await setupPageWithStocks(page);
    await openSidebarIfNeeded(page);

    // 1. First visit: Check if simple sliders are visible and advanced are hidden
    const qualitySlider = page.locator('label:has-text("Quality")');
    const advancedFilterAccordion = page.locator('h4:has-text("Capital Structure & Solvency")');
    await expect(qualitySlider).toBeVisible();
    await expect(advancedFilterAccordion).not.toBeVisible();

    // 2. Click "Show advanced filters"
    const showAdvancedButton = page.locator('button:has-text("Show advanced filters")');
    await showAdvancedButton.click();

    // 3. Verify advanced filters are now visible
    await expect(qualitySlider).not.toBeVisible();
    await expect(advancedFilterAccordion).toBeVisible();
    
    // Check that the toggle button now shows Advanced as selected
    const advancedToggleButton = page.locator('button:has-text("Advanced")');
    await expect(advancedToggleButton).toHaveClass(/bg-blue-600/);

    // 4. Refresh page and check for persistence
    await page.reload();
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await openSidebarIfNeeded(page);
    
    // Advanced mode should still be active
    await expect(qualitySlider).not.toBeVisible();
    await expect(advancedFilterAccordion).toBeVisible();
    await expect(advancedToggleButton).toHaveClass(/bg-blue-600/);
  });

  test('should filter stocks when adjusting Quality slider', async ({ page }) => {
    await setupPageWithStocks(page);
    await openSidebarIfNeeded(page);

    // Make sure Simple Mode is on
    await page.locator('button:has-text("Simple")').click();
    
    // Initially, all 4 stocks should be visible
    await expect(page.locator('.stock-card')).toHaveCount(4);

    // Find Quality slider
    const qualitySliderInput = page.locator('input[type="range"]', { has: page.locator('xpath=./ancestor::div[.//label[text()="🏆 Quality"]]') });
    await expect(qualitySliderInput).toBeVisible();

    // Move slider to high quality (e.g., > 75)
    await qualitySliderInput.fill('80');
    
    // Allow a moment for the filter to apply
    await page.waitForTimeout(500);

    // Now, only high-quality stocks should be visible
    await expect(page.locator('div.stock-card:has-text("High Quality High Value")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("High Quality Low Value")')).toBeVisible();
    
    // Low-quality stocks should be hidden
    await expect(page.locator('div.stock-card:has-text("Low Quality High Value")')).not.toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Low Quality Low Value")')).not.toBeVisible();
  });

   test('should filter stocks when adjusting Value slider', async ({ page }) => {
    await setupPageWithStocks(page);
    await openSidebarIfNeeded(page);
    await page.locator('button:has-text("Simple")').click();
    
    // Initially, all 4 stocks should be visible
    await expect(page.locator('.stock-card')).toHaveCount(4);

    // Find Value slider
    const valueSliderInput = page.locator('input[type="range"]', { has: page.locator('xpath=./ancestor::div[.//label[text()="💎 Value"]]') });
    await expect(valueSliderInput).toBeVisible();

    // Move slider to "super cheap" (e.g., > 80)
    await valueSliderInput.fill('85');
    
    await page.waitForTimeout(500);

    // Now, only high-value (cheap) stocks should be visible
    await expect(page.locator('div.stock-card:has-text("High Quality High Value")')).toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Low Quality High Value")')).toBeVisible();
    
    // Low-value (expensive) stocks should be hidden
    await expect(page.locator('div.stock-card:has-text("High Quality Low Value")')).not.toBeVisible();
    await expect(page.locator('div.stock-card:has-text("Low Quality Low Value")')).not.toBeVisible();
  });

});