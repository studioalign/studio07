import React, { useState, useEffect, useRef } from 'react';

interface Option {
  id: string;
  label: string;
}

interface SearchableDropdownProps {
  id: string;
  label: string;
  value: Option | null;
  onChange: (option: Option | null) => void;
  options: Option[];
  isLoading?: boolean;
  required?: boolean;
  error?: string | null;
}

export default function SearchableDropdown({
  id,
  label,
  value,
  onChange,
  options,
  required = false,
  isLoading = false,
  error = null
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor={id} className="block text-sm font-medium text-brand-secondary-400">
        {label}
      </label>
      <div className="mt-1">
        <input
          type="text"
          id={id}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value ? value.label : 'Search...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
        />
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
              <li className="px-4 py-2 text-sm text-gray-500">No results found</li>
            ) : (
              filteredOptions.map(option => (
                <li
                  key={option.id}
                  onClick={() => {
                    onChange(option);
                    setSearch('');
                    setIsOpen(false);
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