import React, { useState, useEffect } from 'react';
import { KeyMetricVisibility, DisplayMetricConfig } from '../types';
import { CloseIcon } from './icons';

interface CustomizeMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (newVisibility: KeyMetricVisibility) => void;
  currentVisibilityConfig: KeyMetricVisibility;
  displayMetricsConfig: DisplayMetricConfig[];
}

const CustomizeMetricsModal: React.FC<CustomizeMetricsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentVisibilityConfig,
  displayMetricsConfig
}) => {
  const [localVisibility, setLocalVisibility] = useState<KeyMetricVisibility>(currentVisibilityConfig);

  useEffect(() => {
    setLocalVisibility(currentVisibilityConfig);
  }, [currentVisibilityConfig, isOpen]);

  if (!isOpen) return null;

  const handleCheckboxChange = (metricId: keyof KeyMetricVisibility) => {
    setLocalVisibility(prev => ({
      ...prev,
      [metricId]: !prev[metricId]
    }));
  };

  const handleApply = () => {
    onApply(localVisibility);
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} aria-modal="true" role="dialog">
      <div className="modal-content-inner modal-content-bg max-w-lg w-full p-0">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customize Metrics Display</h3>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-4 sm:p-6 max-h-80 overflow-y-auto space-y-1">
          {displayMetricsConfig.map(metric => (
            <label 
              key={metric.id} 
              htmlFor={`metric-checkbox-${metric.id}`} 
              className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
            >
              <input
                type="checkbox"
                id={`metric-checkbox-${metric.id}`}
                value={metric.id}
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-offset-gray-800 dark:bg-gray-600"
                checked={localVisibility[metric.id as keyof KeyMetricVisibility] || false}
                onChange={() => handleCheckboxChange(metric.id as keyof KeyMetricVisibility)}
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{metric.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-800"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            onClick={handleApply}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizeMetricsModal;