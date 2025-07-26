
import React from 'react';
import { Theme } from '../types';
import { LogoIcon, SunIcon, MoonIcon } from './icons'; // Removed unused FilterIcon

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  onRefreshData: () => void; // New
  onToggleWatchlistPane: () => void; // New
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onRefreshData, onToggleWatchlistPane }) => {
  return (
    <div id="globalHeader" className="p-3 shadow-md flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center">
        <LogoIcon />
        <h1 className="text-lg font-semibold">Stock Screener</h1>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefreshData}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          aria-label="Refresh data"
          title="Refresh All Data"
        >
          🔄
        </button>
        <button
          onClick={onToggleWatchlistPane}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          aria-label="Toggle watchlist"
          title="Open Watchlist"
        >
          ⭐
        </button>
        <button 
          id="darkModeToggleBtn" 
          onClick={toggleTheme} 
          className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  );
};

export default Header;
