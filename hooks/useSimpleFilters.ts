import { useMemo } from 'react';
import { ActiveFilters, SimpleFilterValues } from '../types';

export const useSimpleFilters = (simpleValues: SimpleFilterValues): ActiveFilters => {
  return useMemo(() => {
    const filters: ActiveFilters = {};

    // 1. Company Size Slider (0-100)
    // 0-25: Nano, 26-50: Micro, 51-75: Small, 76-100: Mid/Large
    if (simpleValues.size <= 25) {
      filters.marketCap = 'nano';
    } else if (simpleValues.size <= 50) {
      filters.marketCap = 'micro';
    } else if (simpleValues.size <= 75) {
      filters.marketCap = 'small';
    } else {
      filters.marketCap = 'midLarge';
    }

    // 2. Value Slider (0-100) -> 0 is Expensive, 100 is Super Cheap
    // Let's map this to P/E ratio, EV/EBITDA, and P/NCAV
    if (simpleValues.value > 95) {
        filters.ncavSafety = 'le0_66'; // Super cheap
    } else if (simpleValues.value > 80) {
        filters.peRatio = 'value'; // Cheap (e.g., <15 P/E)
        filters.evToEbit = 'le8x';
    } else if (simpleValues.value > 50) {
        filters.peRatio = 'blend'; // Fairly priced
    } else if (simpleValues.value > 20) {
        // No filter, allows more expensive stocks
    } else {
        filters.peRatio = 'growth'; // Very expensive
    }

    // 3. Quality Slider (0-100) -> 0 is Low, 100 is High
    // Let's map this to ROE, Debt, FCF/NI ratio, and Interest Coverage
    if (simpleValues.quality > 90) { // Top Tier
      filters.roe = 'excellent'; // >20%
      filters.debtEquityRatio = 'low'; // <0.5
      filters.fcfToNetIncome = 'ge1.2';
      filters.interestCoverage = '10'; // >= 10x
      filters.gmTrend = 'improving';
    } else if (simpleValues.quality > 75) { // High Quality
      filters.roe = 'good'; // 15-20%
      filters.debtEquityRatio = 'low'; // <0.5
      filters.fcfToNetIncome = 'ge1.0';
      filters.interestCoverage = '5'; // >= 5x
    } else if (simpleValues.quality > 50) { // Decent Quality
      filters.roe = 'average'; // 10-15%
      filters.debtEquityRatio = 'medium'; // 0.5-1.0
      filters.fcfToNetIncome = 'ge0.8';
    } else if (simpleValues.quality > 25) { // Any Profitability
        filters.roe = 'poor'; // but positive TTM ROE
    }
    // Below 25 -> No quality filters applied, shows everything.

    return filters;
  }, [simpleValues]);
};
