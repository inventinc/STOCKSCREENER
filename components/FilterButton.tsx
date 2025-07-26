
import React from 'react';

interface FilterButtonProps {
  group: string;
  value: string;
  label: string;
  isActive: boolean;
  onClick: (group: string, value: string) => void;
  className?: string; // Optional className
}

const FilterButton: React.FC<FilterButtonProps> = ({ group, value, label, isActive, onClick, className = '' }) => {
  return (
    <button
      className={`filter-btn ${isActive ? 'filter-btn-active' : ''} ${className}`}
      data-filter-group={group}
      data-filter-value={value}
      onClick={() => onClick(group, value)}
    >
      {label}
    </button>
  );
};

export default FilterButton;
