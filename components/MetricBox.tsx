
import React from 'react';

interface MetricBoxProps {
  id: string;
  value: string | number;
  label: string;
  isVisible: boolean;
}

const MetricBox: React.FC<MetricBoxProps> = ({ id, value, label, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="p-3 bg-gray-100 rounded-md metric-box" data-metric-id={id}>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      <p className="text-xs sm:text-sm">{label}</p>
    </div>
  );
};

export default MetricBox;
    