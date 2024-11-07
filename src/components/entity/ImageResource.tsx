"use client";
import React from "react";
import { StoreContext } from "@/store";
import { observer } from "mobx-react";
import { MdAdd } from "react-icons/md";
import Image from "next/image";

type ImageResourceProps = {
  image: { url: string; fileName: string };
  index: number;
};

export const ImageResource = observer(({ image, index }: ImageResourceProps) => {
  const store = React.useContext(StoreContext);

  return (
    <div className="rounded-lg overflow-hidden items-center bg-slate-800 m-[15px] flex flex-col relative">
      <div className="bg-[rgba(0,0,0,.25)] text-white py-1 absolute text-sm top-2 left-2 truncate max-w-[120px]">
        {image.fileName}
      </div>
      <button
        className="hover:bg-[#00a0f5] bg-[rgba(0,0,0,.25)] rounded z-10 text-white font-bold py-1 absolute text-lg bottom-2 right-2"
        onClick={() => store.addImage(index)}
      >
        <MdAdd size="25" />
      </button>
      <Image
        className="max-h-[100px] max-w-[150px] object-contain"
        src={image.url}
        height={200}
        width={200}
        id={`image-${index}`}
        alt={image.fileName}
      />
    </div>
  );
});
