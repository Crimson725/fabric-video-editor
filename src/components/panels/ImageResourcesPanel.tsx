"use client";
import React, { useState, useRef } from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { ImageResource } from "../entity/ImageResource";
import { UploadButton } from "../shared/UploadButton";
import { SortButton } from "../shared/SortButton";
import { getFileMetadata } from "@/utils/file-utils";
import { MdExpandMore, MdExpandLess, MdMoreVert } from "react-icons/md";
import { Modal } from "../shared/Modal";

const SORT_OPTIONS = [
  { label: "File Name", value: "fileName" },
  { label: "File Size", value: "size" },
  { label: "Date Added", value: "dateAdded" },
];

export const ImageResourcesPanel = observer(() => {
  const store = React.useContext(StoreContext);
  const [sortBy, setSortBy] = React.useState("dateAdded");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  const handleSort = (value: string) => {
    setSortBy(value);
    const sorted = [...store.images].sort((a, b) => {
      switch (value) {
        case "fileName":
          return a.fileName.localeCompare(b.fileName);
        case "size":
          return (a.size || 0) - (b.size || 0);
        case "dateAdded":
          return (b.dateAdded || 0) - (a.dateAdded || 0);
        default:
          return 0;
      }
    });
    store.setSortedImages(sorted);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const metadata = await getFileMetadata(file);
      store.addImageResource(url, file.name, metadata);
    }
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
            <span>Images</span>
            {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <UploadButton
              accept="image/*"
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
                  vertical={true}
                />
              </div>
            </div>
          </Modal>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="transition-all duration-300">
          {store.images.map((image, index) => (
            <ImageResource 
              key={`${image.url}-${index}`} 
              image={image} 
              index={index} 
            />
          ))}
        </div>
      )}
    </div>
  );
});
