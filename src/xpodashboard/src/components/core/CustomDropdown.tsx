'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string, index: number) => void;
  placeholder?: string;
}

const CustomDropdown = ({ value, options, onChange, placeholder }: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayValue = value === '' && placeholder ? placeholder : value;

  return (
    <div className="relative inline-block">
      <button 
        className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-red-10/50 rounded-lg text-black transition-all duration-300 min-w-[120px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm${value === '' && placeholder ? ' text-black' : ''}`}>{displayValue}</span>
        <ChevronDown className="h-4 w-4 text-neutral-500 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-full bg-white border border-neutral-150 rounded-lg shadow-lg z-10">
          {options.map((option, index) => (
            <button
              key={option}
              className="w-full px-4 py-2 text-left hover:bg-red-10/10 text-black text-sm transition-colors first:rounded-t-lg last:rounded-b-lg"
              onClick={() => {
                onChange(option, index);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown; 