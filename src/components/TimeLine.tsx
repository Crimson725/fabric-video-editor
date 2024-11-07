"use client";
import React from "react";
import { SeekPlayer } from "./timeline-related/SeekPlayer";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { TimeFrameView } from "./timeline-related/TimeFrameView";
import { ScaleRangeInput } from "./timeline-related/ScaleRangeInput";
import { EditorElement } from "@/types";

export const TimeLine = observer(() => {
  const store = React.useContext(StoreContext);
  const percentOfCurrentTime = (store.currentTimeInMs / store.maxTime) * 100;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * store.maxTime;
    store.handleSeek(newTime);
  };

  // Group elements by their original video
  const tracks = new Map<string, EditorElement[]>();
  store.editorElements.forEach(element => {
    const baseName = element.name.split(' (split)')[0];
    if (!tracks.has(baseName)) {
      tracks.set(baseName, []);
    }
    tracks.get(baseName)?.push(element);
  });

  return (
    <div className="flex flex-col bg-slate-900 p-2">
      <SeekPlayer />
      
      {/* Timeline with cursor */}
      <div className="relative mt-4" style={{ height: '40px' }}>
        <ScaleRangeInput
          max={store.maxTime}
          value={store.currentTimeInMs}
          height={20}
          backgroundColor="#1e293b"
          markings={[
            { interval: 1000, color: "#475569", size: 10, width: 1 },
            { interval: 5000, color: "#64748b", size: 15, width: 2 },
          ]}
          onChange={(value) => store.handleSeek(value)}
        />
        
        {/* Cursor line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none"
          style={{
            left: `${percentOfCurrentTime}%`,
            transition: store.playing ? 'left 0.1s linear' : 'none'
          }}
        />
      </div>

      {/* Video tracks */}
      <div className="flex-1 relative mt-2" onClick={handleTimelineClick}>
        {Array.from(tracks.entries()).map(([baseName, elements]) => {
          const sortedElements = elements.sort((a, b) => a.timeFrame.start - b.timeFrame.start);
          
          return (
            <div key={baseName} className="relative h-[29px] mb-1">
              <div className="absolute inset-0 flex">
                {sortedElements.map((element) => (
                  <div 
                    key={element.id}
                    className="h-full"
                    style={{
                      width: `${((element.timeFrame.end - element.timeFrame.start) / store.maxTime) * 100}%`,
                    }}
                  >
                    <TimeFrameView element={element} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
