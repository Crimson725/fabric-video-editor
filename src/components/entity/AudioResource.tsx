"use client";
import React from "react";
import { StoreContext } from "@/store";
import { formatTimeToMinSec } from "@/utils";
import { observer } from "mobx-react";
import { MdAdd } from "react-icons/md";

export type AudioResourceProps = {
  audio: { url: string; fileName: string };
  index: number;
};

export const AudioResource = observer(
  ({ audio, index }: AudioResourceProps) => {
    const store = React.useContext(StoreContext);
    const ref = React.useRef<HTMLAudioElement>(null);
    const [formatedAudioLength, setFormatedAudioLength] =
      React.useState("00:00");

    return (
      <div className="rounded-lg overflow-hidden items-center bg-slate-800 m-[15px] flex flex-col relative min-h-[100px]">
        <div className="bg-[rgba(0,0,0,.25)] text-white py-1 absolute text-base top-2 right-2">
          {formatedAudioLength}
        </div>
        <div className="bg-[rgba(0,0,0,.25)] text-white py-1 absolute text-sm top-2 left-2 truncate max-w-[120px]">
          {audio.fileName}
        </div>
        <button
          className="hover:bg-[#00a0f5] bg-[rgba(0,0,0,.25)] rounded z-10 text-white font-bold py-1 absolute text-lg bottom-2 right-2"
          onClick={() => store.addAudio(index)}
        >
          <MdAdd size="25" />
        </button>
        <audio
          onLoadedData={() => {
            const audioLength = ref.current?.duration ?? 0;
            setFormatedAudioLength(formatTimeToMinSec(audioLength));
          }}
          ref={ref}
          className="max-h-[100px] max-w-[150px] min-h-[50px] min-w-[100px]"
          src={audio.url}
          id={`audio-${index}`}
        />
      </div>
    );
  }
);
