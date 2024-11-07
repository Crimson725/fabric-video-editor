"use client";
import React, { useState, useRef } from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { VideoResource } from "../entity/VideoResource";
import { UploadButton } from "../shared/UploadButton";
import { SortButton } from "../shared/SortButton";
import { GroupButton } from "../shared/GroupButton";
import { Modal } from "../shared/Modal";
import { getFileMetadata } from "@/utils/file-utils";
import { SortDirection } from "@/utils/sort-utils";
import { sortResources } from "@/utils/sort-utils";
import { MdExpandMore, MdExpandLess, MdMoreVert } from "react-icons/md";

const SORT_OPTIONS = [
  { label: "File Name", value: "fileName" },
  { label: "Duration", value: "duration" },
  { label: "File Size", value: "size" },
  { label: "Date Added", value: "dateAdded" },
];

export const VideoResourcesPanel = observer(() => {
  const store = React.useContext(StoreContext);
  const [sortBy, setSortBy] = React.useState("dateAdded");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [showModal, setShowModal] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSort = (value: string, direction: SortDirection) => {
    setSortBy(value);
    setSortDirection(direction);
    const sorted = sortResources(store.videos, value, direction);
    store.setSortedVideos(sorted);
    setShowModal(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const metadata = await getFileMetadata(file);
      store.addVideoResource(url, file.name, metadata);
    }
    setShowModal(false);
  };

  return (
    <div className="bg-slate-50">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-[16px] py-[12px] bg-slate-100">
          <div 
            className="text-sm font-semibold flex items-center gap-2 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>Videos</span>
            {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <UploadButton
              accept="video/mp4,video/x-m4v,video/*"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-3 rounded text-sm"
              onChange={handleFileChange}
            />
            <button
              ref={optionsButtonRef}
              onClick={() => setShowModal(true)}
              className="p-2 hover:bg-slate-200 rounded flex items-center gap-1 text-sm"
            >
              <MdMoreVert size={18} />
              Options
            </button>
          </div>

          {/* Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            triggerRef={optionsButtonRef}
          >
            <div className="py-2">
              <div className="px-4 py-2 hover:bg-slate-100">
                <SortButton
                  options={SORT_OPTIONS}
                  onSort={handleSort}
                  currentSort={sortBy}
                  currentDirection={sortDirection}
                  vertical={true}
                />
              </div>
              <div className="px-4 py-2 hover:bg-slate-100">
                <GroupButton
                  onGroup={() => {
                    store.groupVideos();
                    setShowModal(false);
                  }}
                  vertical={true}
                />
              </div>
            </div>
          </Modal>
        </div>
      </div>
      
      {/* Content */}
        <div className="transition-all duration-300">
          {store.videoGroups.length > 0 ? (
            store.videoGroups.map((group) => (
              <div key={group.id} className="mb-4">
                <div className="text-sm font-medium px-[16px] py-2 bg-slate-700 text-white">
                  {group.name}
                </div>
                {group.videos.map((video, index) => (
                  <VideoResource 
                    key={`${video}-${index}`} 
                    video={store.videos.find(v => v.fileName === video) || { url: '', fileName: video }} 
                    index={index} 
                  />
                ))}
              </div>
            ))
          ) : (
            store.videos.map((video, index) => (
              <VideoResource 
                key={`${video.url}-${index}`} 
                video={video} 
                index={index} 
              />
            ))
          )}
        </div>
    </div>
  );
});
