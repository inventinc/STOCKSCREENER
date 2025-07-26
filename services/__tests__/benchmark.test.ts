
import { describe, it, expect } from '@jest/globals';
import { getComparisonColorClass } from '../../components/BenchmarkCard'; // Adjust path as needed

describe('getComparisonColorClass', () => {

  // Test cases where higher is better
  describe('when higher is better', () => {
    const higherIsBetter = true;

    it('should return green class when your value is better', () => {
      expect(getComparisonColorClass(10, 5, higherIsBetter)).toContain('green');
    });

    it('should return red class when your value is worse', () => {
      expect(getComparisonColorClass(5, 10, higherIsBetter)).toContain('red');
    });

    it('should return gray/neutral class when values are equal', () => {
      expect(getComparisonColorClass(10, 10, higherIsBetter)).toContain('gray');
    });
  });

  // Test cases where lower is better (if any such metric is added later)
  describe('when lower is better', () => {
    const higherIsBetter = false;

    it('should return green class when your value is better (lower)', () => {
      expect(getComparisonColorClass(5, 10, higherIsBetter)).toContain('green');
    });

    it('should return red class when your value is worse (higher)', () => {
      expect(getComparisonColorClass(10, 5, higherIsBetter)).toContain('red');
    });

    it('should return gray/neutral class when values are equal', () => {
      expect(getComparisonColorClass(5, 5, higherIsBetter)).toContain('gray');
    });
  });

  // Test cases for N/A values
  describe('with N/A values', () => {
    it('should return gray/neutral class if your value is N/A', () => {
      expect(getComparisonColorClass('N/A', 10, true)).toContain('gray');
    });

    it('should return gray/neutral class if S&P value is N/A', () => {
      expect(getComparisonColorClass(10, 'N/A', true)).toContain('gray');
    });

    it('should return gray/neutral class if both values are N/A', () => {
      expect(getComparisonColorClass('N/A', 'N/A', true)).toContain('gray');
    });
  });
});
