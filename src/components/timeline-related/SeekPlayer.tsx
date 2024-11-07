"use client";
import React from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { MdPlayArrow, MdPause, MdContentCut, MdUndo } from 'react-icons/md';

export const SeekPlayer = observer(() => {
  const store = React.useContext(StoreContext);
  const selectedElement = store.selectedElement;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    // Format: MM:SS.mm
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800">
      <button
        className="p-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
        onClick={() => {
          store.setPlaying(!store.playing);
        }}
      >
        {store.playing ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
      </button>

      {selectedElement && selectedElement.type === "video" && (
        <div className="flex gap-1">
          <button
            className="p-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => store.splitElementAtTime(selectedElement.id, store.currentTimeInMs)}
            title="Split at playhead"
          >
            <MdContentCut size={20} />
          </button>
          <button
            className="p-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => store.uncutElement(selectedElement.id)}
            title="Reset trim"
          >
            <MdUndo size={20} />
          </button>
        </div>
      )}

      <div className="text-white ml-2 font-mono">
        {formatTime(store.currentTimeInMs)} / {formatTime(store.maxTime)}
      </div>
    </div>
  );
});
