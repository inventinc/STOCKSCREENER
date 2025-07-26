
import React from 'react';
import { ActiveFilters, FilterGroupDef, FilterOption } from '../types';
import { FILTER_GROUPS } from '../constants';
import { CloseIcon } from './icons';

interface ActiveFiltersDisplayProps {
  activeFilters: ActiveFilters;
  onRemoveFilter: (group: string) => void;
}

const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({ activeFilters, onRemoveFilter }) => {
  const getFilterLabel = (groupKey: string, value: string): string => {
    // Attempt to find a more descriptive label for the filter
    // This function assumes 'value' is already the displayable value if not found in options
    // For boolean 'true', it will search for an option with value 'true' or fallback to "true"
    for (const group of FILTER_GROUPS) {
        // Check main group options first if they exist (e.g. for 'rankMomentum')
        if (group.id === groupKey && group.options) {
            const option = group.options.find(opt => opt.value === value);
            if (option) return option.label;
        }
        // Then check subGroups
        if (group.subGroups) {
            for (const subGroup of group.subGroups) {
                if (subGroup.id === groupKey) {
                    // For sliders, the value itself is usually sufficient or needs special formatting
                    if (subGroup.controlType === 'slider') {
                        let suffix = '';
                        if (groupKey === 'liquiditySafety') suffix = ' Days (Max)';
                        if (groupKey === 'interestCoverage') suffix = 'x (Min)';
                        return `${value}${suffix}`;
                    }
                     // For checkboxes or buttons
                    const option = subGroup.options.find(opt => opt.value === value);
                    if (option) return option.label;

                    // Specific handling for ncavSafety checkbox which might pass 'le0_66'
                    if (subGroup.id === 'ncavSafety' && value === 'le0_66' && subGroup.options[0]) {
                        return subGroup.options[0].label;
                    }
                }
            }
        }
        // For qualitativeAndCatalysts which are checkboxes like catalyst_spinOff = true
        if (group.id === 'qualitativeAndCatalysts' && group.options && groupKey.startsWith(group.id + '_')) {
            const actualValue = groupKey.substring((group.id + '_').length); // e.g. "spinOff"
            const option = group.options.find(opt => opt.value === actualValue);
            if (option && value === 'true') return option.label; // Show label if 'true'
        }
    }
    // Fallback for boolean true/false or if no specific label found
    if (value === 'true') return groupKey; // Or a more generic "Enabled"
    if (value === 'false') return `Not ${groupKey}`; // Or "Disabled"

    return value; // Fallback to the raw value if no label is found
  };
  
  const filtersToDisplay = Object.entries(activeFilters)
    .filter(([_, value]) => value !== undefined && value !== '' && value !== false); // Also filter out explicit 'false' for boolean toggles if they mean "not active"

  if (filtersToDisplay.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3" id="activeFiltersContainer">
      {filtersToDisplay.map(([group, value]) => (
        <span 
          key={group}
          className="flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs font-medium px-2.5 py-1 rounded-full"
        >
          {getFilterLabel(group, String(value!))}
          <button 
            className="ml-1.5 text-blue-800 dark:text-blue-100 hover:text-blue-900 dark:hover:text-blue-50 focus:outline-none"
            onClick={() => onRemoveFilter(group)}
            aria-label={`Remove ${getFilterLabel(group, String(value!))} filter`}
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

export default ActiveFiltersDisplay;
