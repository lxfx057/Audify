"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Search, Trash2, Music2, LibraryBig, Upload, SlidersHorizontal } from "lucide-react";
import MiniPlayer from "./MiniPlayer";

const randomGradient = () => "radial-gradient(circle at top left, #0b1020, #050816 55%, #02040a 100%)";

function isVideoFile(file) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".m4v");
}

async function extractVideoThumbnail(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.src = url;
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";

    const cleanup = () => URL.revokeObjectURL(url);

    v.addEventListener("loadeddata", () => {
      const t = Math.min(0.5, Math.max(0, (v.duration || 1) / 10));
      v.currentTime = t;
    });

    v.addEventListener("seeked", () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 720;
        c.height = v.videoHeight || 720;
        const ctx = c.getContext("2d");
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.9);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    });

    v.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });
  });
}

export default function MusicApp() {
  const [songs, setSongs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [recent, setRecent] = useState([]);
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eq, setEq] = useState({ bass: 0, mid: 0, treble: 0 });
  const [queueMode, setQueueMode] = useState("upload");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const track = songs[current] || null;

  const ensureAudioGraph = () => {
    if (ctxRef.current || !audioRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audioRef.current);
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 110;
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1000;
    mid.Q.value = 0.8;
    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 9000;

    source.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(ctx.destination);

    ctxRef.current = ctx;
    nodesRef.current = { bass, mid, treble };
  };

  const applyEq = () => {
    if (!nodesRef.current) return;
    const g = eqEnabled ? 1 : 0;
    nodesRef.current.bass.gain.value = eq.bass * g;
    nodesRef.current.mid.gain.value = eq.mid * g;
    nodesRef.current.treble.gain.value = eq.treble * g;
  };

  const visible = useMemo(() => {
    let list = songs.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase()));
    if (queueMode === "alpha") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (queueMode === "random") list = [...list].sort(() => Math.random() - 0.5);
    return list;
  }, [songs, query, queueMode]);

  const setTrackById = (id) => {
    const idx = songs.findIndex((s) => s.id === id);
    if (idx >= 0) setCurrent(idx);
  };

  const syncMedia = () => {
    if (!track) return;
    if (track.kind === "audio" && audioRef.current) audioRef.current.src = track.src;
    if (track.kind === "video" && videoRef.current) videoRef.current.src = track.src;
  };

  const playCurrent = async () => {
    if (!track) return;
    syncMedia();
    try {
      if (track.kind === "video") {
        await videoRef.current.play();
      } else {
        ensureAudioGraph();
        applyEq();
        await audioRef.current.play();
      }
      setIsPlaying(true);
      setRecent((r) => [track.id, ...r.filter((x) => x !== track.id)].slice(0, 12));
    } catch {}
  };

  const pauseCurrent = () => {
    if (!track) return;
    if (track.kind === "video") videoRef.current.pause();
    else audioRef.current.pause();
    setIsPlaying(false);
  };

  const next = () => {
    if (!songs.length) return;
    setCurrent((c) => (c + 1) % songs.length);
    setIsPlaying(false);
  };

  const prev = () => {
    if (!songs.length) return;
    setCurrent((c) => (c - 1 + songs.length) % songs.length);
    setIsPlaying(false);
  };

  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const removeSong = (id) => {
    const idx = songs.findIndex((s) => s.id === id);
    const removed = songs.find((s) => s.id === id);
    const list = songs.filter((s) => s.id !== id);
    setSongs(list);
    if (removed) setDeleted((d) => [removed.id, ...d.filter((x) => x !== removed.id)]);
    setFavorites((f) => f.filter((x) => x !== id));
    setRecent((r) => r.filter((x) => x !== id));
    setCurrent(Math.max(0, Math.min(idx, list.length - 1)));
    setIsPlaying(false);
  };

  const importFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((file) => {
      const name = file.name.toLowerCase();
      const okMp3 = file.type === "audio/mpeg" || file.type === "audio/mp3" || name.endsWith(".mp3");
      const okMp4 = file.type === "video/mp4" || file.type === "video/x-m4v" || name.endsWith(".mp4") || name.endsWith(".m4v");
      return okMp3 || okMp4;
    });

    const added = [];
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const video = isVideoFile(file);
      const thumb = video ? await extractVideoThumbnail(file) : null;

      added.push({
        id: Date.now() + i,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: video ? "Video" : "Local",
        album: video ? "Imported video" : "Imported audio",
        src: URL.createObjectURL(file),
        kind: video ? "video" : "audio",
        thumb,
        gradient: video ? null : randomGradient(),
      });
    }

    if (added.length) {
      setSongs((s) => [...s, ...added]);
      setCurrent(0);
      setIsPlaying(false);
    }
  };

  const seekTo = (value) => {
    if (track?.kind === "video" && videoRef.current) videoRef.current.currentTime = value;
    if (track?.kind === "audio" && audioRef.current) audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  useEffect(() => {
    syncMedia();
  }, [track]);

  useEffect(() => {
    applyEq();
  }, [eq, eqEnabled]);

  useEffect(() => {
    const media = track?.kind === "video" ? videoRef.current : audioRef.current;
    if (!media) return;

    const update = () => setCurrentTime(media.currentTime || 0);
    const meta = () => setDuration(media.duration || 0);

    media.addEventListener("timeupdate", update);
    media.addEventListener("loadedmetadata", meta);
    media.addEventListener("durationchange", meta);

    return () => {
      media.removeEventListener("timeupdate", update);
      media.removeEventListener("loadedmetadata", meta);
      media.removeEventListener("durationchange", meta);
    };
  }, [track]);

  const recentItems = songs.filter((s) => recent.includes(s.id));
  const favItems = songs.filter((s) => favorites.includes(s.id));
  const deletedItems = songs.filter((s) => deleted.includes(s.id));

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-6 pb-28">
      <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-3xl bg-[#111113] p-4 shadow-[0_0_30px_rgba(255,45,85,0.22)]">
          <div className="flex items-center gap-3 mb-6">
            <Music2 className="text-pink-500" />
            <div>
              <div className="font-semibold">Music Spotlight</div>
              <div className="text-xs text-zinc-400">Mobile ready</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="rounded-2xl bg-[#16161a] px-4 py-3 flex items-center gap-3">
              <LibraryBig size={16} className="text-pink-500" /> Recenti
            </div>
            <div className="rounded-2xl bg-[#16161a] px-4 py-3 flex items-center gap-3">
              <Heart size={16} className="text-pink-500" /> Preferiti
            </div>
            <div className="rounded-2xl bg-[#16161a] px-4 py-3 flex items-center gap-3">
              <Trash2 size={16} className="text-pink-500" /> Eliminati
            </div>
          </div>

          <label className="mt-6 flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-800 px-4 py-3 text-sm active:scale-[0.99]">
            <Upload size={16} />
            Import file
            <input
              type="file"
              multiple
              className="hidden"
              accept="audio/mpeg,audio/mp3,.mp3,video/mp4,video/x-m4v,.mp4,.m4v,video/*"
              onChange={importFiles}
            />
          </label>
        </aside>

        <main className="rounded-3xl bg-[#111113] p-4 md:p-6 shadow-[0_0_30px_rgba(255,45,85,0.22)]">
          <div className="flex items-center gap-3 rounded-2xl bg-[#16161a] px-4 py-3 mb-5">
            <Search size={16} className="text-zinc-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, albums, artist"
              className="w-full bg-transparent outline-none"
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setQueueMode("upload")} className={`rounded-full px-4 py-2 text-sm ${queueMode === "upload" ? "bg-pink-500 text-black" : "bg-zinc-800"}`}>Custom</button>
            <button onClick={() => setQueueMode("alpha")} className={`rounded-full px-4 py-2 text-sm ${queueMode === "alpha" ? "bg-pink-500 text-black" : "bg-zinc-800"}`}>Alphabetical</button>
            <button onClick={() => setQueueMode("random")} className={`rounded-full px-4 py-2 text-sm ${queueMode === "random" ? "bg-pink-500 text-black" : "bg-zinc-800"}`}>Random</button>
          </div>

          <div className="space-y-3 max-h-[56vh] overflow-auto pr-1">
            {visible.map((s) => (
              <div
                key={s.id}
                className={`rounded-2xl border ${track?.id === s.id ? "border-pink-500 bg-zinc-900" : "border-zinc-800 bg-[#16161a]"} p-4 flex items-center gap-3`}
              >
                <button onClick={() => setTrackById(s.id)} className="flex-1 min-h-[52px] text-left">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-zinc-400">{s.artist}</div>
                </button>

                <button onClick={() => toggleFav(s.id)} className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800">
                  <Heart size={18} className={favorites.includes(s.id) ? "fill-pink-500 text-pink-500" : ""} />
                </button>

                <button onClick={() => removeSong(s.id)} className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-zinc-200">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#16161a] p-4">
              <div className="mb-2 text-sm text-zinc-400">Recenti</div>
              <div className="space-y-2 text-sm">
                {recentItems.slice(0, 5).map((s) => <div key={s.id}>{s.title}</div>)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#16161a] p-4">
              <div className="mb-2 text-sm text-zinc-400">Preferiti</div>
              <div className="space-y-2 text-sm">
                {favItems.slice(0, 5).map((s) => <div key={s.id}>{s.title}</div>)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#16161a] p-4">
              <div className="mb-2 text-sm text-zinc-400">Eliminati</div>
              <div className="space-y-2 text-sm">
                {deletedItems.slice(0, 5).map((s) => <div key={s.id}>{s.title}</div>)}
              </div>
            </div>
          </div>
        </main>

        <aside className="rounded-3xl bg-[#111113] p-4 shadow-[0_0_30px_rgba(255,45,85,0.22)] space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <SlidersHorizontal size={16} /> Status
          </div>

          <div className="rounded-2xl bg-[#16161a] p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>Songs</span><span>{songs.length}</span></div>
            <div className="flex justify-between"><span>Favorites</span><span>{favItems.length}</span></div>
            <div className="flex justify-between"><span>Deleted</span><span>{deletedItems.length}</span></div>
          </div>

          <div className="rounded-2xl bg-[#16161a] p-4 text-sm text-zinc-300">
            Playback, EQ and favorites are all handled from the expanded mini-player.
          </div>
        </aside>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => {
          setIsPlaying(false);
          next();
        }}
      />

      <MiniPlayer
        track={track}
        isPlaying={isPlaying}
        onPlay={playCurrent}
        onPause={pauseCurrent}
        onPrev={prev}
        onNext={next}
        onToggleFav={() => track && toggleFav(track.id)}
        isFav={track ? favorites.includes(track.id) : false}
        videoRef={videoRef}
        eqEnabled={eqEnabled}
        setEqEnabled={setEqEnabled}
        eq={eq}
        setEq={setEq}
        duration={duration}
        currentTime={currentTime}
        seekTo={seekTo}
      />
    </div>
  );
}
