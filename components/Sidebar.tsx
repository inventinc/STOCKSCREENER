


import React, { useState, useEffect } from 'react';
import { ActiveFilters, FilterGroupDef, Preset as PresetType, FilterOption, SubFilterGroupDef, SimpleFilterValues } from '../types';
import { FILTER_GROUPS, PRESETS } from '../constants';
import Accordion from './Accordion';
import FilterButton from './FilterButton';
import PresetCard from './PresetCard';
import { CloseIcon } from './icons';

interface SidebarProps {
  isSimpleMode: boolean;
  setIsSimpleMode: (isSimple: boolean) => void;
  simpleFilterValues: SimpleFilterValues;
  onSimpleFilterChange: (values: SimpleFilterValues) => void;
  activeFilters: ActiveFilters;
  onFilterChange: (group: string, value: string) => void;
  onClearAllFilters: () => void;
  onApplyPreset: (filters: ActiveFilters) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenPresetWizard: () => void; 
}

const SimpleSlider: React.FC<{
  label: string;
  subLabelLeft: string;
  subLabelRight: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, subLabelLeft, subLabelRight, value, onChange }) => (
  <div className="mb-6">
    <label className="block text-lg font-medium text-gray-800 dark:text-gray-100 mb-2 text-center">{label}</label>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={onChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
    />
    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>{subLabelLeft}</span>
      <span>{subLabelRight}</span>
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  isSimpleMode,
  setIsSimpleMode,
  simpleFilterValues,
  onSimpleFilterChange,
  activeFilters, 
  onFilterChange, 
  onClearAllFilters, 
  onApplyPreset,
  isOpen,
  onClose,
  onOpenPresetWizard
}) => {
  
  const [sliderValues, setSliderValues] = useState<{[key: string]: number}>({});

  useEffect(() => {
    // Initialize slider values from activeFilters if they exist
    const initialSliders: {[key: string]: number} = {};
    FILTER_GROUPS.forEach(group => {
      group.subGroups?.forEach(subGroup => {
        if (subGroup.controlType === 'slider' && activeFilters[subGroup.id]) {
          initialSliders[subGroup.id] = Number(activeFilters[subGroup.id]);
        } else if (subGroup.controlType === 'slider' && subGroup.sliderDefault !== undefined) {
          // If no active filter, but a default exists, use it for display
           if (!activeFilters[subGroup.id]) { // only if not already set by active filter
            initialSliders[subGroup.id] = subGroup.sliderDefault;
           }
        }
      });
    });
    setSliderValues(initialSliders);
  }, [activeFilters, isOpen]); // Re-initialize if activeFilters change or sidebar opens


  const handleSliderChange = (groupName: string, value: string) => {
    const numericValue = Number(value);
    setSliderValues(prev => ({ ...prev, [groupName]: numericValue }));
    // Immediately apply filter change for sliders
    onFilterChange(groupName, String(numericValue)); 
  };
  
  const handleCheckboxFilterChange = (groupName: string, optionValue: string, isChecked: boolean) => {
    if (isChecked) {
        onFilterChange(groupName, optionValue);
    } else {
        onFilterChange(groupName, ''); // This should trigger deletion in App's handleFilterChange
    }
  };


  const renderFilterOptions = (groupDef: SubFilterGroupDef) => {
    const groupName = groupDef.id;
    const options = groupDef.options;

    if (groupDef.controlType === 'slider' && 'sliderMin' in groupDef && 'sliderMax' in groupDef) {
      const currentValue = sliderValues[groupName] ?? groupDef.sliderDefault ?? groupDef.sliderMin;
      let displayValueSuffix = '';
      if (groupName === 'liquiditySafety') displayValueSuffix = ' Days (Max)';
      if (groupName === 'interestCoverage') displayValueSuffix = 'x (Min)';

      return (
         <div>
          {groupDef.tooltip && <span className="ml-1 text-gray-400 dark:text-gray-300 cursor-help" title={groupDef.tooltip}>&#9432;</span>}
          <input 
            type="range"
            min={groupDef.sliderMin}
            max={groupDef.sliderMax}
            step={groupDef.sliderStep ?? 1}
            value={currentValue}
            onChange={(e) => handleSliderChange(groupName, e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">{currentValue}{displayValueSuffix}</div>
        </div>
      );
    }
    
    if (groupDef.controlType === 'checkbox' && 'checkboxValue' in groupDef && options && options.length === 1) {
        const opt = options[0];
        const isChecked = activeFilters[groupName] === groupDef.checkboxValue;
        return (
             <div className="flex items-center">
                <input 
                    type="checkbox" 
                    id={`${groupName}-${opt.value}`} 
                    name={groupName} 
                    value={opt.value}
                    checked={isChecked}
                    onChange={(e) => handleCheckboxFilterChange(groupName, groupDef.checkboxValue!, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                />
                <label htmlFor={`${groupName}-${opt.value}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{opt.label}</label>
                 {groupDef.tooltip && <span className="ml-1 text-gray-400 dark:text-gray-300 cursor-help" title={groupDef.tooltip}>&#9432;</span>}
            </div>
        );
    }

    if (groupDef.controlType === 'checkboxes' && options) { // For multiple checkboxes in one group (e.g. catalysts)
        return (
            <ul className="space-y-1">
                {options.map(opt => {
                    const filterKey = `${groupName}_${opt.value}`; // For catalyst_spinOff, etc.
                    const isChecked = activeFilters[filterKey] === 'true';
                    return (
                        <li key={opt.value} className="flex items-center">
                            <input 
                                type="checkbox" 
                                id={`${groupName}-${opt.value}`} 
                                // Name can be more specific if these are independent toggles
                                name={filterKey} 
                                value={opt.value}
                                checked={isChecked} 
                                onChange={(e) => onFilterChange(filterKey, e.target.checked ? 'true' : '')}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                            />
                            <label htmlFor={`${groupName}-${opt.value}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{opt.label}</label>
                        </li>
                    );
                })}
            </ul>
        );
    }
    
    // For button-based filters (single select within a group, or standalone single button)
    if (groupDef.controlType === 'buttons' && options) {
      const isMomentumFilter = groupName === 'rankMomentumFilter';
      const isCatalystFilter = groupName === 'catalystFilter';
      const filterKey = isMomentumFilter ? 'rankMomentum' : (isCatalystFilter ? 'catalystOnly' : groupName);

      return (
        <div className="grid grid-cols-1 gap-2 text-sm">
          {options.map(opt => (
            <FilterButton
              key={opt.value}
              group={filterKey}
              value={opt.value}
              label={opt.label}
              isActive={activeFilters[filterKey] === opt.value}
              onClick={onFilterChange}
              className="w-full"
            />
          ))}
        </div>
      );
    }

    if (!options || options.length === 0) return null;

    const isMarketCapGroup = groupName === 'marketCap';

    let containerClassName: string;
    let buttonClassName: string = ''; 

    if (isMarketCapGroup) {
      containerClassName = 'grid grid-cols-1 gap-2 text-sm';
      buttonClassName = 'w-full h-14 flex items-center justify-center'; 
    } else {
      const defaultGridColsClass = 'grid-cols-2'; 
      const specificGridColsClass = (groupDef.id.startsWith("capitalStructure") || groupDef.id.startsWith("valuation")) 
                                   ? 'grid-cols-1 sm:grid-cols-2' 
                                   : defaultGridColsClass;
      containerClassName = `grid ${specificGridColsClass} gap-2 text-sm`;
    }

    return (
      <div className={containerClassName}>
        {options.map(opt => (
          <FilterButton
            key={opt.value}
            group={groupName}
            value={opt.value}
            label={opt.label}
            isActive={activeFilters[groupName] === opt.value}
            onClick={onFilterChange}
            className={buttonClassName} 
          />
        ))}
      </div>
    );
  };

  const handleSimpleFilterValueChange = (filter: keyof SimpleFilterValues, value: string) => {
    onSimpleFilterChange({ ...simpleFilterValues, [filter]: Number(value) });
  };


  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-internal-header flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Filters</h3>
        <div className="flex items-center">
          {!isSimpleMode && (
            <button 
              className="text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300 mr-3" 
              onClick={onClearAllFilters}
            >
              Clear All
            </button>
          )}
          <button onClick={onClose} className="mobile-sidebar-close-btn" aria-label="Close filters">
             <CloseIcon className="w-5 h-5"/>
          </button>
        </div>
      </div>
      <div className="sidebar-scroll-container sidebar-scroll">
        {/* Simple/Advanced Toggle */}
        <div className="flex items-center justify-center space-x-2 p-2 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button onClick={() => setIsSimpleMode(true)} className={`px-4 py-1 text-sm rounded-md ${isSimpleMode ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}>
                Simple
            </button>
            <button onClick={() => setIsSimpleMode(false)} className={`px-4 py-1 text-sm rounded-md ${!isSimpleMode ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}>
                Advanced
            </button>
        </div>
        
        {isSimpleMode ? (
          // SIMPLE MODE UI
          <div className="p-4">
            <SimpleSlider 
              label="🏢 Company Size"
              subLabelLeft="Nano Cap"
              subLabelRight="Mega Cap"
              value={simpleFilterValues.size}
              onChange={(e) => handleSimpleFilterValueChange('size', e.target.value)}
            />
             <SimpleSlider 
              label="💎 Value"
              subLabelLeft="Expensive"
              subLabelRight="Super Cheap"
              value={simpleFilterValues.value}
              onChange={(e) => handleSimpleFilterValueChange('value', e.target.value)}
            />
             <SimpleSlider 
              label="🏆 Quality"
              subLabelLeft="Low"
              subLabelRight="High"
              value={simpleFilterValues.quality}
              onChange={(e) => handleSimpleFilterValueChange('quality', e.target.value)}
            />
            <div className="mt-8 text-center">
              <button onClick={() => setIsSimpleMode(false)} className="text-blue-600 dark:text-blue-400 hover:underline">
                Show advanced filters &rarr;
              </button>
            </div>
          </div>
        ) : (
          // ADVANCED MODE UI
          <>
            <div className="mb-4">
                <button 
                    onClick={onOpenPresetWizard}
                    className="w-full filter-btn bg-green-500 hover:bg-green-600 text-white text-sm"
                >
                    ✨ Guided Setup Wizard
                </button>
            </div>

            {FILTER_GROUPS.map(group => (
              <Accordion key={group.id} title={group.title} emoji={group.emoji}>
                {group.subGroups?.map(subGroup => (
                  <div key={subGroup.id} className="mb-4">
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                        {subGroup.title}
                    </label>
                    {renderFilterOptions(subGroup)}
                  </div>
                ))}
              </Accordion>
            ))}
            <Accordion title="Presets" emoji="🎯">
              <div className="space-y-4">
                {PRESETS.map(preset => (
                  <PresetCard key={preset.id} preset={preset} onApplyPreset={onApplyPreset} />
                ))}
              </div>
            </Accordion>
            <Accordion title="Advanced Tools" emoji="🛠️">
                <button 
                    disabled 
                    className="w-full filter-btn opacity-50 cursor-not-allowed text-sm"
                    title="Backtesting requires backend processing."
                >
                    Backtest This Screen
                </button>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                    (Backend required for backtesting)
                </div>
                <button 
                    disabled 
                    className="w-full filter-btn opacity-50 cursor-not-allowed text-sm mt-2"
                    title="Alerts require backend implementation."
                >
                    Set Alert For Screen
                </button>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                    (Backend required for alerts)
                </div>
            </Accordion>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;