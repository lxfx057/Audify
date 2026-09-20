"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
} from "lucide-react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function MiniPlayer({
  track,
  isPlaying,
  isFav,
  duration,
  currentTime,
  onPlay,
  onPause,
  onPrev,
  onNext,
  seekTo,
  onToggleFav,
  videoRef,
  volume,
  setVolume,
  mode,
  setMode,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!track) return null;

  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const value = Math.min(currentTime || 0, max);

  const cycleMode = () => {
    const nextMode = mode === "normal" ? "shuffle" : mode === "shuffle" ? "loop" : "normal";
    setMode(nextMode);
  };

  return (
    <section
      className={`fixed inset-x-0 bottom-16 z-50 overflow-hidden border-t border-white/10 bg-[#111113]/95 backdrop-blur-xl transition-all duration-300 ${
        expanded ? "h-[82vh]" : "h-[88px]"
      }`}
    >
      {/* Barra fissa inferiore (Mini bar) */}
      <div className="flex h-[88px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setExpanded((state) => !state)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="Toggle player size"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0b1020] text-2xl text-[#7db6ff] ring-1 ring-white/10">
            {track.thumb ? (
              <img
                src={track.thumb}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "♫"
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {track.title}
            </p>
            <p className="truncate text-xs text-zinc-400">
              {track.artist}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onToggleFav}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
          aria-label="Toggle favorite"
        >
          <Heart
            size={18}
            className={isFav ? "fill-white text-white" : ""}
          />
        </button>

        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-black active:scale-95"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((state) => !state)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
          aria-label="Expand player"
        >
          {expanded ? <ChevronDown size={19} /> : <ChevronUp size={19} />}
        </button>
      </div>

      {/* Vista Espansa */}
      {expanded && (
        <div className="flex h-[calc(82vh-88px)] flex-col gap-5 overflow-y-auto px-4 pb-5">
          <div className="flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[#07111f] relative">
            {track.kind === "video" ? (
              <video
                ref={videoRef}
                src={track.src}
                className="h-full w-full object-contain"
                controls={false}
              />
            ) : track.thumb ? (
              <img
                src={track.thumb}
                alt={track.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[28px] border border-[#244062] bg-[#0b1020] text-5xl text-[#7db6ff]">
                  ♫
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.32em] text-[#7db6ff]">
                  Audio
                </p>
              </div>
            )}
          </div>

          <div>
            <h2 className="truncate text-2xl font-bold">{track.title}</h2>
            <p className="truncate text-sm text-zinc-400">{track.artist}</p>
          </div>

          <div className="grid grid-cols-[46px_1fr_46px] items-center gap-3">
            <span className="text-xs text-zinc-400">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={max}
              step="0.1"
              value={value}
              disabled={!max}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="w-full accent-white"
              aria-label="Seek track"
            />

            <span className="text-right text-xs text-zinc-400">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={cycleMode}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-300 active:scale-95"
              aria-label="Cycle play mode"
            >
              {mode === "shuffle" ? <Shuffle size={18} /> : <Repeat size={18} />}
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 active:scale-95"
              aria-label="Previous track"
            >
              <SkipBack size={20} />
            </button>

            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-black active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 active:scale-95"
              aria-label="Next track"
            >
              <SkipForward size={20} />
            </button>

            <div className="flex items-center gap-2 pl-2">
              <Volume2 size={16} className="text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 accent-white"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
