

import { renderHook } from '@testing-library/react-hooks'; // Correct import
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useStockAlerts } from '../useAlerts'; // Adjust path as necessary
import { Stock, ToastMessage } from '../../types'; // Adjust path

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('useStockAlerts', () => {
  let mockAddToast: jest.Mock;

  beforeEach(() => {
    mockAddToast = jest.fn();
    mockSessionStorage.clear();
    jest.useFakeTimers(); // Though not strictly used by this hook's interval, good practice
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const createMockStock = (symbol: string, overrides: Partial<Stock>): Stock => ({
    id: symbol, symbol, name: `${symbol} Co`, sector: 'Tech',
    // Required defaults
    price: 100, debtEbitda: "N/A", evEbit: "N/A", fcfNi: "N/A", rotce: "N/A", 
    marketCapCategory: "mid", volumeCategory: "medium", debtCategory: "medium", 
    valuationCategory: "blend", rotceCategory: "average", numericDebtEbitdaCategory: "", 
    numericFcfNiCategory: "", shareCountCagrCategory: "flat", numericEvEbitCategory: "", 
    deepValueCategory: "N/A", moatKeywordsCategory: "N/A", insiderOwnershipCategory: "N/A", 
    netInsiderBuysCategory: "N/A", grossMarginTrendCategory: "N/A", 
    incrementalRoicCategory: "N/A", redFlagsCategory: "N/A",
    // Apply overrides
    ...overrides,
  });

  describe('Momentum Alerts', () => {
    it('should call addToast when momentum turns positive (from negative)', () => {
        const initialStocks: Stock[] = [createMockStock('XYZ', { rankMomentum63: -2 })];
        const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
          initialProps: { stocks: initialStocks }
        });
    
        const updatedStocksPositive: Stock[] = [createMockStock('XYZ', { rankMomentum63: 5 })];
        rerender({ stocks: updatedStocksPositive });
    
        expect(mockAddToast).toHaveBeenCalledTimes(1);
        expect(mockAddToast).toHaveBeenCalledWith(
          '📈 XYZ momentum just turned positive', 
          'info',
          'momentumToast_XYZ'
        );
    });

    it('should not call addToast if momentum was already positive and remains positive', () => {
        const initialStocks: Stock[] = [createMockStock('POS', { rankMomentum63: 5 })];
        const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
          initialProps: { stocks: initialStocks }
        });
    
        const updatedStocksStillPositive: Stock[] = [createMockStock('POS', { rankMomentum63: 8 })];
        rerender({ stocks: updatedStocksStillPositive });
        
        expect(mockAddToast).not.toHaveBeenCalled();
    });

     it('should not call addToast if alert was already dismissed in sessionStorage', () => {
        mockSessionStorage.setItem('momentumToast_SESS', 'true');
        const initialStocks: Stock[] = [createMockStock('SESS', { rankMomentum63: -1 })];
        const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
          initialProps: { stocks: initialStocks }
        });

        const updatedStocksPositive: Stock[] = [createMockStock('SESS', { rankMomentum63: 5 })];
        rerender({ stocks: updatedStocksPositive });
        
        expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('Intrinsic Value Alerts', () => {
    it('should call addToast when price drops below the 70% IV threshold', () => {
      // Threshold = 7 * FCF/share = 7 * 10 = 70. Price is initially 80 (above).
      const initialStocks: Stock[] = [createMockStock('VAL', { freeCashFlowPerShareTTM: 10, price: 80 })];
      const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
        initialProps: { stocks: initialStocks }
      });
      expect(mockAddToast).not.toHaveBeenCalled();

      // Price drops to 69 (below threshold).
      const updatedStocks: Stock[] = [createMockStock('VAL', { freeCashFlowPerShareTTM: 10, price: 69 })];
      rerender({ stocks: updatedStocks });

      expect(mockAddToast).toHaveBeenCalledTimes(1);
      expect(mockAddToast).toHaveBeenCalledWith(
        '⚠️ VAL is now trading at less than 70% of our IV estimate.',
        'warning',
        'intrinsicValueToast_VAL'
      );
    });

    it('should call addToast on initial load if price is already below threshold', () => {
        const initialStocks: Stock[] = [createMockStock('CHEAP', { freeCashFlowPerShareTTM: 20, price: 100 })]; // Threshold = 140
        renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
          initialProps: { stocks: initialStocks }
        });
        expect(mockAddToast).toHaveBeenCalledTimes(1);
        expect(mockAddToast).toHaveBeenCalledWith(
            '⚠️ CHEAP is now trading at less than 70% of our IV estimate.',
            'warning',
            'intrinsicValueToast_CHEAP'
        );
    });

    it('should not call addToast if price stays below threshold across updates', () => {
      const initialStocks: Stock[] = [createMockStock('DEEP', { freeCashFlowPerShareTTM: 15, price: 90 })]; // Threshold = 105
      const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
        initialProps: { stocks: initialStocks }
      });
      expect(mockAddToast).toHaveBeenCalledTimes(1);
      mockAddToast.mockClear();

      const updatedStocks: Stock[] = [createMockStock('DEEP', { freeCashFlowPerShareTTM: 15, price: 85 })]; // Stays below
      rerender({ stocks: updatedStocks });
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should not call addToast for IV alert if FCF/share is zero or negative', () => {
        const initialStocks: Stock[] = [createMockStock('NOFCF', { freeCashFlowPerShareTTM: -2, price: 10 })];
        const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
          initialProps: { stocks: initialStocks }
        });
        
        const updatedStocks: Stock[] = [createMockStock('NOFCF', { freeCashFlowPerShareTTM: 0, price: 10 })];
        rerender({ stocks: updatedStocks });
        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should not call addToast for IV if alert was dismissed in sessionStorage', () => {
      mockSessionStorage.setItem('intrinsicValueToast_DIS', 'true');
      const initialStocks: Stock[] = [createMockStock('DIS', { freeCashFlowPerShareTTM: 5, price: 30 })]; // Threshold = 35
      renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
        initialProps: { stocks: initialStocks }
      });
      expect(mockAddToast).not.toHaveBeenCalled();
    });
    
    it('should fire alert again if price goes above threshold and then back below', () => {
      const initialStocks: Stock[] = [createMockStock('YO', { freeCashFlowPerShareTTM: 10, price: 80 })]; // Above threshold (70)
      const { rerender } = renderHook(({ stocks }) => useStockAlerts(stocks, mockAddToast), {
        initialProps: { stocks: initialStocks }
      });

      const updatedStocks1: Stock[] = [createMockStock('YO', { freeCashFlowPerShareTTM: 10, price: 65 })]; // Below
      rerender({ stocks: updatedStocks1 });
      expect(mockAddToast).toHaveBeenCalledTimes(1);
      mockAddToast.mockClear();

      const updatedStocks2: Stock[] = [createMockStock('YO', { freeCashFlowPerShareTTM: 10, price: 75 })]; // Back above
      rerender({ stocks: updatedStocks2 });
      expect(mockAddToast).not.toHaveBeenCalled();

      const updatedStocks3: Stock[] = [createMockStock('YO', { freeCashFlowPerShareTTM: 10, price: 68 })]; // Back below again
      rerender({ stocks: updatedStocks3 });
      expect(mockAddToast).toHaveBeenCalledTimes(1); // Should fire again
    });
  });
});