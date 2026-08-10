"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Folder,
  Settings,
  Trash2,
  Search,
  Upload,
  Music2,
  Heart,
} from "lucide-react";
import MiniPlayer from "./MiniPlayer";

const DB_NAME = "music-spotlight-db";
const DB_VERSION = 1;
const STORE = "tracks";

const EQ_BANDS = [
  { label: "60", freq: 60 },
  { label: "170", freq: 170 },
  { label: "310", freq: 310 },
  { label: "600", freq: 600 },
  { label: "1K", freq: 1000 },
  { label: "3K", freq: 3000 },
  { label: "6K", freq: 6000 },
];

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

    const cleanup = () => URL.revokeObjectURL(url);

    v.addEventListener("loadeddata", () => {
      v.currentTime = Math.min(0.5, Math.max(0, (v.duration || 1) / 10));
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

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export default function MusicApp() {
  const [loaded, setLoaded] = useState(false);
  const [songs, setSongs] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [current, setCurrent] = useState(0);
  const [section, setSection] = useState("home");
  const [query, setQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [mode, setMode] = useState("normal");
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eq, setEq] = useState(Array(7).fill(0));

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const track = songs[current] || null;

  useEffect(() => {
    (async () => {
      try {
        const stored = await dbGetAll();
        const active = stored.filter((x) => !x.deleted);
        const trash = stored.filter((x) => x.deleted);
        setSongs(active);
        setDeleted(trash);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!track) return;
    const media = track.kind === "video" ? videoRef.current : audioRef.current;
    if (media) media.src = track.src;
  }, [track]);

  const ensureAudioGraph = () => {
    if (ctxRef.current || !audioRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audioRef.current);

    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000];
    const filters = frequencies.map((freq, index) => {
      const f = ctx.createBiquadFilter();
      if (index === 0) f.type = "lowshelf";
      else if (index === frequencies.length - 1) f.type = "highshelf";
      else f.type = "peaking";
      f.frequency.value = freq;
      if (f.type === "peaking") f.Q.value = 1.1;
      return f;
    });

    source.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
    filters[filters.length - 1].connect(ctx.destination);

    ctxRef.current = ctx;
    nodesRef.current = filters;
  };

  const applyEq = () => {
    if (!nodesRef.current) return;
    nodesRef.current.forEach((node, i) => {
      node.gain.value = eqEnabled ? eq[i] : 0;
    });
  };

  useEffect(() => {
    applyEq();
  }, [eq, eqEnabled]);

  useEffect(() => {
    const media = track?.kind === "video" ? videoRef.current : audioRef.current;
    if (!media) return;

    const update = () => {
      setCurrentTime(media.currentTime || 0);
      setDuration(media.duration || 0);
    };

    media.addEventListener("timeupdate", update);
    media.addEventListener("loadedmetadata", update);
    media.addEventListener("durationchange", update);

    return () => {
      media.removeEventListener("timeupdate", update);
      media.removeEventListener("loadedmetadata", update);
      media.removeEventListener("durationchange", update);
    };
  }, [track]);

  const visible = useMemo(() => {
    return songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase()));
  }, [songs, query]);

  const orderedSongs = useMemo(() => {
    if (mode === "shuffle") return [...songs].sort(() => Math.random() - 0.5);
    return songs;
  }, [songs, mode]);

  const seekTo = (value) => {
    const media = track?.kind === "video" ? videoRef.current : audioRef.current;
    if (!media) return;
    media.currentTime = value;
    setCurrentTime(value);
  };

  const safePlay = async (media) => {
    if (!media) return false;
    try {
      const p = media.play();
      if (p && typeof p.then === "function") await p;
      return true;
    } catch {
      return false;
    }
  };

  const playCurrent = async () => {
    if (!track) return;
    try {
      if (track.kind === "video") {
        const ok = await safePlay(videoRef.current);
        setIsPlaying(ok);
      } else {
        ensureAudioGraph();
        applyEq();
        const ok = await safePlay(audioRef.current);
        setIsPlaying(ok);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const pauseCurrent = () => {
    if (!track) return;
    if (track.kind === "video") videoRef.current?.pause();
    else audioRef.current?.pause();
    setIsPlaying(false);
  };

  const playTrack = async (song) => {
    const idx = songs.findIndex((x) => x.id === song.id);
    if (idx < 0) return;
    setCurrent(idx);
    requestAnimationFrame(() => {
      const media = song.kind === "video" ? videoRef.current : audioRef.current;
      if (song.kind === "audio") ensureAudioGraph();
      if (media) {
        safePlay(media).then((ok) => setIsPlaying(ok));
      }
    });
  };

  const next = () => {
    if (!songs.length) return;

    if (mode === "loop" && track) {
      const media = track.kind === "video" ? videoRef.current : audioRef.current;
      if (media) {
        media.currentTime = 0;
        safePlay(media).then((ok) => setIsPlaying(ok));
      }
      return;
    }

    if (mode === "shuffle") {
      const others = songs.filter((s) => s.id !== track?.id);
      if (!others.length) return;
      const pick = others[Math.floor(Math.random() * others.length)];
      playTrack(pick);
      return;
    }

    const idx = track ? songs.findIndex((s) => s.id === track.id) : 0;
    const nextIndex = (idx + 1) % songs.length;
    playTrack(songs[nextIndex]);
  };

  const prev = () => {
    if (!songs.length) return;
    const idx = track ? songs.findIndex((s) => s.id === track.id) : 0;
    const prevIndex = (idx - 1 + songs.length) % songs.length;
    playTrack(songs[prevIndex]);
  };

  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const addFiles = async (files) => {
    const valid = Array.from(files || []).filter((file) => {
      const name = file.name.toLowerCase();
      const okMp3 = file.type.startsWith("audio/") || name.endsWith(".mp3");
      const okMp4 = file.type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".m4v");
      return okMp3 || okMp4;
    });

    const created = [];
    for (const file of valid) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const kind = isVideoFile(file) ? "video" : "audio";
      const thumb = kind === "video" ? await extractVideoThumbnail(file) : null;
      const item = {
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: kind === "video" ? "Video" : "Local file",
        kind,
        src: URL.createObjectURL(file),
        thumb,
        deleted: false,
        createdAt: Date.now(),
      };
      await dbPut(item);
      created.push(item);
    }

    if (created.length) {
      setSongs((prev) => [...created, ...prev]);
      setCurrent(0);
      setSection("home");
      requestAnimationFrame(() => playTrack(created[0]));
    }
  };

  const importFiles = async (e) => {
    await addFiles(e.target.files);
    e.target.value = "";
  };

  const removeSong = async (id) => {
    const item = songs.find((s) => s.id === id);
    if (!item) return;
    const updated = { ...item, deleted: true };
    await dbPut(updated);
    setSongs((prev) => prev.filter((x) => x.id !== id));
    setDeleted((prev) => [updated, ...prev]);
    if (track?.id === id) setIsPlaying(false);
  };

  const restoreSong = async (id) => {
    const item = deleted.find((s) => s.id === id);
    if (!item) return;
    const updated = { ...item, deleted: false };
    await dbPut(updated);
    setDeleted((prev) => prev.filter((x) => x.id !== id));
    setSongs((prev) => [updated, ...prev]);
  };

  const activeCount = songs.length;
  const trashCount = deleted.length;

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-44">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="rounded-[28px] border border-white/10 bg-[#111113] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
          {section === "home" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Music2 />
                </div>
                <div>
                  <div className="text-lg font-semibold">Home</div>
                  <div className="text-sm text-zinc-400">Import and browse your folders</div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition active:scale-[0.99]">
                <Upload size={16} />
                Import files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="audio/*,video/*,.mp3,.mp4,.m4v"
                  onChange={importFiles}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["All tracks", activeCount],
                  ["Deleted", trashCount],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                    <div className="text-sm text-zinc-400">{label}</div>
                    <div className="mt-2 text-2xl font-semibold">{count}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Search size={15} /> Search
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search imported files"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                />
              </div>

              <div className="space-y-3 max-h-[52vh] overflow-auto pr-1">
                {(query ? visible : orderedSongs).map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161a] px-4 py-3 transition hover:bg-white/[0.04] ${
                      track?.id === s.id ? "ring-1 ring-white/15" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => playTrack(s)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#0b1020]">
                        {s.kind === "video" && s.thumb ? (
                          <img src={s.thumb} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#7db6ff]">♫</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.title}</div>
                        <div className="truncate text-sm text-zinc-400">{s.artist}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFav(s.id)}
                      className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-95 ${
                        favorites.includes(s.id) ? "bg-white/10 text-white" : "bg-white/5 text-zinc-300"
                      }`}
                    >
                      <Heart size={16} className={favorites.includes(s.id) ? "fill-white text-white" : ""} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {section === "files" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Folder />
                </div>
                <div>
                  <div className="text-lg font-semibold">Files</div>
                  <div className="text-sm text-zinc-400">Manage uploaded files</div>
                </div>
              </div>

              <div className="space-y-3">
                {songs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161a] px-4 py-3"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#0b1020]">
                      {s.kind === "video" && s.thumb ? (
                        <img src={s.thumb} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#7db6ff]">♫</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="truncate text-sm text-zinc-400">Active file</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSong(s.id)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/5 transition active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {section === "settings" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Settings />
                </div>
                <div>
                  <div className="text-lg font-semibold">Settings</div>
                  <div className="text-sm text-zinc-400">Equalizer and playback</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 text-sm font-medium">Equalizer</div>
                <button
                  type="button"
                  onClick={() => setEqEnabled((v) => !v)}
                  className="mb-4 rounded-full bg-white/5 px-4 py-2 text-sm transition active:scale-[0.99]"
                >
                  {eqEnabled ? "Disable EQ" : "Enable EQ"}
                </button>

                <div className={`space-y-4 ${eqEnabled ? "" : "pointer-events-none opacity-40"}`}>
                  {EQ_BANDS.map((band, i) => (
                    <div key={band.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                        <span>{band.label} Hz</span>
                        <span>{eq[i] > 0 ? `+${eq[i]}` : eq[i]}</span>
                      </div>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={eq[i]}
                        onChange={(e) => {
                          const next = [...eq];
                          next[i] = Number(e.target.value);
                          setEq(next);
                        }}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0f]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setSection("home")}
            className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs transition ${
              section === "home" ? "bg-white/10 text-white" : "text-zinc-400"
            }`}
          >
            <Home size={18} />
            Home
          </button>
          <button
            type="button"
            onClick={() => setSection("files")}
            className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs transition ${
              section === "files" ? "bg-white/10 text-white" : "text-zinc-400"
            }`}
          >
            <Folder size={18} />
            Files
          </button>
          <button
            type="button"
            onClick={() => setSection("settings")}
            className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs transition ${
              section === "settings" ? "bg-white/10 text-white" : "text-zinc-400"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </nav>

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
        audioRef={audioRef}
        volume={volume}
        setVolume={setVolume}
        duration={duration}
        currentTime={currentTime}
        seekTo={seekTo}
        mode={mode}
        setMode={setMode}
      />
    </div>
  );
}
