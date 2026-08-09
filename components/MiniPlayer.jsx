"use client";

import { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronDown } from "lucide-react";

export default function MiniPlayer({ track, isPlaying, onPlay, onPause, onPrev, onNext, videoRef }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [track?.id]);

  return (
    <div
      className={`fixed left-4 right-4 bottom-4 z-50 transition-all duration-300 ${
        expanded ? "h-[72vh] rounded-3xl" : "h-16 rounded-2xl"
      } bg-panel p-3 shadow-glow`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-zinc-800">
            {track?.thumb ? (
              <img src={track.thumb} alt="thumb" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className={`${expanded ? "hidden" : "min-w-0"}`}>
            <div className="truncate font-medium">{track?.title || "Nessun brano"}</div>
            <div className="truncate text-xs text-zinc-400">{track?.artist || ""}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={onPrev} className="p-2 text-zinc-300">
              <ChevronDown />
            </button>

            <button onClick={isPlaying ? onPause : onPlay} className="rounded-full bg-pink-500 p-3 text-black">
              {isPlaying ? <Pause /> : <Play />}
            </button>

            <button onClick={onNext} className="p-2 text-zinc-300">
              <ChevronUp />
            </button>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 p-2 text-zinc-300"
            >
              {expanded ? <ChevronDown /> : <ChevronUp />}
            </button>
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 flex-1 space-y-4">
            <div className="flex h-[55%] items-center justify-center overflow-hidden rounded-2xl bg-black">
              {track?.kind === "video" ? (
                <video
                  ref={videoRef}
                  src={track.src}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                />
              ) : (
                <div className="h-full w-full" style={{ background: track?.gradient || "#111" }} />
              )}
            </div>

            <div>
              <div className="text-lg font-semibold">{track?.title}</div>
              <div className="text-sm text-zinc-400">{track?.artist}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
