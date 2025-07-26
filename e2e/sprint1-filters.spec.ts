
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

// Helper to create a mock stock object with overrides
const mockStock = (symbol: string, overrides: Record<string, any> = {}) => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Technology',
  price: Math.random() * 100 + 50, // Random price for variety
  simpleScore: Math.floor(Math.random() * 100),
  marketCap: (Math.random() * 10 + 1) * 1e9, // $1B to $11B
  avgVolume: Math.random() * 1e6 + 1e5, // 100k to 1.1M
  sharesOutstanding: (Math.random() * 50 + 10) * 1e6, // 10M to 60M
  peRatioTTM: Math.random() * 20 + 5, // 5 to 25
  debtEquityRatioTTM: Math.random() * 1.5,
  returnOnEquityTTM: Math.random() * 0.3 - 0.1, // -10% to 20%
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
  ...overrides,
});


// Helper to set up mocks and navigate
async function setupPageWithStocks(page: Page, stocks: any[]) {
  // Mock the primary stock list fetch
  await page.route('**/api/v3/stock-screener*', async route => {
    // Simulate the FMP screener response structure
    const fmpScreenerResponse = stocks.map(s => ({
        symbol: s.symbol,
        companyName: s.name,
        marketCap: s.marketCap,
        sector: s.sector,
        industry: s.industry || "General",
        beta: s.beta || 1.0,
        price: s.price,
        lastAnnualDividend: s.lastAnnualDividend || 0,
        volume: s.avgVolume, // FMP screener might use 'volume'
        exchange: s.exchange || "NASDAQ",
        exchangeShortName: s.exchangeShortName || "NASDAQ",
        country: s.country || "US",
        isEtf: false,
        isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  // Mock detailed data fetches for each stock that will be processed
  for (const stock of stocks) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ 
        priceEarningsRatioTTM: stock.peRatioTTM,
        debtEquityRatioTTM: stock.debtEquityRatioTTM,
        returnOnEquityTTM: stock.returnOnEquityTTM,
        returnOnTangibleEquityTTM: stock.returnOnEquityTTM, // Assuming same for simplicity
        netIncomePerShareTTM: stock.netIncomePerShareTTM,
        interestCoverageTTM: stock.interestCoverageTTM,
    }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{
        debtToEbitdaTTM: stock.debtToEbitdaTTM,
        enterpriseValueOverEBITDATTM: stock.enterpriseValueOverEBITDATTM,
        freeCashFlowPerShareTTM: stock.freeCashFlowPerShareTTM,
    }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ 
        avgVolume: stock.avgVolume,
        sharesOutstanding: stock.sharesOutstanding,
        price: stock.price,
        yearHigh: stock.price * 1.2,
        yearLow: stock.price * 0.8,
    }] }));
    // Mock financial statements (can be minimal if not directly tested for content)
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({
        calendarYear: "2023", revenue: stock.marketCap ? stock.marketCap / 2 : 5e8, netIncome: stock.netIncomePerShareTTM && stock.sharesOutstanding ? stock.netIncomePerShareTTM * stock.sharesOutstanding : 5e7,
        weightedAverageShsOutDil: stock.sharesOutstanding, grossProfitRatio: 0.5, operatingIncome: 1e8, incomeTaxExpense: 2e7, incomeBeforeTax: 1e8,
    }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({
        calendarYear: "2023", totalCurrentAssets: 2e8, totalLiabilities: 1e8, commonStock: stock.sharesOutstanding,
        cashAndCashEquivalents: 5e7, totalDebt: 5e7, goodwill: 1e7, intangibleAssets: 1e7, totalStockholdersEquity: 1e8
    }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }
  
  await page.goto(BASE_URL);
  // Wait for initial loading spinner to disappear
  await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
  // Wait for at least one stock card or table row to be rendered
  await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });
}

async function openSidebarIfNeeded(page: Page) {
  const sidebarButton = page.locator('button[aria-label="Open filters"]');
  if (await sidebarButton.isVisible()) {
    await sidebarButton.click();
    await expect(page.locator('aside.sidebar.sidebar-mobile-open')).toBeVisible();
  }
}

async function getStockCardOrRowLocator(page: Page, companyName: string) {
    const cardViewActive = await page.locator('button[aria-pressed="true"]:has-text("Card View")').isVisible();
    if (cardViewActive) {
        return page.locator(`div.stock-card:has-text("${companyName}")`);
    }
    return page.locator(`table.stock-table tr:has-text("${companyName}")`);
}


test.describe('Sprint 1 Filters & UX', () => {
  test('Liquidity Safety ≤ 1 day hides illiquid names', async ({ page }) => {
    const stocks = [
      mockStock('LIQCO', { name: 'Liquid Corp', daysToExitPosition: 0.5 }),
      mockStock('ILLIQ', { name: 'Illiquid Inc', daysToExitPosition: 10 }),
      mockStock('BRDR', { name: 'Borderline LLC', daysToExitPosition: 1 }),
    ];
    await setupPageWithStocks(page, stocks);
    await openSidebarIfNeeded(page);
    
    // Find the accordion for "Company Size & Liquidity" and click if not open
    const liquidityAccordionHeader = page.locator('div.filter-group-bg h4:has-text("Company Size & Liquidity")');
    if (await liquidityAccordionHeader.isVisible()) {
        const accordionButton = liquidityAccordionHeader.locator('xpath=./ancestor::div[contains(@class, "cursor-pointer")]');
        const isExpanded = await accordionButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await accordionButton.click();
        }
    }

    const liquiditySliderLabel = page.locator('label:has-text("Liquidity Safety")');
    await expect(liquiditySliderLabel).toBeVisible();
    const liquiditySliderInput = page.locator('input[type="range"]').filter({
        has: page.locator('xpath=./ancestor::div[.//label[contains(text(), "Liquidity Safety")]]')
    });
    await expect(liquiditySliderInput).toBeVisible();
    
    await liquiditySliderInput.fill('1');
    await page.waitForTimeout(500); // Allow filter application

    await expect(await getStockCardOrRowLocator(page, 'Liquid Corp')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Borderline LLC')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Illiquid Inc')).not.toBeVisible();
  });

  test('Interest-Coverage ≥ 3 shows only qualifying names', async ({ page }) => {
    const stocks = [
      mockStock('GOODC', { name: 'Good Coverage Co', interestCoverageTTM: 5 }),
      mockStock('BADC', { name: 'Bad Coverage Ltd', interestCoverageTTM: 1 }),
      mockStock('OKAYC', { name: 'Okay Coverage Corp', interestCoverageTTM: 3 }),
    ];
    await setupPageWithStocks(page, stocks);
    await openSidebarIfNeeded(page);

    const capitalStructureAccordionHeader = page.locator('div.filter-group-bg h4:has-text("Capital Structure & Solvency")');
     if (await capitalStructureAccordionHeader.isVisible()) {
        const accordionButton = capitalStructureAccordionHeader.locator('xpath=./ancestor::div[contains(@class, "cursor-pointer")]');
        const isExpanded = await accordionButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
            await accordionButton.click();
        }
    }
    
    const interestCoverageSliderLabel = page.locator('label:has-text("Interest Coverage (TTM)")');
    await expect(interestCoverageSliderLabel).toBeVisible();
    const interestCoverageSliderInput = page.locator('input[type="range"]').filter({
        has: page.locator('xpath=./ancestor::div[.//label[contains(text(), "Interest Coverage (TTM)")]]')
    });
    await expect(interestCoverageSliderInput).toBeVisible();

    await interestCoverageSliderInput.fill('3');
    await page.waitForTimeout(500);

    await expect(await getStockCardOrRowLocator(page, 'Good Coverage Co')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Okay Coverage Corp')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Bad Coverage Ltd')).not.toBeVisible();
  });

  test('Undo bar restores previous state correctly', async ({ page }) => {
    const stocks = [
      mockStock('AAPL', { name: 'Apple Inc', daysToExitPosition: 0.5, interestCoverageTTM: 20, marketCap: 2e12, marketCapCategory: 'large' }),
      mockStock('MSFT', { name: 'Microsoft Corp', daysToExitPosition: 2, interestCoverageTTM: 2, marketCap: 1.8e12, marketCapCategory: 'large' }),
      mockStock('GOOG', { name: 'Alphabet Inc', daysToExitPosition: 10, interestCoverageTTM: 15, marketCap: 1.5e12, marketCapCategory: 'large' }),
    ];
    await setupPageWithStocks(page, stocks);

    const undoButton = page.locator('button:has-text("Undo Last Change")');
    const resetButton = page.locator('button:has-text("Reset View")');
    await expect(undoButton).toBeDisabled(); // Initially disabled

    await openSidebarIfNeeded(page);
    
    // --- State 0: All 3 stocks visible ---
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Alphabet Inc')).toBeVisible();
    let activeFiltersContainer = page.locator('#activeFiltersContainer');
    await expect(activeFiltersContainer.locator('span')).toHaveCount(0);


    // --- State 1: Apply Liquidity Filter (e.g., <= 1 day) ---
    // This should hide GOOG (10 days), keep AAPL (0.5), MSFT (2, if slider is set to 1, MSFT hidden too)
    // Let's set slider to 1 day for liquidity
    const liquidityAccordionHeader = page.locator('div.filter-group-bg h4:has-text("Company Size & Liquidity")');
    if (await liquidityAccordionHeader.isVisible()) {
        const accordionButton = liquidityAccordionHeader.locator('xpath=./ancestor::div[contains(@class, "cursor-pointer")]');
        const isExpanded = await accordionButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') { await accordionButton.click(); }
    }
    const liquiditySliderInput = page.locator('input[type="range"]').filter({ has: page.locator('xpath=./ancestor::div[.//label[contains(text(), "Liquidity Safety")]]') });
    await liquiditySliderInput.fill('1');
    await page.waitForTimeout(500);

    // Expected: AAPL visible. MSFT (2 days), GOOG (10 days) not visible. 1 active filter chip.
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).not.toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Alphabet Inc')).not.toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("1 Days (Max)")')).toBeVisible();
    await expect(undoButton).toBeEnabled();

    // --- State 2: Apply Interest Coverage Filter (e.g., >= 18) ---
    // This should hide AAPL (20) - wait, keep AAPL if >=18.
    // If we set Interest Coverage >= 25, AAPL (20) becomes hidden.
    // Initial stocks: AAPL (IC:20), MSFT (IC:2), GOOG (IC:15)
    // After liquidity filter (<=1 day): Only AAPL remains.
    // Now apply IC filter >= 25. AAPL (IC:20) should be hidden. No stocks remain.
    const capitalStructureAccordionHeader = page.locator('div.filter-group-bg h4:has-text("Capital Structure & Solvency")');
     if (await capitalStructureAccordionHeader.isVisible()) {
        const accordionButton = capitalStructureAccordionHeader.locator('xpath=./ancestor::div[contains(@class, "cursor-pointer")]');
        const isExpanded = await accordionButton.getAttribute('aria-expanded');
        if (isExpanded === 'false') { await accordionButton.click(); }
    }
    const interestCoverageSliderInput = page.locator('input[type="range"]').filter({ has: page.locator('xpath=./ancestor::div[.//label[contains(text(), "Interest Coverage (TTM)")]]') });
    await interestCoverageSliderInput.fill('25'); // AAPL has 20, so it should disappear
    await page.waitForTimeout(500);
    
    // Expected: No stocks visible. 2 active filter chips.
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).not.toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("1 Days (Max)")')).toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("25x (Min)")')).toBeVisible();


    // --- Click Undo (reverts to State 1) ---
    await undoButton.click();
    await page.waitForTimeout(500);

    // Expected: AAPL visible. MSFT, GOOG not visible. Only Liquidity filter chip.
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).not.toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Alphabet Inc')).not.toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("1 Days (Max)")')).toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("25x (Min)")')).not.toBeVisible();
    await expect(undoButton).toBeEnabled(); // Still one more state in history (initial state)

    // --- Click Undo again (reverts to State 0) ---
    await undoButton.click();
    await page.waitForTimeout(500);

    // Expected: All 3 stocks visible. No filter chips. Undo disabled.
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Alphabet Inc')).toBeVisible();
    await expect(activeFiltersContainer.locator('span')).toHaveCount(0);
    await expect(undoButton).toBeDisabled(); // History should be empty

    // --- Test Reset button ---
    // Re-apply a filter
    await liquiditySliderInput.fill('1');
    await page.waitForTimeout(500);
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).not.toBeVisible();
    await expect(activeFiltersContainer.locator('span:has-text("1 Days (Max)")')).toBeVisible();

    // Click Reset
    await resetButton.click();
    await page.waitForTimeout(500);

    // Expected: All 3 stocks visible. No filter chips. Undo might be enabled if reset pushes state.
    await expect(await getStockCardOrRowLocator(page, 'Apple Inc')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Microsoft Corp')).toBeVisible();
    await expect(await getStockCardOrRowLocator(page, 'Alphabet Inc')).toBeVisible();
    await expect(activeFiltersContainer.locator('span')).toHaveCount(0);
    // Depending on implementation, Reset might push the pre-reset state to history.
    // The current app pushes to history before reset.
    await expect(undoButton).toBeEnabled(); 
  });
});
