
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // Import to extend Jest matchers
import {describe, it, expect, jest, beforeEach} from '@jest/globals';

import WatchlistPane from '../WatchlistPane';
import * as stockService from '../../services/stockService'; // To mock fetchWatchlistExtras
import { Stock, WatchlistExtra } from '../../types';
import { NA_STRING } from '../../constants';

jest.mock('../../services/stockService'); // Mock the entire module

const mockFetchWatchlistExtras = stockService.fetchWatchlistExtras as jest.MockedFunction<typeof stockService.fetchWatchlistExtras>;

const mockAllStocks: Stock[] = [
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 150.00, simpleScore: 80, debtEbitda: "1.0x", evEbit: "10x", fcfNi: "1.1x", rotce: "20%", marketCapCategory: "large", volumeCategory: "high", debtCategory: "low", valuationCategory: "growth", rotceCategory: "good", numericDebtEbitdaCategory: "le1x", numericFcfNiCategory: "ge1.0", shareCountCagrCategory: "flat", numericEvEbitCategory: "le10x", deepValueCategory: NA_STRING, moatKeywordsCategory: NA_STRING, insiderOwnershipCategory: NA_STRING, netInsiderBuysCategory: NA_STRING, grossMarginTrendCategory: NA_STRING, incrementalRoicCategory: NA_STRING, redFlagsCategory: NA_STRING },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 250.00, simpleScore: 85, debtEbitda: "0.8x", evEbit: "12x", fcfNi: "1.2x", rotce: "25%", marketCapCategory: "large", volumeCategory: "high", debtCategory: "low", valuationCategory: "growth", rotceCategory: "excellent", numericDebtEbitdaCategory: "le1x", numericFcfNiCategory: "ge1.2", shareCountCagrCategory: "flat", numericEvEbitCategory: "le10x", deepValueCategory: NA_STRING, moatKeywordsCategory: NA_STRING, insiderOwnershipCategory: NA_STRING, netInsiderBuysCategory: NA_STRING, grossMarginTrendCategory: NA_STRING, incrementalRoicCategory: NA_STRING, redFlagsCategory: NA_STRING  },
];

const mockWatchlistSymbols = ['AAPL', 'MSFT'];

describe('WatchlistPane Extras', () => {
  beforeEach(() => {
    mockFetchWatchlistExtras.mockClear();
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    watchlistSymbols: mockWatchlistSymbols,
    allStocks: mockAllStocks,
    onStockClick: jest.fn(),
    onToggleWatchlist: jest.fn(),
  };

  it('fetches and displays 1-day price change and next earnings date', async () => {
    const mockExtras: WatchlistExtra[] = [
      { symbol: 'AAPL', priceChangePct: 1.23, nextEarnings: '2023-10-25' },
      { symbol: 'MSFT', priceChangePct: -0.55, nextEarnings: '2023-11-01' },
    ];
    mockFetchWatchlistExtras.mockResolvedValue(mockExtras);

    render(<WatchlistPane {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchWatchlistExtras).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    });
    
    // Check AAPL data
    expect(screen.getByText((content, element) => element?.textContent === '+1.23%')).toBeInTheDocument();
    expect(screen.getByText((content, element) => element?.textContent === '+1.23%')).toHaveClass('text-green-600');
    expect(screen.getByText('2023-10-25')).toBeInTheDocument();
    
    // Check MSFT data
    expect(screen.getByText((content, element) => element?.textContent === '-0.55%')).toBeInTheDocument();
    expect(screen.getByText((content, element) => element?.textContent === '-0.55%')).toHaveClass('text-red-600');
    expect(screen.getByText('2023-11-01')).toBeInTheDocument();
  });

  it('displays loading state correctly', async () => {
    mockFetchWatchlistExtras.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<WatchlistPane {...defaultProps} />);
    
    await waitFor(() => {
        // Find all elements that contain "Loading..."
        const loadingElements = screen.getAllByText('Loading...');
        // We expect two "Loading..." messages for price change and two for earnings date
        expect(loadingElements.length).toBeGreaterThanOrEqual(2 * mockWatchlistSymbols.length); 
    });
  });

  it('displays error state correctly', async () => {
    mockFetchWatchlistExtras.mockRejectedValue(new Error('API Error'));

    render(<WatchlistPane {...defaultProps} />);

    await waitFor(() => {
        // Find all elements that are 'Error'
        const errorElements = screen.getAllByText('Error');
         // We expect two "Error" messages for price change and two for earnings date per stock
        expect(errorElements.length).toBeGreaterThanOrEqual(2 * mockWatchlistSymbols.length); 
        errorElements.forEach(el => expect(el).toHaveClass('text-red-500'));
    });
  });

  it('displays N/A for missing data from successful fetch', async () => {
    const mockExtrasPartial: WatchlistExtra[] = [
      { symbol: 'AAPL', priceChangePct: null, nextEarnings: '—' }, // priceChangePct is null, nextEarnings is '—'
      { symbol: 'MSFT', priceChangePct: 0.00, nextEarnings: '2023-11-05' }, // priceChangePct is 0.00
    ];
    mockFetchWatchlistExtras.mockResolvedValue(mockExtrasPartial);

    render(<WatchlistPane {...defaultProps} />);

    await waitFor(() => {
      // AAPL should show N/A for price change, and NA_STRING (which might be '—' or "N/A" based on constant) for earnings
      const aaplPriceChangeCell = screen.getAllByText(NA_STRING).find(el => el.closest('li')?.textContent?.includes('AAPL'));
      expect(aaplPriceChangeCell).toBeInTheDocument();

      const aaplEarningsCell = screen.getAllByText(NA_STRING).find(el => el.closest('li')?.textContent?.includes('AAPL') && el.previousSibling?.textContent?.includes('Next Earnings'));
      expect(aaplEarningsCell).toBeInTheDocument();

      // MSFT price change should be +0.00% and green
      expect(screen.getByText((content, element) => element?.textContent === '+0.00%')).toBeInTheDocument();
      expect(screen.getByText((content, element) => element?.textContent === '+0.00%')).toHaveClass('text-green-600');
      expect(screen.getByText('2023-11-05')).toBeInTheDocument();
    });
  });

   it('does not fetch if pane is not open', () => {
    render(<WatchlistPane {...defaultProps} isOpen={false} />);
    expect(mockFetchWatchlistExtras).not.toHaveBeenCalled();
  });

  it('does not fetch if watchlist is empty', () => {
    render(<WatchlistPane {...defaultProps} watchlistSymbols={[]} />);
    expect(mockFetchWatchlistExtras).not.toHaveBeenCalled();
  });
});

