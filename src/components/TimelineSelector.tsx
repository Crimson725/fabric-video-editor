import React from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from '@/store';
import { MdAdd, MdDelete } from 'react-icons/md';

export const TimelineSelector = observer(() => {
  const store = React.useContext(StoreContext);

  return (
    <div className="h-full flex flex-col bg-slate-800 p-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white text-sm font-semibold">Timeline Tracks</h3>
        <button
          onClick={() => store.createTimeline(`Timeline ${store.timelines.length + 1}`)}
          className="p-1 rounded bg-blue-500 hover:bg-blue-600"
        >
          <MdAdd className="text-white" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {store.timelines.map(timeline => (
          <div 
            key={timeline.id}
            className={`flex justify-between items-center p-2 rounded cursor-pointer mb-1 ${
              timeline.id === store.activeTimelineId ? 'bg-blue-500' : 'bg-slate-700'
            }`}
            onClick={() => store.setActiveTimeline(timeline.id)}
          >
            <span className="text-white text-sm truncate">{timeline.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Add delete timeline logic
              }}
              className="p-1 rounded hover:bg-red-500"
            >
              <MdDelete className="text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}); 