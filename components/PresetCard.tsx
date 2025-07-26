
import React from 'react';
import { Preset, ActiveFilters } from '../types';

interface PresetCardProps {
  preset: Preset;
  onApplyPreset: (filters: ActiveFilters) => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, onApplyPreset }) => {
  return (
    <div className="bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="flex items-center mb-2">
        <span className="text-xl mr-2">{preset.emoji}</span>
        <h5 className="font-medium">{preset.name}</h5>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{preset.description}</p>
      <button 
        className="w-full bg-blue-500 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => onApplyPreset(preset.filters)}
      >
        Apply Preset
      </button>
    </div>
  );
};

export default PresetCard;
    