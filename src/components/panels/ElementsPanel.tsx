"use client";
import React from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { Element } from "../entity/Element";
import { EditorElement } from "@/types";

export const ElementsPanel = observer((_props: {}) => {
  const store = React.useContext(StoreContext);
  
  // Group elements by their original video
  const groupedElements: { [key: string]: EditorElement[] } = {};
  store.editorElements.forEach(element => {
    const baseName = element.name.split(' (split)')[0]; // Get base name without split suffix
    if (!groupedElements[baseName]) {
      groupedElements[baseName] = [];
    }
    groupedElements[baseName].push(element);
  });

  return (
    <div className="bg-slate-200 h-full overflow-scroll">
      <div className="flex flex-row justify-between">
        <div className="text-sm px-[16px] py-[7px] font-semibold">Elements</div>
      </div>
      <div className="flex flex-col">
        {Object.entries(groupedElements).map(([baseName, elements]) => (
          <div key={baseName} className="flex flex-col">
            {elements
              .sort((a, b) => a.timeFrame.start - b.timeFrame.start)
              .map((element) => (
                <Element key={element.id} element={element} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
});
