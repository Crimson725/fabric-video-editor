"use client";
import React from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { VideoResourcesPanel } from "./panels/VideoResourcesPanel";
import { AudioResourcesPanel } from "./panels/AudioResourcesPanel";
import { ImageResourcesPanel } from "./panels/ImageResourcesPanel";
import { TextResourcesPanel } from "./panels/TextResourcesPanel";
import { MdChevronRight, MdChevronLeft } from "react-icons/md";

interface ResourcesProps {
  isPanelExpanded: boolean;
  setIsPanelExpanded: (expanded: boolean) => void;
}

export const Resources = observer(({ isPanelExpanded, setIsPanelExpanded }: ResourcesProps) => {
  const store = React.useContext(StoreContext);

  const renderResourcePanel = () => {
    switch (store.selectedMenuOption) {
      case "Video":
        return <VideoResourcesPanel />;
      case "Audio":
        return <AudioResourcesPanel />;
      case "Image":
        return <ImageResourcesPanel />;
      case "Text":
        return <TextResourcesPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="relative h-full">
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-50 bg-slate-700 text-white rounded-full p-1 shadow-lg"
      >
        {isPanelExpanded ? <MdChevronLeft size={20} /> : <MdChevronRight size={20} />}
      </button>

      {/* Resources Panel */}
      <div 
        className={`absolute top-0 left-0 h-full transition-all duration-300 bg-white ${
          isPanelExpanded ? 'w-[300px]' : 'w-0'
        } overflow-hidden`}
      >
        {renderResourcePanel()}
      </div>
    </div>
  );
});
