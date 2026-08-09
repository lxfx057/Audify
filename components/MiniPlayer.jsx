"use client";

import { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronDown, SkipBack, SkipForward } from "lucide-react";

export default function MiniPlayer({
  track,
  isPlaying,
  onPlay,
  onPause,
  onPrev,
  onNext,
  videoRef,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [track?.id]);

  return (
    <div
      className={`fixed left-3 right-3 bottom-3 z-50 overflow-hidden rounded-3xl bg-panel shadow-glow transition-all duration-300 ${
        expanded ? "h-[74vh]" : "h-18"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-zinc-800 shrink-0">
          {track?.thumb ? (
            <img src={track.thumb} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: track?.gradient || "linear-gradient(135deg,#111,#333)" }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{track?.title || "Nessun brano"}</div>
          <div className="truncate text-xs text-zinc-400">{track?.artist || ""}</div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onPrev(); }} className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800">
            <SkipBack size={18} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); isPlaying ? onPause() : onPlay(); }}
            className="grid h-12 w-12 place-items-center rounded-full bg-pink-500 text-black"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button type="button" onClick={(e) => { e.stopPropagation(); onNext(); }} className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800">
            <SkipForward size={18} />
          </button>

          <span className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-zinc-200">
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="flex h-[calc(74vh-72px)] flex-col gap-4 px-4 pb-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl bg-black">
            {track?.kind === "video" ? (
              <video
                ref={videoRef}
                src={track.src}
                className="h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="h-full w-full" style={{ background: track?.gradient }} />
            )}
          </div>

          <div>
            <div className="text-xl font-semibold">{track?.title || "Nessun brano"}</div>
            <div className="text-sm text-zinc-400">{track?.artist || ""}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
