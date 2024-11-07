"use client";

import { fabric } from "fabric";
import React, { useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { Resources } from "./Resources";
import { ElementsPanel } from "./panels/ElementsPanel";
import { Menu } from "./Menu";
import { TimeLine } from "./TimeLine";
import { Store } from "@/store/Store";
import "@/utils/fabric-utils";
import { TimelineSelector } from './TimelineSelector';

export const EditorWithStore = () => {
  const [store] = useState(new Store());
  return (
    <StoreContext.Provider value={store}>
      <Editor></Editor>
    </StoreContext.Provider>
  );
}

export const Editor = observer(() => {
  const store = React.useContext(StoreContext);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  useEffect(() => {
    const canvas = new fabric.Canvas("canvas", {
      height: 500,
      width: 800,
      backgroundColor: "#ededed",
    });
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = "#00a0f5";
    fabric.Object.prototype.cornerStyle = "circle";
    fabric.Object.prototype.cornerStrokeColor = "#0063d8";
    fabric.Object.prototype.cornerSize = 10;
    
    canvas.on("mouse:down", function (e) {
      if (!e.target) {
        store.setSelectedElement(null);
      }
    });

    store.setCanvas(canvas);
    fabric.util.requestAnimFrame(function render() {
      canvas.renderAll();
      fabric.util.requestAnimFrame(render);
    });
  }, [store]);

  return (
    <div className="h-[100svh] flex flex-col">
      {/* Top Bar */}
      <div className="h-[40px] bg-slate-900 flex items-center px-4">
        <h1 className="text-white text-sm font-semibold">Timelines</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <div className="w-[72px]">
          <Menu />
        </div>

        {/* Resources Panel */}
        <div 
          className={`transition-all duration-300 ${
            isPanelExpanded ? 'w-[300px]' : 'w-0'
          }`}
        >
          <Resources 
            isPanelExpanded={isPanelExpanded} 
            setIsPanelExpanded={setIsPanelExpanded} 
          />
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas */}
          <div className="h-[500px] bg-slate-100 flex justify-center items-center transition-all duration-300">
            <canvas id="canvas" className="h-[500px] w-[800px]" />
          </div>
          
          {/* Timeline Area */}
          <div className="flex-1 relative px-[10px] py-[4px] overflow-scroll">
            <TimeLine />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[250px] flex flex-col">
          <div className="h-[500px]">
            <ElementsPanel />
          </div>
          {/* <div className="flex-1">
            <TimelineSelector />
          </div> */}
        </div>
      </div>

      {/* Footer */}
      <div className="h-[20px] bg-black text-white text-[0.5em] text-right px-2">
        Crafted By Amit Digga
      </div>
    </div>
  );
});
