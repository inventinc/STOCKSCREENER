
import React from 'react';

interface UndoResetBarProps {
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
}

const UndoResetBar: React.FC<UndoResetBarProps> = ({ onUndo, onReset, canUndo }) => {
  const commonButtonStyles = "px-3 py-1.5 text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800";
  const undoButtonActiveStyles = "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400";
  const undoButtonDisabledStyles = "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400";
  const resetButtonStyles = "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400";

  return (
    <div className="flex items-center justify-end space-x-2 p-2 mb-2 bg-gray-50 dark:bg-gray-800 rounded-md shadow">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${commonButtonStyles} ${canUndo ? undoButtonActiveStyles : undoButtonDisabledStyles}`}
        aria-disabled={!canUndo}
      >
        ↩️ Undo Last Change
      </button>
      <button
        onClick={onReset}
        className={`${commonButtonStyles} ${resetButtonStyles}`}
      >
        🔄 Reset View
      </button>
    </div>
  );
};

export default UndoResetBar;
