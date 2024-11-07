import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MdSort } from 'react-icons/md';
import { SortDirection } from '@/utils/sort-utils';

interface SortButtonProps {
  options: { label: string; value: string }[];
  onSort: (value: string, direction: SortDirection) => void;
  currentSort?: string;
  currentDirection?: SortDirection;
  vertical?: boolean;
}

export const SortButton = ({
  options,
  onSort,
  currentSort,
  currentDirection = 'desc',
  vertical = false
}: SortButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSortClick = (value: string) => {
    onSort(value, currentDirection === 'asc' ? 'desc' : 'asc');
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Render the dropdown using a portal
  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      className="absolute bg-white rounded shadow-lg z-50 min-w-[150px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
      style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
    >
      <div className="overflow-y-auto">
        {options.map((option) => (
          <button
            key={option.value}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm border-b border-gray-100 last:border-b-0"
            onClick={() => handleSortClick(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  if (vertical) {
    return (
      <div className="relative w-full">
        <button
          ref={buttonRef}
          className="flex items-center gap-2 w-full"
          onClick={toggleDropdown}
        >
          <MdSort size={30} />
          <span>Sort</span>
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <button
      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded text-sm flex items-center gap-1"
      onClick={() => onSort(currentSort || options[0].value, currentDirection === 'asc' ? 'desc' : 'asc')}
    >
      <MdSort />
      Sort
    </button>
  );
};
