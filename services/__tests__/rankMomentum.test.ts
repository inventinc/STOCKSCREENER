import { describe, it, expect } from '@jest/globals';
import { Stock } from '../../types'; // Adjust path as needed

// This function simulates the core logic of rankMomentum63 calculation
const calculateRankMomentum63 = (todayScore?: number, score63DaysAgo?: number): number | undefined => {
  if (todayScore === undefined || score63DaysAgo === undefined) {
    return undefined; // Or 0, depending on desired default if data is missing
  }
  return todayScore - score63DaysAgo;
};

// This function simulates how it might be done in stockService.ts with jitter
const simulateRankMomentumInService = (stock: Partial<Stock>): Partial<Stock> => {
  const todayScore = stock.simpleScore;
  let score63DaysAgo: number | undefined = undefined;
  let rankMomentum63: number | undefined = undefined;

  if (todayScore !== undefined) {
    // Simulate score63DaysAgo with a +/- 5% jitter
    score63DaysAgo = Math.max(0, Math.min(100, Math.round(todayScore * (1 + (Math.random() * 0.10 - 0.05)))));
    rankMomentum63 = todayScore - score63DaysAgo;
  }
  
  return { ...stock, score63DaysAgo, rankMomentum63 };
};

describe('Rank Momentum Calculation', () => {
  it('should calculate rankMomentum63 correctly when todayScore > score63DaysAgo', () => {
    const todayScore = 70;
    const score63DaysAgo = 50;
    expect(calculateRankMomentum63(todayScore, score63DaysAgo)).toBe(20);
  });

  it('should calculate rankMomentum63 correctly when todayScore < score63DaysAgo', () => {
    const todayScore = 60;
    const score63DaysAgo = 75;
    expect(calculateRankMomentum63(todayScore, score63DaysAgo)).toBe(-15);
  });

  it('should calculate rankMomentum63 correctly when todayScore === score63DaysAgo', () => {
    const todayScore = 80;
    const score63DaysAgo = 80;
    expect(calculateRankMomentum63(todayScore, score63DaysAgo)).toBe(0);
  });

  it('should return undefined if todayScore is undefined', () => {
    expect(calculateRankMomentum63(undefined, 50)).toBeUndefined();
  });

  it('should return undefined if score63DaysAgo is undefined', () => {
    expect(calculateRankMomentum63(70, undefined)).toBeUndefined();
  });

  it('should default rankMomentum63 to undefined (or 0 if preferred) if simpleScore is missing in simulation', () => {
    const stockWithoutScore: Partial<Stock> = { symbol: 'TEST' };
    const result = simulateRankMomentumInService(stockWithoutScore);
    expect(result.rankMomentum63).toBeUndefined(); // Or expect(result.rankMomentum63).toBe(0);
    expect(result.score63DaysAgo).toBeUndefined();
  });

  it('simulated rankMomentum63 in service should be a number if simpleScore exists', () => {
    const stockWithScore: Partial<Stock> = { symbol: 'TEST', simpleScore: 70 };
    const result = simulateRankMomentumInService(stockWithScore);
    expect(typeof result.rankMomentum63).toBe('number');
    expect(typeof result.score63DaysAgo).toBe('number');
    // Check if score63DaysAgo is within a reasonable range of simpleScore (e.g., +/- 10% for safety due to random jitter)
    if (result.simpleScore !== undefined && result.score63DaysAgo !== undefined) {
        expect(result.score63DaysAgo).toBeGreaterThanOrEqual(result.simpleScore * 0.90); // simpleScore * (1 - 0.05 - epsilon for rounding)
        expect(result.score63DaysAgo).toBeLessThanOrEqual(result.simpleScore * 1.10);    // simpleScore * (1 + 0.05 + epsilon for rounding)
    }
  });
});
