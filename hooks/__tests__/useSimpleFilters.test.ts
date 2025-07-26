import { renderHook } from '@testing-library/react-hooks';
import { describe, it, expect } from '@jest/globals';
import { useSimpleFilters } from '../useSimpleFilters';
import { SimpleFilterValues } from '../../types';

describe('useSimpleFilters', () => {

  it('should return default mid-range filters', () => {
    // Use values like 51 to be > 50 to fall into the 'average' and 'blend' categories
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 51, quality: 60 }));
    expect(result.current).toEqual({
      marketCap: 'micro',        // 26-50 range
      peRatio: 'blend',          // > 50
      roe: 'average',            // > 50
      debtEquityRatio: 'medium', // > 50
      fcfToNetIncome: 'ge0.8',   // > 50
    });
  });

  // Size Tests
  it('should map size slider to nano cap', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 10, value: 50, quality: 50 }));
    expect(result.current.marketCap).toBe('nano');
  });

  it('should map size slider to mid/large cap', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 90, value: 50, quality: 50 }));
    expect(result.current.marketCap).toBe('midLarge');
  });

  // Value Tests
  it('should map value slider to "super cheap" (NCAV safety check)', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 98, quality: 50 }));
    expect(result.current.ncavSafety).toBe('le0_66');
  });

  it('should map value slider to "cheap" (low P/E and EV/EBITDA)', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 85, quality: 50 }));
    expect(result.current.peRatio).toBe('value');
    expect(result.current.evToEbit).toBe('le8x');
  });
    
  it('should map value slider to "expensive" (growth P/E)', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 10, quality: 50 }));
    expect(result.current.peRatio).toBe('growth');
  });

  // Quality Tests
  it('should apply no quality filters at lowest setting', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 50, quality: 10 }));
    // roe: poor is applied for quality > 25, so for 10 it should be undefined. This is correct.
    expect(result.current.roe).toBeUndefined();
    expect(result.current.debtEquityRatio).toBeUndefined();
  });

  it('should apply "decent quality" filters', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 50, quality: 60 }));
    expect(result.current.roe).toBe('average');
    expect(result.current.debtEquityRatio).toBe('medium');
    expect(result.current.fcfToNetIncome).toBe('ge0.8');
  });

  it('should apply "high quality" filters', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 50, quality: 80 }));
    expect(result.current.roe).toBe('good');
    expect(result.current.debtEquityRatio).toBe('low');
    expect(result.current.fcfToNetIncome).toBe('ge1.0');
    expect(result.current.interestCoverage).toBe('5');
  });
  
  it('should apply "top tier quality" filters', () => {
    const { result } = renderHook(() => useSimpleFilters({ size: 50, value: 50, quality: 95 }));
    expect(result.current.roe).toBe('excellent');
    expect(result.current.debtEquityRatio).toBe('low');
    expect(result.current.fcfToNetIncome).toBe('ge1.2');
    expect(result.current.interestCoverage).toBe('10');
    expect(result.current.gmTrend).toBe('improving');
  });

  // Combination Test
  it('should combine filters from all three sliders correctly', () => {
    const simpleValues: SimpleFilterValues = {
      size: 80, // midLarge
      value: 90, // value P/E, le8x EV/EBITDA
      quality: 85, // good ROE, low D/E, ge1.0 FCF/NI, 5x IntCov
    };
    const { result } = renderHook(() => useSimpleFilters(simpleValues));
    expect(result.current).toEqual({
      marketCap: 'midLarge',
      peRatio: 'value',
      evToEbit: 'le8x',
      roe: 'good',
      debtEquityRatio: 'low',
      fcfToNetIncome: 'ge1.0',
      interestCoverage: '5',
    });
  });
});