"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  SkipBack,
  SkipForward,
  Heart,
} from "lucide-react";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MiniPlayer({
  track,
  isPlaying,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onToggleFav,
  isFav,
  videoRef,
  audioRef,
  volume,
  setVolume,
  duration,
  currentTime,
  seekTo,
  mode,
  setMode,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [track?.id]);

  const title = useMemo(() => track?.title || "No track selected", [track]);
  const isVideo = track?.kind === "video";

  return (
    <div
      className={`fixed left-0 right-0 bottom-16 z-50 overflow-hidden border-t border-white/10 bg-[#111113]/96 backdrop-blur-xl transition-all duration-300 ease-out ${
        expanded ? "h-[86vh]" : "h-[92px]"
      } ${track ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      <div className="flex h-[92px] items-center gap-3 px-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#0b1020] ring-1 ring-white/10">
          {track?.thumb ? (
            <img src={track.thumb} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0b1020] text-[#7db6ff]">
              <span className="text-2xl">♫</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-label="Toggle player"
        >
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="truncate text-xs text-zinc-400">{track?.artist || ""}</div>
        </button>

        <button
          type="button"
          onClick={onToggleFav}
          className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-95 ${
            isFav ? "bg-white/10 text-white" : "bg-white/5 text-zinc-300"
          }`}
          aria-label="Favorite"
        >
          <Heart size={18} className={isFav ? "fill-white text-white" : ""} />
        </button>

        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-black transition active:scale-95"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-white transition active:scale-95"
          aria-label={expanded ? "Collapse player" : "Expand player"}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {expanded ? (
        <div className="flex h-[calc(86vh-92px)] flex-col gap-4 px-4 pb-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black">
            {isVideo ? (
              <video
                ref={videoRef}
                src={track?.src}
                className="h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#07111f]">
                <div className="text-center">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[28px] border border-[#244062] bg-[#0b1020] text-5xl text-[#7db6ff] shadow-[0_0_24px_rgba(125,182,255,0.2)]">
                    ♫
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.35em] text-[#7db6ff]">
                    Audio
                  </div>
                  <div className="mt-2 px-6 text-2xl font-semibold text-white">
                    {track?.title || "No track"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xl font-semibold">{track?.title || "No track selected"}</div>
            <div className="text-sm text-zinc-400">{track?.artist || ""}</div>
          </div>

          <div className="grid grid-cols-[48px_1fr_48px] items-center gap-3">
            <div className="text-xs text-zinc-400">{formatTime(currentTime)}</div>
            <input
              type="range"
              min="0"
              max={Number.isFinite(duration) ? duration : 0}
              value={Math.min(currentTime, Number.isFinite(duration) ? duration : 0)}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-right text-xs text-zinc-400">{formatTime(duration)}</div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 transition active:scale-95"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="grid h-14 w-14 place-items-center rounded-full bg-white text-black transition active:scale-95"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 transition active:scale-95"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
            <div className="mb-2 text-sm font-medium text-zinc-300">Volume</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
            <div className="mb-3 text-sm font-medium text-zinc-300">Play mode</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("normal")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === "normal" ? "bg-white text-black" : "bg-white/5 text-zinc-300"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setMode("shuffle")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === "shuffle" ? "bg-white text-black" : "bg-white/5 text-zinc-300"
                }`}
              >
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => setMode("loop")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === "loop" ? "bg-white text-black" : "bg-white/5 text-zinc-300"
                }`}
              >
                Loop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
