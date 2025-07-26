
import React, { useState, ReactNode } from 'react';
import { AccordionArrowIcon } from './icons';

interface AccordionProps {
  title: string;
  emoji?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, emoji, children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="mb-6 filter-group-bg p-4 rounded-lg">
      <div 
        className="flex justify-between items-center cursor-pointer py-2" 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
      >
        <h4 className="font-semibold flex items-center">
          {emoji && <span className="text-xl mr-2">{emoji}</span>}
          {title}
        </h4>
        <AccordionArrowIcon isOpen={isOpen} />
      </div>
      {isOpen && (
        <div className="space-y-4 mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;
    