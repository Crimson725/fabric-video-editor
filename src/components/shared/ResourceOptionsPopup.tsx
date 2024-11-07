import React from 'react';
import { MdSort, MdGroup, MdMoreVert } from 'react-icons/md';
import { SortButton } from './SortButton';
import { SortDirection } from '@/utils/sort-utils';

interface ResourceOptionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSort?: (value: string, direction: SortDirection) => void;
  onGroup?: () => void;
  sortOptions: { label: string; value: string; }[];
  currentSort?: string;
  currentDirection?: SortDirection;
  showGroupOption?: boolean;
}

export const ResourceOptionsPopup = ({
  isOpen,
  onClose,
  onSort,
  onGroup,
  sortOptions,
  currentSort,
  currentDirection,
  showGroupOption = false
}: ResourceOptionsPopupProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg z-50 min-w-[150px] py-1 border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      {onSort && (
        <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
          <SortButton
            options={sortOptions}
            onSort={onSort}
            currentSort={currentSort}
            currentDirection={currentDirection}
            vertical={true}
          />
        </div>
      )}
      
      {showGroupOption && onGroup && (
        <button
          onClick={onGroup}
          className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2 text-sm"
        >
          <MdGroup size={18} />
          <span>Group</span>
        </button>
      )}
    </div>
  );
}; 