

import React, { useEffect } from 'react';
import { ToastMessage, ToastType } from '../types'; 
import { CloseIcon } from './icons';

interface ToastProps extends ToastMessage {
  onDismiss: (id: string, sessionStorageKey?: string) => void;
}

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-black';
    case 'info':
    default:
      return 'bg-blue-500 text-white';
  }
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 7000, onDismiss, sessionStorageKey }) => {
  useEffect(() => {
    if (duration && duration > 0) { // Ensure duration is positive
      const timer = setTimeout(() => {
        onDismiss(id, sessionStorageKey);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss, sessionStorageKey]);

  return (
    <div 
      className={`relative p-3 rounded-md shadow-lg flex items-start justify-between text-sm ${getToastStyles(type)} mb-2 max-w-sm w-full`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-grow pr-2 break-words">{message}</div>
      <button 
        onClick={() => onDismiss(id, sessionStorageKey)} 
        className="ml-2 p-1 -m-1 rounded-full hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-1 focus:ring-white"
        aria-label="Dismiss notification"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;