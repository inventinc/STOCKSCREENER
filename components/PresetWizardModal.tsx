
import React, { useState } from 'react';
import { ActiveFilters } from '../types';
import { PRESETS } from '../constants';
import { CloseIcon } from './icons'; // Import CloseIcon

interface PresetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (filters: ActiveFilters) => void;
}

const PresetWizardModal: React.FC<PresetWizardModalProps> = ({ isOpen, onClose, onApplyPreset }) => {
  const [step, setStep] = useState(1);
  const [answer1, setAnswer1] = useState<string | null>(null);
  // answer2 is set but its value is not read; if it's intended for future use, it's fine.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [answer2, setAnswer2] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnswer = (question: number, value: string) => {
    if (question === 1) {
      setAnswer1(value);
      setStep(2);
    } else if (question === 2) {
      setAnswer2(value); // Store answer2
      // Logic to determine preset based on answers
      let chosenPresetId = PRESETS[0]?.id || 'deepValue'; // Default to the first preset or 'deepValue'

      if (answer1 === 'value' && value === 'conservative') {
        chosenPresetId = 'deepValue';
      } else if (answer1 === 'growth' && value === 'aggressive') {
        chosenPresetId = 'qualityCompounders';
      } else if (answer1 === 'balanced' && value === 'moderate') {
        // Example: Could map to a different preset or default
        chosenPresetId = PRESETS[1]?.id || 'qualityCompounders';
      }
      
      const presetToApply = PRESETS.find(p => p.id === chosenPresetId);
      onApplyPreset(presetToApply?.filters || {});
      
      onClose(); // Close after applying
      // Reset for next time
      setStep(1);
      setAnswer1(null);
      setAnswer2(null);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setAnswer1(null);
    setAnswer2(null);
    onClose();
  }

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Question 1 of 2</p>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">What's your primary investment style?</p>
          <div className="space-y-3">
            <button onClick={() => handleAnswer(1, 'value')} className="w-full filter-btn py-3 px-4 text-left">A) Looking for Undervalued Companies (Value)</button>
            <button onClick={() => handleAnswer(1, 'growth')} className="w-full filter-btn py-3 px-4 text-left">B) Seeking High-Growth Potential (Growth)</button>
            <button onClick={() => handleAnswer(1, 'balanced')} className="w-full filter-btn py-3 px-4 text-left">C) A Balanced Approach</button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Question 2 of 2</p>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">How would you describe your risk tolerance?</p>
          <div className="space-y-3">
            <button onClick={() => handleAnswer(2, 'conservative')} className="w-full filter-btn py-3 px-4 text-left">A) Conservative (Prefer stability)</button>
            <button onClick={() => handleAnswer(2, 'moderate')} className="w-full filter-btn py-3 px-4 text-left">B) Moderate (Open to some risk for better returns)</button>
            <button onClick={() => handleAnswer(2, 'aggressive')} className="w-full filter-btn py-3 px-4 text-left">C) Aggressive (Willing to take on more risk)</button>
          </div>
          <button 
            onClick={() => setStep(1)} 
            className="mt-6 text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
          >
            &larr; Back to Question 1
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} aria-modal="true" role="dialog">
      <div className="modal-content-inner modal-content-bg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Guided Screen Setup</h3>
            <button 
                onClick={resetWizard} 
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close wizard"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>

        {renderStepContent()}
        
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-800"
                onClick={resetWizard}
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default PresetWizardModal;
