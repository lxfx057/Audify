"use client";

import { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronDown, Heart } from "lucide-react";

export default function MiniPlayer({
  track,
  isPlaying,
  onPlay,
  onPause,
  onToggleFav,
  isFav,
  videoRef,
  audioRef,
  eqEnabled,
  setEqEnabled,
  eq,
  setEq,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [track?.id]);

  const isVideo = track?.kind === "video";

  return (
    <div
      className={`fixed left-3 right-3 bottom-3 z-50 overflow-hidden rounded-3xl bg-panel shadow-glow transition-all duration-300 ${
        expanded ? "h-[76vh]" : "h-18"
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

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleFav}
            className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800"
          >
            <Heart size={18} className={isFav ? "fill-pink-500 text-pink-500" : ""} />
          </button>

          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            className="grid h-12 w-12 place-items-center rounded-full bg-pink-500 text-black"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <span className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-zinc-200">
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="flex h-[calc(76vh-72px)] flex-col gap-4 px-4 pb-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl bg-black">
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
              <div className="flex h-full w-full items-center justify-center" style={{ background: track?.gradient }}>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.35em] text-white/70">MP3</div>
                  <div className="mt-3 text-2xl font-semibold">{track?.title}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xl font-semibold">{track?.title || "Nessun brano"}</div>
            <div className="text-sm text-zinc-400">{track?.artist || ""}</div>
          </div>

          <div className="rounded-2xl bg-panel2 p-4">
            <div className="mb-3 text-sm font-medium text-zinc-300">EQ</div>
            <button
              type="button"
              onClick={() => setEqEnabled((v) => !v)}
              className="mb-4 rounded-full bg-zinc-800 px-4 py-2 text-sm"
            >
              {eqEnabled ? "Disattiva EQ" : "Attiva EQ"}
            </button>

            <div className={`space-y-3 ${eqEnabled ? "" : "opacity-40 pointer-events-none"}`}>
              <div>
                <div className="mb-1 text-xs text-zinc-400">Bassi</div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eq.bass}
                  onChange={(e) => setEq((s) => ({ ...s, bass: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-zinc-400">Medi</div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eq.mid}
                  onChange={(e) => setEq((s) => ({ ...s, mid: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-zinc-400">Alti</div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={eq.treble}
                  onChange={(e) => setEq((s) => ({ ...s, treble: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
