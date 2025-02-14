import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  value: Option[];
  onChange: (options: Option[]) => void;
  options: Option[];
  isLoading?: boolean;
  error?: string | null;
}

export default function MultiSelectDropdown({
  id,
  label,
  value,
  onChange,
  options,
  isLoading = false,
  error = null
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) &&
    !value.some(selected => selected.id === option.id)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemove = (optionToRemove: Option) => {
    onChange(value.filter(option => option.id !== optionToRemove.id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor={id} className="block text-sm font-medium text-brand-secondary-400">
        {label}
      </label>
      <div className="mt-1">
        <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-brand-accent focus-within:border-brand-accent">
          <div className="flex flex-wrap gap-2 mb-2">
            {value.map(option => (
              <span
                key={option.id}
                className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-brand-secondary-100 text-brand-primary"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => handleRemove(option)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={value.length === 0 ? "Search..." : ""}
            className="w-full border-none p-0 focus:ring-0 text-sm"
          />
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {isLoading ? (
              <li className="px-4 py-2 text-sm text-gray-500">Loading...</li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-500">
                {search.length > 0 ? 'No results found' : 'No options available'}
              </li>
            ) : (
              filteredOptions.map(option => (
                <li
                  key={option.id}
                  onClick={() => {
                    onChange([...value, option]);
                    setSearch('');
                  }}
                  className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}