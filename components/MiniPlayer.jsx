"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  SkipBack,
  SkipForward,
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
  videoRef,
  audioRef,
  volume,
  setVolume,
  duration,
  currentTime,
  seekTo,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [track?.id]);

  const canShow = !!track;

  const title = useMemo(() => {
    if (!track) return "No track selected";
    return track.title || "Untitled";
  }, [track]);

  return (
    <div
      className={`fixed left-3 right-3 bottom-20 z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#111113]/95 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-all duration-300 ${
        expanded ? "h-[78vh]" : "h-[76px]"
      } ${canShow ? "translate-y-0" : "pointer-events-none opacity-0 translate-y-4"}`}
    >
      <div className="flex h-[76px] items-center gap-3 px-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#0b1020] ring-1 ring-white/10">
          {track?.thumb ? (
            <img src={track.thumb} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0b1020] text-[#7db6ff]">
              <span className="text-xl">♫</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="truncate text-xs text-zinc-400">{track?.artist || ""}</div>
        </div>

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
        <div className="flex h-[calc(78vh-76px)] flex-col gap-4 px-4 pb-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black">
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
              <div className="flex h-full w-full items-center justify-center bg-[#07111f]">
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-[#244062] bg-[#0b1020] text-4xl text-[#7db6ff] shadow-[0_0_24px_rgba(125,182,255,0.2)]">
                    ♫
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.35em] text-[#7db6ff]">
                    Audio
                  </div>
                  <div className="mt-2 px-6 text-xl font-semibold text-white">
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
            <button type="button" onClick={onPrev} className="grid h-12 w-12 place-items-center rounded-full bg-white/5 transition active:scale-95">
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="grid h-14 w-14 place-items-center rounded-full bg-white text-black transition active:scale-95"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button type="button" onClick={onNext} className="grid h-12 w-12 place-items-center rounded-full bg-white/5 transition active:scale-95">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
            <div className="mb-3 text-sm font-medium text-zinc-300">Volume</div>
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
        </div>
      ) : null}
    </div>
  );
}
