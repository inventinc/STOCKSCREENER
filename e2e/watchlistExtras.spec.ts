
import { test, expect, Page } from '@playwright/test';
import { Stock, WatchlistExtra, FMPEarningCalendarItem, FMPQuote } from '../src/types'; // Adjust path

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8000';

const mockStock = (symbol: string, overrides: Partial<Stock> = {}): Stock => ({
  id: symbol,
  symbol,
  name: `${symbol} Company Inc.`,
  sector: 'Technology',
  price: Math.random() * 200 + 50,
  simpleScore: Math.floor(Math.random() * 70) + 30,
  // Fill in other required Stock properties with defaults or from overrides
  marketCap: (Math.random() * 10 + 1) * 1e9, avgVolume: Math.random() * 1e6 + 1e5, sharesOutstanding: (Math.random() * 50 + 10) * 1e6,
  peRatioTTM: Math.random() * 20 + 5, debtEquityRatioTTM: Math.random() * 1.5, returnOnEquityTTM: Math.random() * 0.3 - 0.1,
  debtToEbitdaTTM: Math.random() * 5, enterpriseValueOverEBITDATTM: Math.random() * 15 + 3,
  freeCashFlowPerShareTTM: Math.random() * 10 - 2, netIncomePerShareTTM: Math.random() * 5 + 1, fcfNiRatioTTM: Math.random() * 1.5 + 0.5,
  interestCoverageTTM: Math.random() * 10 + 1, pncaRatio: Math.random() * 2, shareCountCAGR3yr: Math.random() * 0.1 - 0.05,
  grossMarginTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as 'improving' | 'stable' | 'declining',
  incrementalROIC: Math.random() * 0.3, netInsiderBuyTxLast6M: Math.floor(Math.random() * 10) - 5, insiderOwnershipPercentage: Math.random() * 30,
  avgRotce5yr: Math.random() * 0.25, daysToExitPosition: Math.random() * 20 + 1, netCashToMarketCapRatio: Math.random() * 0.5 - 0.1,
  insiderBuyValueToMarketCapRatio: Math.random() * 0.005, revenueCAGR: Math.random() * 0.2, hasCatalyst: Math.random() > 0.8,
  score63DaysAgo: Math.floor(Math.random() * 70) + 30, rankMomentum63: Math.floor(Math.random() * 21) - 10,
  debtEbitda: "N/A", evEbit: "N/A", fcfNi: "N/A", rotce: "N/A", marketCapCategory: "mid", volumeCategory: "medium", debtCategory: "medium",
  valuationCategory: "blend", rotceCategory: "average", numericDebtEbitdaCategory: "", numericFcfNiCategory: "",
  shareCountCagrCategory: "flat", numericEvEbitCategory: "", deepValueCategory: "N/A", moatKeywordsCategory: "N/A",
  insiderOwnershipCategory: "N/A", netInsiderBuysCategory: "N/A", grossMarginTrendCategory: "N/A", incrementalRoicCategory: "N/A",
  redFlagsCategory: "N/A",
  ...overrides,
});

async function setupInitialStockLoadMock(page: Page, stocksData: Stock[]) {
  // Mock the main stock list fetch
  await page.route('**/api/v3/stock-screener*', async route => {
    const fmpScreenerResponse = stocksData.map(s => ({
        symbol: s.symbol, companyName: s.name, marketCap: s.marketCap, sector: s.sector,
        price: s.price, volume: s.avgVolume, isEtf: false, isActivelyTrading: true,
    }));
    await route.fulfill({ json: fmpScreenerResponse });
  });

  // Mock detailed data fetches for each stock in the initial load
  for (const stock of stocksData) {
    await page.route(`**/api/v3/ratios-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/key-metrics-ttm/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock }] }));
    await page.route(`**/api/v3/quote/${stock.symbol}*`, route => route.fulfill({ json: [{ ...stock, yearHigh: (stock.price || 0) * 1.2, yearLow: (stock.price || 0) * 0.8, sharesOutstanding: stock.sharesOutstanding || 10e6, avgVolume: stock.avgVolume || 1e5 }] }));
    await page.route(`**/api/v3/income-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", revenue: (stock.marketCap || 0) / 2 , netIncome: 5e7, weightedAverageShsOutDil: stock.sharesOutstanding || 10e6 }) }));
    await page.route(`**/api/v3/balance-sheet-statement/${stock.symbol}*`, route => route.fulfill({ json: Array(5).fill({ ...stock, calendarYear: "2023", totalCurrentAssets: 2e8, totalLiabilities: 1e8, commonStock: stock.sharesOutstanding || 10e6 }) }));
    await page.route(`**/api/v4/insider-trading*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
    await page.route(`**/api/v4/insider-ownership*symbol=${stock.symbol}*`, route => route.fulfill({ json: [] }));
  }
}

async function mockWatchlistExtrasApi(page: Page, watchlistExtras: WatchlistExtra[]) {
  const symbols = watchlistExtras.map(e => e.symbol).join(',');

  // Mock /quote/{list}
  await page.route(`**/api/v3/quote/${symbols}*`, async route => {
    const quotesResponse: Partial<FMPQuote>[] = watchlistExtras.map(extra => ({
      symbol: extra.symbol,
      changesPercentage: extra.priceChangePct,
    }));
    await route.fulfill({ json: quotesResponse });
  });

  // Mock /earnings-calendar/{list}
  await page.route(`**/api/v3/earning_calendar/${symbols}*`, async route => {
    const earningsResponse: Partial<FMPEarningCalendarItem>[] = watchlistExtras
      .filter(extra => extra.nextEarnings !== '—')
      .map(extra => ({
        symbol: extra.symbol,
        date: extra.nextEarnings,
        time: "bmo", // Before Market Open, dummy value
      }));
    await route.fulfill({ json: earningsResponse });
  });
}

test.describe('Sprint 2-E: Watchlist Extras', () => {
  const initialStocks = [
    mockStock('WL1', { name: 'Watchlist Stock One', price: 100 }),
    mockStock('WL2', { name: 'Watchlist Stock Two', price: 200 }),
    mockStock('NONWL', { name: 'Not Watchlisted', price: 50 }),
  ];

  const watchlistApiData: WatchlistExtra[] = [
    { symbol: 'WL1', priceChangePct: 2.35, nextEarnings: '2024-11-15' },
    { symbol: 'WL2', priceChangePct: -0.78, nextEarnings: '2024-12-01' },
  ];

  test('Watchlist pane shows 1-day price change and next earnings date', async ({ page }) => {
    await setupInitialStockLoadMock(page, initialStocks);
    await mockWatchlistExtrasApi(page, watchlistApiData);

    await page.goto(BASE_URL);
    await expect(page.locator('.initial-loading-spinner')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('div.stock-card, table.stock-table tr[key]')).not.toHaveCount(0, { timeout: 15000 });

    // Add WL1 and WL2 to watchlist
    for (const symbol of ['WL1', 'WL2']) {
      const stockCard = page.locator(`div.stock-card:has-text("${symbol}")`);
      await stockCard.locator('button[aria-label="Add to watchlist"]').click();
      await expect(stockCard.locator('button[aria-label="Remove from watchlist"]')).toBeVisible();
    }

    // Open watchlist pane
    await page.locator('button[aria-label="Toggle watchlist"]').click();
    const watchlistPane = page.locator('div[aria-modal="true"]:has-text("My Watchlist")');
    await expect(watchlistPane).toBeVisible();

    // Verify WL1 data
    const wl1Item = watchlistPane.locator(`li:has-text("WL1")`);
    await expect(wl1Item).toBeVisible();
    await expect(wl1Item.locator('span:has-text("+2.35%")')).toBeVisible();
    await expect(wl1Item.locator('span:has-text("+2.35%")')).toHaveClass(/text-green-600/);
    await expect(wl1Item.locator(':text("Next Earnings:") + :text("2024-11-15"), :text("Next Earnings:") ~ span:text("2024-11-15")')).toBeVisible();


    // Verify WL2 data
    const wl2Item = watchlistPane.locator(`li:has-text("WL2")`);
    await expect(wl2Item).toBeVisible();
    await expect(wl2Item.locator('span:has-text("-0.78%")')).toBeVisible();
    await expect(wl2Item.locator('span:has-text("-0.78%")')).toHaveClass(/text-red-600/);
    await expect(wl2Item.locator(':text("Next Earnings:") + :text("2024-12-01"), :text("Next Earnings:") ~ span:text("2024-12-01")')).toBeVisible();

    // Verify NONWL is not in the watchlist pane
    await expect(watchlistPane.locator(`li:has-text("NONWL")`)).not.toBeVisible();

    // Test case with null priceChangePct and '—' earnings
    const wlNullData = mockStock('WLNULL', { name: 'Watchlist Null Data', price: 75 });
    await setupInitialStockLoadMock(page, [...initialStocks, wlNullData]); // Re-mock initial load if needed, or assume it's additive
    
    // Add WLNULL to watchlist (if not already handled by a full page reload test strategy)
     const wlNullStockCard = page.locator(`div.stock-card:has-text("WLNULL")`);
     // Check if it's already on the page, if not, this might need a page refresh after setup. For now, assume it is.
     if (await wlNullStockCard.count() > 0) { // Check if the element exists
        const starButton = wlNullStockCard.locator('button[aria-label*="watchlist"]');
        if (await starButton.getAttribute('aria-label') === 'Add to watchlist') {
          await starButton.click();
        }
     } else {
        console.warn("WLNULL card not found for adding to watchlist. Test might need adjustment for dynamic loading.")
     }


    const watchlistNullApiData: WatchlistExtra[] = [
        ...watchlistApiData,
        { symbol: 'WLNULL', priceChangePct: null, nextEarnings: '—' }
    ];
    await mockWatchlistExtrasApi(page, watchlistNullApiData);
    
    // Re-open watchlist pane or trigger refresh of its data if it's already open
    // For simplicity, let's close and re-open to trigger useEffect
    await watchlistPane.locator('button[aria-label="Close watchlist"]').click();
    await expect(watchlistPane).not.toBeVisible();
    await page.locator('button[aria-label="Toggle watchlist"]').click();
    await expect(watchlistPane).toBeVisible();
    
    // Verify WLNULL data (N/A for price change, '—' for earnings)
    const wlNullItem = watchlistPane.locator(`li:has-text("WLNULL")`);
    // Ensure the item exists before trying to assert its content.
    // It might take a moment for the new item + its fetched data to render.
    await expect(wlNullItem).toBeVisible({timeout: 10000});

    // For N/A values from constants.ts (NA_STRING)
    const naStringElementsPriceChange = wlNullItem.locator(`:text-matches("${/^N\/A$/}")`).filter({
      has: page.locator('xpath=./preceding-sibling::span[contains(text(), "1D %Chg")]')
    });
    const naStringElementsEarnings = wlNullItem.locator(`:text-matches("${/^N\/A$/}")`).filter({
      has: page.locator('xpath=./preceding-sibling::span[contains(text(), "Next Earnings")]')
    });
    
    await expect(naStringElementsPriceChange.first()).toBeVisible();
    await expect(naStringElementsEarnings.first()).toBeVisible();
    
  });
});