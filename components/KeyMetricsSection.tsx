
import React from 'react';
import { Stock, KeyMetricVisibility } from '../types';
import MetricBox from './MetricBox';

interface KeyMetricsSectionProps {
  filteredStocks: Stock[];
  keyMetricsVisibility: KeyMetricVisibility;
  onOpenCustomizeModal: () => void;
}

const KeyMetricsSection: React.FC<KeyMetricsSectionProps> = ({ 
  filteredStocks, 
  keyMetricsVisibility,
  onOpenCustomizeModal 
}) => {
  const calculateAverage = (dataKey: keyof Stock, suffix: string = ''): string => {
    if (filteredStocks.length === 0) return `0${suffix}`;
    
    let total = 0;
    let count = 0;

    filteredStocks.forEach(stock => {
      const rawValue = stock[dataKey];
      let valStr: string;
      if (typeof rawValue === 'number') {
        valStr = String(rawValue);
      } else if (typeof rawValue === 'string') {
        valStr = rawValue;
      } else {
        return; 
      }
      
      const cleanedValStr = valStr.replace(/[^0-9.-]+/g,"");
      const val = parseFloat(cleanedValStr);

      if (!isNaN(val)) {
        total += val;
        count++;
      }
    });

    if (count === 0) return `0${suffix}`; 
    
    const avg = total / count;
    let decimals = 0;
    // dataKey 'fcfNi' from Stock object is already a string like "1.10" or "N/A".
    // If it represented a raw number and you were calculating its average, then apply decimals.
    // For 'rotce' (ROE proxy), it's also a string like "15.0%".
    if (dataKey === 'freeCashFlowPerShareTTM' || dataKey === 'netIncomePerShareTTM') decimals = 2; // Example if these were averaged directly
    else if (dataKey === 'debtToEbitdaTTM' || dataKey === 'enterpriseValueOverEBITDATTM') decimals = 1;
    else if (dataKey === 'returnOnEquityTTM') decimals = 1; // for percentage of ROE if it was raw
    
    // If the original dataKey points to an already formatted string (like stock.fcfNi or stock.rotce),
    // the parseFloat and toFixed logic might need adjustment or to operate on the raw numeric fields if available.
    // Assuming `dataKey` points to fields in `Stock` that are raw numbers for averaging, if not, this will be NaN.
    // The current `stock.debtEbitda`, `stock.evEbit`, `stock.fcfNi`, `stock.rotce` are already formatted strings.
    // Let's assume for averaging we'd use the raw numeric fields:
    // e.g., dataKey 'debtToEbitdaTTM' instead of 'debtEbitda' for calculation
    
    if (dataKey === 'debtToEbitdaTTM') return `${avg.toFixed(1)}${suffix}`;
    if (dataKey === 'enterpriseValueOverEBITDATTM') return `${avg.toFixed(1)}${suffix}`; // EV/EBITDA
    if (dataKey === 'returnOnEquityTTM') return `${(avg * 100).toFixed(1)}${suffix}`; // ROE as %
    // For FCF/NI, it needs to be calculated from fcfPerShareTTM and netIncomePerShareTTM
    // This simple average won't work directly for FCF/NI as a ratio.
    // It should be: sum(FCF_i) / sum(NI_i) or average of individual ratios if NI is not zero.
    // For now, this function will return NaN for fcfNi if passed as string.
    
    return `${avg.toFixed(decimals)}${suffix}`;
  };
  
  const avgDebtEbitda = calculateAverage('debtToEbitdaTTM', 'x');
  const avgEvEbitda = calculateAverage('enterpriseValueOverEBITDATTM', 'x'); 
  // Avg FCF/NI requires more complex logic than simple average of ratios string. Placeholder.
  const avgFcfNi = filteredStocks.length > 0 ? "Calc..." : "0"; 
  const avgRoe = calculateAverage('returnOnEquityTTM', '%');


  return (
    <section className="bg-white main-content-section p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
      <div className="flex justify-between items-center mb-4 relative">
        <h3 className="text-lg font-medium">Key Metrics (Averages for Passing Stocks)</h3>
        <button 
            className="text-blue-600 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
            onClick={onOpenCustomizeModal}
        >
            Customize
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
        <MetricBox id="stocksPassingFilters" value={filteredStocks.length} label="Stocks Passing" isVisible={keyMetricsVisibility.stocksPassingFilters} />
        <MetricBox id="avgDebtEbitda" value={avgDebtEbitda} label="Avg. Debt/EBITDA" isVisible={keyMetricsVisibility.avgDebtEbitda} />
        <MetricBox id="avgEvEbit" value={avgEvEbitda} label="Avg. EV/EBITDA" isVisible={keyMetricsVisibility.avgEvEbit} />
        <MetricBox id="avgFcfNi" value={avgFcfNi} label="Avg. FCF/NI" isVisible={keyMetricsVisibility.avgFcfNi} />
        <MetricBox id="avgRotce" value={avgRoe} label="Avg. ROE" isVisible={keyMetricsVisibility.avgRotce} />
      </div>
    </section>
  );
};

export default KeyMetricsSection;
