
import React from 'react';
import { SearchIcon } from './icons';

interface StockSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ searchTerm, onSearchTermChange }) => {
  return (
    <div className="relative">
      <input 
        type="text" 
        id="stockSearchInput" 
        placeholder="Search symbols or type commands (e.g., 'large cap value')" 
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        aria-label="Stock search or command input"
      />
      <SearchIcon />
    </div>
  );
};

export default StockSearch;
