"use client";
import React from "react";
import { EditorElement } from "@/types";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import DragableView from "./DragableView";

export const TimeFrameView = observer((props: { element: EditorElement }) => {
  const store = React.useContext(StoreContext);
  const { element } = props;
  const disabled = element.type === "audio";
  const isSelected = store.selectedElement?.id === element.id;
  
  // Generate a consistent color based on the element's id
  const getElementColor = () => {
    if (element.name.includes('(split)')) {
      return 'bg-gray-800'; // Dark color for split parts
    }
    return 'bg-amber-800'; // Brown color for original parts
  };

  const bgColorOnSelected = isSelected ? "border-2 border-indigo-600" : "";
  const disabledCursor = disabled ? "cursor-no-drop" : "cursor-ew-resize";

  const [trimPreview, setTrimPreview] = React.useState<{
    start?: number;
    end?: number;
  }>({});

  const handleTrimPreview = (position: 'start' | 'end', value: number) => {
    setTrimPreview(prev => ({
      ...prev,
      [position]: value
    }));
  };

  const handleTrimCommit = (position: 'start' | 'end', value: number) => {
    store.updateEditorElementTimeFrame(element, {
      [position]: value,
    });
    setTrimPreview({});
  };

  return (
    <div
      onClick={() => store.setSelectedElement(element)}
      className={`h-full ${bgColorOnSelected}`}
    >
      <div className={`${getElementColor()} h-full w-full text-white text-xs 
        px-2 flex justify-between items-center`}>
        <span className="truncate">{element.name}</span>
        <span className="text-xs opacity-75 whitespace-nowrap">
          {((element.timeFrame.end - element.timeFrame.start) / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Trim handles */}
      <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500"
        onMouseDown={(e) => {
          // Add drag logic for left trim
        }}
      />
      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500"
        onMouseDown={(e) => {
          // Add drag logic for right trim
        }}
      />

      {(trimPreview.start !== undefined || trimPreview.end !== undefined) && (
        <div
          className="absolute top-0 bottom-0 bg-blue-500 opacity-30"
          style={{
            left: `${((trimPreview.start ?? element.timeFrame.start) / store.maxTime) * 100}%`,
            right: `${100 - ((trimPreview.end ?? element.timeFrame.end) / store.maxTime) * 100}%`
          }}
        />
      )}
    </div>
  );
});
