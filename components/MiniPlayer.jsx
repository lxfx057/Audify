"use client";

import { useState, useRef } from "react";
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
  const [dragDeltaY, setDragDeltaY] = useState(0);

  const dragStartYRef = useRef(null);
  const isDraggingRef = useRef(false);

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

  const handleTouchStart = (e) => {
    if (!expanded) return;
    dragStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartYRef.current;
    if (delta > 0) {
      setDragDeltaY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartYRef.current = null;

    if (dragDeltaY > 110) {
      setExpanded(false);
    }
    setDragDeltaY(0);
  };

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
        <span className={isLarge ? "text-6xl" : "text-xl"}>♫</span>
      </div>
    );
  };

  return (
    <section
      className={`fixed z-50 overflow-hidden bg-[#141418] transition-all ${
        expanded
          ? "inset-0 h-screen w-screen"
          : "inset-x-0 bottom-16 h-[76px] border-t border-white/15 backdrop-blur-xl duration-300"
      }`}
      style={
        expanded
          ? {
              transform: `translateY(${Math.max(0, dragDeltaY)}px)`,
              transition: isDraggingRef.current
                ? "none"
                : "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
            }
          : {}
      }
    >
      {/* Barra fissa inferiore (visibile solo se non espanso) */}
      {!expanded && (
        <div className="flex h-[76px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
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
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      )}

      {/* Vista espansa a schermo intero (100% viewport) con touch drag */}
      {expanded && (
        <div
          className="flex h-full w-full flex-col justify-between overflow-y-auto px-6 pb-8 pt-4 select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* iOS Grabber pill */}
          <div className="w-10 h-1.5 rounded-full bg-white/25 mx-auto mb-3 shrink-0" />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95"
            >
              <ChevronDown size={20} />
            </button>
            <span className="text-xs uppercase tracking-widest text-zinc-400">
              In riproduzione
            </span>
            <div className="w-10" />
          </div>

          <div className="my-auto flex flex-col items-center gap-6 py-4">
            <div className="aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl bg-[#0b1020] shadow-2xl">
              {renderArtwork(true)}
            </div>

            <div className="w-full text-center">
              <h2 className="truncate text-2xl font-bold text-white">
                {track.title}
              </h2>
              <p className="truncate text-base text-zinc-400">
                {track.artist}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
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
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(max)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6">
              {setMode && (
                <button
                  type="button"
                  onClick={cycleMode}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-300 active:scale-95"
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
                className="grid h-16 w-16 place-items-center rounded-full bg-white text-black active:scale-95 shadow-xl"
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

              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white active:scale-95"
                >
                  <Heart
                    size={18}
                    className={isFavorite ? "fill-white text-white" : ""}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
