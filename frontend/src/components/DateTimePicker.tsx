import { useState, useRef, useEffect } from 'react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  className = "",
  required = false,
  placeholder = "Select date and time"
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDateTime, setTempDateTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Initialize tempDateTime when value changes
  useEffect(() => {
    if (value) {
      setTempDateTime(value);
    } else {
      // Set default to current date/time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTempDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [value]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSet = () => {
    onChange(tempDateTime);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempDateTime('');
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const today = `${year}-${month}-${day}T${hours}:${minutes}`;
    setTempDateTime(today);
  };

  const incrementTime = (type: 'hours' | 'minutes', delta: number) => {
    const [datePart, timePart] = tempDateTime.split('T');
    if (!timePart) return;

    const [hours, minutes] = timePart.split(':').map(Number);
    
    if (type === 'hours') {
      const newHours = Math.max(0, Math.min(23, hours + delta));
      const newTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setTempDateTime(`${datePart}T${newTime}`);
    } else {
      const newMinutes = Math.max(0, Math.min(59, minutes + delta));
      const newTime = `${String(hours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      setTempDateTime(`${datePart}T${newTime}`);
    }
  };

  const formatDisplayValue = (value: string) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={formatDisplayValue(value)}
        onClick={handleOpen}
        readOnly
        className={`${className} cursor-pointer`}
        placeholder={placeholder}
        required={required}
      />
      
      {isOpen && (
        <div 
          ref={popupRef}
          className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 p-4 min-w-80"
        >
          <div className="flex gap-4">
            {/* Date Picker */}
            <div className="flex-1">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={tempDateTime.split('T')[0] || ''}
                  onChange={(e) => {
                    const [, timePart] = tempDateTime.split('T');
                    setTempDateTime(`${e.target.value}T${timePart || '00:00'}`);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Date Controls */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Time Picker */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              
              <div className="flex items-center gap-2">
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => incrementTime('hours', 1)}
                    className="w-8 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ↑
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={tempDateTime.split('T')[1]?.split(':')[0] || '00'}
                    onChange={(e) => {
                      const hours = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                      const [datePart, timePart] = tempDateTime.split('T');
                      const [, minutes] = timePart?.split(':') || ['00', '00'];
                      setTempDateTime(`${datePart}T${String(hours).padStart(2, '0')}:${minutes}`);
                    }}
                    className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => incrementTime('hours', -1)}
                    className="w-8 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ↓
                  </button>
                </div>

                <span className="text-lg text-gray-500 dark:text-gray-400">:</span>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => incrementTime('minutes', 1)}
                    className="w-8 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ↑
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={tempDateTime.split('T')[1]?.split(':')[1] || '00'}
                    onChange={(e) => {
                      const minutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                      const [datePart, timePart] = tempDateTime.split('T');
                      const [hours] = timePart?.split(':') || ['00'];
                      setTempDateTime(`${datePart}T${hours}:${String(minutes).padStart(2, '0')}`);
                    }}
                    className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => incrementTime('minutes', -1)}
                    className="w-8 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
