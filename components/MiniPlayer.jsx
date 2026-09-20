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
  isFavorite,
  duration,
  currentTime,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSeek,
  onToggleFavorite,
  mode,
  setMode,
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!track) return null;

  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const value = Math.min(currentTime || 0, max);

  const cycleMode = () => {
    const nextMode =
      mode === "normal"
        ? "shuffle"
        : mode === "shuffle"
        ? "loop"
        : "normal";
    setMode?.(nextMode);
  };

  const hasThumb = Boolean(track.thumbnail && !imgError);

  const renderArtwork = (isLarge = false) => {
    if (track.kind === "video") {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black">
          <span className="text-xs text-zinc-400">Video</span>
        </div>
      );
    }
    if (hasThumb) {
      return (
        <img
          key={track.thumbnail}
          src={track.thumbnail}
          alt={track.title}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0b1020] text-[#7db6ff]">
        <span className={isLarge ? "text-5xl" : "text-xl"}>♫</span>
      </div>
    );
  };

  return (
    <section
      className={`fixed inset-x-0 bottom-16 z-50 overflow-hidden border-t border-white/15 bg-[#141418]/95 backdrop-blur-xl transition-all duration-300 ${
        expanded ? "h-[82vh]" : "h-[76px]"
      }`}
    >
      {/* Barra fissa inferiore */}
      <div className="flex h-[76px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setExpanded((state) => !state)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#0b1020]">
            {renderArtwork(false)}
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

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
            aria-label="Toggle favorite"
          >
            <Heart
              size={16}
              className={isFavorite ? "fill-white text-white" : ""}
            />
          </button>
        )}

        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black active:scale-95"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((state) => !state)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
          aria-label="Expand player"
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Vista espansa */}
      {expanded && (
        <div className="flex h-[calc(82vh-76px)] flex-col gap-5 overflow-y-auto px-5 pb-6 pt-4">
          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0f]">
            <div className="aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl bg-[#0b1020]">
              {renderArtwork(true)}
            </div>
          </div>

          <div>
            <h2 className="truncate text-xl font-bold">{track.title}</h2>
            <p className="truncate text-sm text-zinc-400">
              {track.artist}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={max || 100}
                step="0.1"
                value={value}
                disabled={!max}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-right text-xs text-zinc-400">
                {formatTime(max)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5">
            {setMode && (
              <button
                type="button"
                onClick={cycleMode}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-300 active:scale-95"
                title={`Mode: ${mode}`}
              >
                {mode === "shuffle" ? (
                  <Shuffle size={18} />
                ) : (
                  <Repeat size={18} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onPrevious}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white active:scale-95"
            >
              <SkipBack size={20} />
            </button>

            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-black active:scale-95 shadow-lg"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white active:scale-95"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
