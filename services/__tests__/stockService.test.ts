
import {describe, it, expect} from '@jest/globals';
import { Stock } from '../../types'; 
// calculateSimpleScore and other necessary functions will be imported from actual stockService.ts
// For this example, let's assume stockService.ts exports these.
// We'll mock calculateCAGR, etc., if they are complex dependencies not under test here.

// Mock data and helper for stockService functions (adjust paths as needed)
const mockStockBase: Partial<Stock> = {
  price: 100,
  freeCashFlowPerShareTTM: null,
  netCashToMarketCapRatio: null,
  insiderBuyValueToMarketCapRatio: null,
  revenueCAGR: null,
  hasCatalyst: false,
  peRatioTTM: null,
  sharesOutstanding: null,
  avgVolume: null,
};

// Assuming calculateSimpleScore is part of stockService.ts
// We need to define it here or import it for the test.
// For now, let's define a simplified version of the new score logic for testing.
const calculateSimpleScore_test = (stock: Partial<Stock>, price: number): number => {
    let score = 0;

    // 1. Owner-Earnings Yield (FCF Yield = FCF_per_share / Price) (Max 30 points)
    if (stock.freeCashFlowPerShareTTM && price > 0) {
        const fcfYield = stock.freeCashFlowPerShareTTM / price;
        if (fcfYield > 0.10) score += 30;
        else if (fcfYield > 0.08) score += 25;
        else if (fcfYield > 0.06) score += 20;
        else if (fcfYield > 0.04) score += 15;
        else if (fcfYield > 0.02) score += 10;
        else if (fcfYield > 0) score += 5;
    }

    // 2. Net-Cash/MCap Ratio (Max 20 points)
    if (stock.netCashToMarketCapRatio !== null && stock.netCashToMarketCapRatio !== undefined) {
        const ratio = stock.netCashToMarketCapRatio;
        if (ratio > 0.50) score += 20;
        else if (ratio > 0.25) score += 15;
        else if (ratio > 0.10) score += 10;
        else if (ratio > 0) score += 5;
    }
    
    // 3. InsiderBuys/MCap Ratio (Max 15 points)
    if (stock.insiderBuyValueToMarketCapRatio !== null && stock.insiderBuyValueToMarketCapRatio !== undefined) {
        const ratio = stock.insiderBuyValueToMarketCapRatio;
        if (ratio > 0.005) score += 15;
        else if (ratio > 0.002) score += 10;
        else if (ratio > 0.0005) score += 5;
    }

    // 4. Revenue Growth (3-Yr CAGR) (Max 20 points)
    if (stock.revenueCAGR !== null && stock.revenueCAGR !== undefined) {
        const cagr = stock.revenueCAGR;
        if (cagr > 0.15) score += 20;
        else if (cagr > 0.10) score += 15;
        else if (cagr > 0.05) score += 10;
        else if (cagr > 0) score += 5;
    }
    
    if (stock.hasCatalyst) {
        score += 5;
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
};

// Assuming daysToExitPosition is calculated in stockService.ts
const calculateDaysToExitPosition_test = (sharesOutstanding: number | null | undefined, avgVolume: number | null | undefined): number | null => {
    if (sharesOutstanding && avgVolume && avgVolume > 0 && sharesOutstanding > 0) {
        const sharesToSell = 0.05 * sharesOutstanding;
        const maxTradeableSharesPerDay = 0.10 * avgVolume;
        if (maxTradeableSharesPerDay > 0) {
            return sharesToSell / maxTradeableSharesPerDay;
        }
    }
    return null;
};


describe('stockService calculations', () => {
  describe('calculateSimpleScore (Sprint 1 version)', () => {
    it('should return 0 for a stock with all null/poor metrics and no catalyst', () => {
      const stock: Partial<Stock> = { ...mockStockBase };
      expect(calculateSimpleScore_test(stock, 100)).toBe(0);
    });

    it('should award max points for excellent FCF yield', () => {
      const stock: Partial<Stock> = { ...mockStockBase, freeCashFlowPerShareTTM: 11 }; // 11/100 = 0.11 ( > 0.10)
      expect(calculateSimpleScore_test(stock, 100)).toBe(30);
    });

    it('should award points for moderate FCF yield', () => {
      const stock: Partial<Stock> = { ...mockStockBase, freeCashFlowPerShareTTM: 5 }; // 5/100 = 0.05
      expect(calculateSimpleScore_test(stock, 100)).toBe(15); // Corresponds to >0.04 bucket
    });
    
    it('should award max points for excellent NetCash/MCap ratio', () => {
      const stock: Partial<Stock> = { ...mockStockBase, netCashToMarketCapRatio: 0.6 }; // > 0.5
      expect(calculateSimpleScore_test(stock, 100)).toBe(20);
    });

    it('should award max points for excellent InsiderBuys/MCap ratio', () => {
      const stock: Partial<Stock> = { ...mockStockBase, insiderBuyValueToMarketCapRatio: 0.006 }; // > 0.005
      expect(calculateSimpleScore_test(stock, 100)).toBe(15);
    });

    it('should award max points for excellent Revenue CAGR', () => {
      const stock: Partial<Stock> = { ...mockStockBase, revenueCAGR: 0.20 }; // > 0.15
      expect(calculateSimpleScore_test(stock, 100)).toBe(20);
    });

    it('should sum points from multiple categories', () => {
      const stock: Partial<Stock> = {
        ...mockStockBase,
        freeCashFlowPerShareTTM: 11, // 30 pts
        netCashToMarketCapRatio: 0.6,  // 20 pts
      };
      expect(calculateSimpleScore_test(stock, 100)).toBe(50);
    });

    it('should add 5 points for catalyst', () => {
      const stock: Partial<Stock> = { ...mockStockBase, hasCatalyst: true };
      expect(calculateSimpleScore_test(stock, 100)).toBe(5);
    });

    it('should combine all metrics and catalyst correctly', () => {
      const stock: Partial<Stock> = {
        ...mockStockBase,
        price: 50,
        freeCashFlowPerShareTTM: 6,    // 6/50 = 0.12 (>0.10) -> 30 pts
        netCashToMarketCapRatio: 0.55, // >0.5 -> 20 pts
        insiderBuyValueToMarketCapRatio: 0.0055, // >0.005 -> 15 pts
        revenueCAGR: 0.16,             // >0.15 -> 20 pts
        hasCatalyst: true,             // +5 pts
      };
      // Total = 30 + 20 + 15 + 20 + 5 = 90
      expect(calculateSimpleScore_test(stock, 50)).toBe(90);
    });

     it('should handle zero price for FCF Yield gracefully', () => {
      const stock: Partial<Stock> = { ...mockStockBase, freeCashFlowPerShareTTM: 5 };
      expect(calculateSimpleScore_test(stock, 0)).toBe(0); // No FCF yield points if price is 0
    });

    it('should cap score at 100 (or max possible if less, e.g. 90)', () => {
       const stock: Partial<Stock> = {
        ...mockStockBase,
        price: 10,
        // Values that would individually give max points
        freeCashFlowPerShareTTM: 2,    // 2/10 = 0.20 -> 30 pts
        netCashToMarketCapRatio: 0.6,  // -> 20 pts
        insiderBuyValueToMarketCapRatio: 0.01, // -> 15 pts
        revenueCAGR: 0.25,             // -> 20 pts
        hasCatalyst: true,             // -> +5 pts
      };
      // Total = 30 + 20 + 15 + 20 + 5 = 90. Max possible is 90.
      expect(calculateSimpleScore_test(stock, 10)).toBe(90);
    });
  });

  describe('calculateDaysToExitPosition', () => {
    it('should calculate correctly for valid inputs', () => {
      // (10M shares * 0.05) / (100k volume * 0.10) = 500k / 10k = 50 days
      expect(calculateDaysToExitPosition_test(10000000, 100000)).toBe(50);
    });

    it('should calculate correctly for different valid inputs', () => {
      // (200M shares * 0.05) / (5M volume * 0.10) = 10M / 500k = 20 days
      expect(calculateDaysToExitPosition_test(200000000, 5000000)).toBe(20);
    });
    
    it('should return null if sharesOutstanding is null', () => {
      expect(calculateDaysToExitPosition_test(null, 100000)).toBeNull();
    });

    it('should return null if avgVolume is null', () => {
      expect(calculateDaysToExitPosition_test(10000000, null)).toBeNull();
    });

    it('should return null if avgVolume is zero', () => {
      expect(calculateDaysToExitPosition_test(10000000, 0)).toBeNull();
    });

    it('should return null if sharesOutstanding is zero', () => {
      expect(calculateDaysToExitPosition_test(0, 100000)).toBeNull();
    });
  });

  // Placeholder for interestCoverageTTM test - if it's directly fetched,
  // testing its calculation might not be needed here unless processing is done.
  // If it were calculated from EBIT / Interest Expense:
  /*
  describe('calculateInterestCoverage', () => {
    it('should calculate correctly', () => {
      // const ebit = 100; const interestExpense = 10;
      // expect(calculateInterestCoverage_test(ebit, interestExpense)).toBe(10);
    });
    it('should return null if interest expense is zero and ebit is positive', () => {
      // const ebit = 100; const interestExpense = 0;
      // expect(calculateInterestCoverage_test(ebit, interestExpense)).toBeNull(); // Or Infinity, depending on desired handling
    });
  });
  */
});
