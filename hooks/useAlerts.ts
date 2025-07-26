

import { useEffect, useRef, useCallback } from 'react';
import { Stock, ToastMessage } from '../types';

declare global {
  interface Window {
    __MOCK_POLL__?: boolean;
  }
}

// State for the intrinsic value alert
type IV_STATE = 'above' | 'below' | 'na';

export const useStockAlerts = (
  allStocks: Stock[],
  addToast: (message: string, type: ToastMessage['type'], sessionStorageKey?: string) => void
) => {
  // Ref for momentum alert state
  const previousMomentumRef = useRef<Map<string, number>>(new Map());
  // Ref for intrinsic value alert state
  const previousIVStateRef = useRef<Map<string, IV_STATE>>(new Map());

  const allStocksRef = useRef(allStocks); // Ref to hold the latest allStocks

  useEffect(() => {
    allStocksRef.current = allStocks;
  }, [allStocks]);

  const checkAlerts = useCallback((currentStocks: Stock[]) => {
    if (!currentStocks || currentStocks.length === 0) return;

    currentStocks.forEach(stock => {
      if (!stock.symbol) return;

      // --- 1. Momentum Alert Check ---
      const prevMom = previousMomentumRef.current.get(stock.symbol);
      const currMom = stock.rankMomentum63;

      if (currMom !== undefined && currMom > 0 && (prevMom === undefined || prevMom <= 0)) {
        const sessionStorageKey = `momentumToast_${stock.symbol}`;
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionStorageKey) !== 'true') {
          addToast(`📈 ${stock.symbol} momentum just turned positive`, 'info', sessionStorageKey);
        }
      }

      if (currMom !== undefined) {
        previousMomentumRef.current.set(stock.symbol, currMom);
      } else {
        previousMomentumRef.current.delete(stock.symbol);
      }

      // --- 2. Intrinsic Value Alert Check ---
      const fcfPerShare = stock.freeCashFlowPerShareTTM;
      let currentIVState: IV_STATE = 'na';
      let ivThreshold = 0;

      if (fcfPerShare !== null && fcfPerShare !== undefined && fcfPerShare > 0 && stock.price > 0) {
        ivThreshold = fcfPerShare * 7; // The 70% of 10x FCF/share threshold
        currentIVState = stock.price < ivThreshold ? 'below' : 'above';
      }
      
      const previousIVState = previousIVStateRef.current.get(stock.symbol);

      if (currentIVState === 'below' && previousIVState !== 'below') {
        const sessionStorageKey = `intrinsicValueToast_${stock.symbol}`;
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionStorageKey) !== 'true') {
          addToast(`⚠️ ${stock.symbol} is now trading at less than 70% of our IV estimate.`, 'warning', sessionStorageKey);
        }
      }

      if (currentIVState !== 'na') {
        previousIVStateRef.current.set(stock.symbol, currentIVState);
      } else {
        previousIVStateRef.current.delete(stock.symbol);
      }
    });
  }, [addToast]);

  // Check alerts when allStocks data changes
  useEffect(() => {
    checkAlerts(allStocks);
  }, [allStocks, checkAlerts]);

  // For Playwright testing: listen to "mockPoll" event
  useEffect(() => {
    const handleMockPoll = () => {
      if (window.__MOCK_POLL__) {
        console.log('[useStockAlerts] mockPoll event received. Checking alerts with current stocks.');
        checkAlerts(allStocksRef.current);
      }
    };
    window.addEventListener('mockPoll', handleMockPoll);
    return () => {
      window.removeEventListener('mockPoll', handleMockPoll);
    };
  }, [checkAlerts]);
};