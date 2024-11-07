import React from 'react';
import { MdGroup } from 'react-icons/md';

interface GroupButtonProps {
  onGroup: () => void;
  vertical?: boolean;
}

export const GroupButton = ({
  onGroup,
  vertical = false
}: GroupButtonProps) => {
  if (vertical) {
    return (
      <div className="relative w-full">
        <button
          className="flex items-center gap-2 w-full"
          onClick={onGroup}
        >
          <MdGroup size={18} />
          <span>Group</span>
        </button>
      </div>
    );
  }

  return (
    <button
      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded text-sm flex items-center gap-1"
      onClick={onGroup}
    >
      <MdGroup />
      Group
    </button>
  );
}; 