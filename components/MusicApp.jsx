"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Folder,
  Settings,
  Search,
  Upload,
  Music2,
  Heart,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Trash2,
} from "lucide-react";

const DB_NAME = "music-spotlight-db";
const DB_VERSION = 1;
const STORE = "tracks";
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

const EQ_BANDS = [
  { label: "60", freq: 60 },
  { label: "170", freq: 170 },
  { label: "310", freq: 310 },
  { label: "600", freq: 600 },
  { label: "1K", freq: 1000 },
  { label: "3K", freq: 3000 },
  { label: "6K", freq: 6000 },
];

const urlCache = new Map();
function getCachedObjectURL(blobOrUrl) {
  if (!blobOrUrl) return null;
  if (typeof blobOrUrl === "string") return blobOrUrl;
  if (urlCache.has(blobOrUrl)) return urlCache.get(blobOrUrl);
  const url = URL.createObjectURL(blobOrUrl);
  urlCache.set(blobOrUrl, url);
  return url;
}

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

async function extractAudioThumbnail(file) {
  try {
    const sliceSize = Math.min(file.size, 512 * 1024);
    const arrayBuffer = await file.slice(0, sliceSize).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    for (let i = 0; i < bytes.length - 10; i++) {
      if (bytes[i] === 0xFF && bytes[i+1] === 0xD8 && bytes[i+2] === 0xFF) {
        return new Blob([bytes.slice(i)], { type: 'image/jpeg' });
      }
      if (
        bytes[i] === 0x89 && bytes[i+1] === 0x50 && bytes[i+2] === 0x4E && bytes[i+3] === 0x47 &&
        bytes[i+4] === 0x0D && bytes[i+5] === 0x0A && bytes[i+6] === 0x1A && bytes[i+7] === 0x0A
      ) {
        return new Blob([bytes.slice(i)], { type: 'image/png' });
      }
    }
  } catch (e) {
    console.warn("Cover extract warning:", e);
  }
  return null;
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

function shuffleArray(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function MusicApp() {
  const [songs, setSongs] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [current, setCurrent] = useState(0);
  const [section, setSection] = useState("home");
  const [query, setQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [mode, setMode] = useState("normal");
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eq, setEq] = useState(Array(7).fill(0));
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const activeQueue = useMemo(
    () => (mode === "shuffle" ? shuffleArray(songs) : songs),
    [songs, mode]
  );

  const track = activeQueue[current] || activeQueue[0] || null;

  useEffect(() => {
    setImgError(false);
  }, [track?.id, track?.thumb]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await dbGetAll();
        const mapTrack = (x) => ({
          ...x,
          src: x.fileBlob ? getCachedObjectURL(x.fileBlob) : x.src,
          thumb: x.thumbBlob ? getCachedObjectURL(x.thumbBlob) : x.thumb,
        });
        setSongs(stored.filter((x) => !x.deleted).map(mapTrack));
        setDeleted(stored.filter((x) => x.deleted).map(mapTrack));
      } catch (e) {
        console.error("DB Load error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setDeleted((prev) => prev.filter((x) => !x.deletedAt || Date.now() - x.deletedAt <= TEN_DAYS));
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!track) return;
    const media = track.kind === "video" ? videoRef.current : audioRef.current;
    if (media && track.src && media.src !== track.src) {
      media.src = track.src;
    }
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

  const mediaForTrack = () => (track?.kind === "video" ? videoRef.current : audioRef.current);

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

  const next = () => {
    if (!activeQueue.length) return;
    const nextIndex = (current + 1) % activeQueue.length;
    setCurrent(nextIndex);
    requestAnimationFrame(async () => {
      const targetSong = activeQueue[nextIndex];
      if (targetSong?.kind === "audio") ensureAudioGraph();
      const media = targetSong?.kind === "video" ? videoRef.current : audioRef.current;
      if (media) {
        const ok = await safePlay(media);
        setIsPlaying(ok);
      }
    });
  };

  const prev = () => {
    if (!activeQueue.length) return;
    const media = mediaForTrack();
    // Se siamo oltre i 3 secondi dall'inizio, riavvia la traccia corrente
    if (media && media.currentTime > 3) {
      media.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIndex = (current - 1 + activeQueue.length) % activeQueue.length;
    setCurrent(prevIndex);
    requestAnimationFrame(async () => {
      const targetSong = activeQueue[prevIndex];
      if (targetSong?.kind === "audio") ensureAudioGraph();
      const targetMedia = targetSong?.kind === "video" ? videoRef.current : audioRef.current;
      if (targetMedia) {
        const ok = await safePlay(targetMedia);
        setIsPlaying(ok);
      }
    });
  };

  useEffect(() => {
    const media = mediaForTrack();
    if (!media) return;
    const update = () => {
      if (!isSeeking) {
        setCurrentTime(media.currentTime || 0);
        setDuration(media.duration || 0);
      }
    };
    const ended = () => {
      setIsPlaying(false);
      if (mode === "loop") {
        media.currentTime = 0;
        safePlay(media).then((ok) => setIsPlaying(ok));
      } else {
        next();
      }
    };
    media.addEventListener("timeupdate", update);
    media.addEventListener("loadedmetadata", update);
    media.addEventListener("durationchange", update);
    media.addEventListener("ended", ended);
    return () => {
      media.removeEventListener("timeupdate", update);
      media.removeEventListener("loadedmetadata", update);
      media.removeEventListener("durationchange", update);
      media.removeEventListener("ended", ended);
    };
  }, [track, mode, current, activeQueue, isSeeking]);

  const visible = useMemo(
    () => songs.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase())),
    [songs, query]
  );

  const handleSeekChange = (val) => {
    setCurrentTime(val);
  };

  const handleSeekCommit = (val) => {
    setIsSeeking(false);
    const media = mediaForTrack();
    if (media) {
      media.currentTime = val;
    }
    setCurrentTime(val);
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
    const media = mediaForTrack();
    if (!media) return;
    media.pause();
    setIsPlaying(false);
  };

  const playTrackById = async (songId) => {
    const idx = activeQueue.findIndex((x) => x.id === songId);
    if (idx < 0) return;
    setCurrent(idx);
    requestAnimationFrame(async () => {
      const targetSong = activeQueue[idx];
      if (targetSong?.kind === "audio") ensureAudioGraph();
      const media = targetSong?.kind === "video" ? videoRef.current : audioRef.current;
      if (media) {
        const ok = await safePlay(media);
        setIsPlaying(ok);
      }
    });
  };

  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const addFiles = async (files) => {
    const valid = Array.from(files || []).filter((file) => {
      const name = file.name.toLowerCase();
      const okMp3 = file.type.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".flac");
      const okMp4 = file.type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".m4v");
      return okMp3 || okMp4;
    });

    const created = [];
    for (const file of valid) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const kind = isVideoFile(file) ? "video" : "audio";
      
      let thumbBlob = null;
      if (kind === "video") {
        const dataUrl = await extractVideoThumbnail(file);
        if (dataUrl) {
          const res = await fetch(dataUrl);
          thumbBlob = await res.blob();
        }
      } else {
        thumbBlob = await extractAudioThumbnail(file);
      }

      const item = {
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: kind === "video" ? "Video" : "Local file",
        kind,
        fileBlob: file,
        thumbBlob: thumbBlob,
        deleted: false,
        createdAt: Date.now(),
        deletedAt: null,
      };
      await dbPut(item);

      const memoryItem = {
        ...item,
        src: getCachedObjectURL(file),
        thumb: getCachedObjectURL(thumbBlob),
      };
      created.push(memoryItem);
    }

    if (created.length) {
      setSongs((prevList) => [...created, ...prevList]);
      setCurrent(0);
      setSection("home");
      requestAnimationFrame(() => playTrackById(created[0].id));
    }
  };

  const importFiles = async (e) => {
    await addFiles(e.target.files);
    e.target.value = "";
  };

  const removeSong = async (id) => {
    const item = songs.find((s) => s.id === id);
    if (!item) return;
    const updated = { ...item, deleted: true, deletedAt: Date.now() };
    await dbPut(updated);
    setSongs((prev) => prev.filter((x) => x.id !== id));
    setDeleted((prev) => [updated, ...prev]);
    if (track?.id === id) setIsPlaying(false);
  };

  const restoreSong = async (id) => {
    const item = deleted.find((s) => s.id === id);
    if (!item) return;
    if (item.deletedAt && Date.now() - item.deletedAt > TEN_DAYS) return;
    const updated = { ...item, deleted: false, deletedAt: null };
    await dbPut(updated);
    setDeleted((prev) => prev.filter((x) => x.id !== id));
    setSongs((prev) => [updated, ...prev]);
  };

  const cycleMode = () => {
    const nextMode = mode === "normal" ? "shuffle" : mode === "shuffle" ? "loop" : "normal";
    setMode(nextMode);
  };

  const restoreable = deleted.filter((x) => x.deletedAt && Date.now() - x.deletedAt <= TEN_DAYS);
  const hasThumb = Boolean(track?.thumb && !imgError);

  const renderArtwork = (isLarge = false) => {
    if (!track) return null;
    if (track.kind === "video") {
      return (
        <video
          ref={videoRef}
          src={track.src}
          className={isLarge ? "h-full w-full object-contain" : "h-full w-full object-cover"}
          controls={false}
          playsInline
        />
      );
    }
    if (hasThumb) {
      return (
        <img
          key={track.thumb}
          src={track.thumb}
          alt={track.title}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      );
    }
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0b1020] text-[#7db6ff]">
        <span className={isLarge ? "text-6xl" : "text-2xl"}>♫</span>
        {isLarge && (
          <p className="mt-3 text-xs uppercase tracking-[0.32em] text-[#7db6ff]/80">
            Audio
          </p>
        )}
      </div>
    );
  };

  const maxDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const seekValue = Math.min(currentTime || 0, maxDuration);

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
                  accept="audio/*,video/*,.mp3,.mp4,.m4v,.m4a,.flac"
                  onChange={importFiles}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {[["All tracks", songs.length], ["Deleted", deleted.length]].map(([label, count]) => (
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
                {(query ? visible : activeQueue).map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161a] px-4 py-3 transition hover:bg-white/[0.04] ${
                      track?.id === s.id ? "ring-1 ring-white/15" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => playTrackById(s.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-2xl bg-[#0b1020]">
                        {s.thumb ? (
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
                      {s.thumb ? (
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
                  <div className="text-sm text-zinc-400">Equalizer and trash</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-medium">
                  <span>Trash</span>
                  <span className="text-zinc-400">{restoreable.length} recoverable</span>
                </div>

                <div className="space-y-3">
                  {deleted.length ? deleted.map((s) => {
                    const canRestore = !s.deletedAt || Date.now() - s.deletedAt <= TEN_DAYS;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{s.title}</div>
                          <div className="truncate text-xs text-zinc-400">
                            {canRestore ? "Recoverable for 10 days" : "Expired"}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canRestore}
                          onClick={() => restoreSong(s.id)}
                          className={`rounded-full px-4 py-2 text-sm transition ${
                            canRestore ? "bg-white/5 text-white active:scale-95" : "cursor-not-allowed bg-white/5 text-zinc-500"
                          }`}
                        >
                          Restore
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="text-sm text-zinc-400">Trash is empty.</div>
                  )}
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
                          const nextEq = [...eq];
                          nextEq[i] = Number(e.target.value);
                          setEq(nextEq);
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

      <audio ref={audioRef} className="hidden" />
      <video ref={videoRef} className="hidden" />

      {track && (
        <section
          className={`fixed inset-x-0 bottom-16 z-50 overflow-hidden border-t border-white/10 bg-[#111113]/95 backdrop-blur-xl transition-all duration-300 ${
            expanded ? "h-[82vh]" : "h-[88px]"
          }`}
        >
          <div className="flex h-[88px] items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setExpanded((state) => !state)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label="Toggle player size"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0b1020] ring-1 ring-white/10">
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

            <button
              type="button"
              onClick={() => toggleFav(track.id)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-white active:scale-95"
              aria-label="Toggle favorite"
            >
              <Heart
                size={18}
                className={favorites.includes(track.id) ? "fill-white text-white" : ""}
              />
            </button>

            <button
              type="button"
              onClick={isPlaying ? pauseCurrent : playCurrent}
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

          {expanded && (
            <div className="flex h-[calc(82vh-88px)] flex-col gap-5 overflow-y-auto px-4 pb-5">
              <div className="flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[#07111f] relative">
                {renderArtwork(true)}
              </div>

              <div>
                <h2 className="truncate text-2xl font-bold">{track.title}</h2>
                <p className="truncate text-sm text-zinc-400">{track.artist}</p>
              </div>

              <div className="grid grid-cols-[46px_1fr_46px] items-center gap-3">
                <span className="text-xs text-zinc-400">
                  {formatTime(seekValue)}
                </span>

                <input
                  type="range"
                  min="0"
                  max={maxDuration}
                  step="0.1"
                  value={seekValue}
                  disabled={!maxDuration}
                  onMouseDown={() => setIsSeeking(true)}
                  onTouchStart={() => setIsSeeking(true)}
                  onChange={(event) => handleSeekChange(Number(event.target.value))}
                  onMouseUp={(event) => handleSeekCommit(Number(event.target.value))}
                  onTouchEnd={(event) => handleSeekCommit(Number(event.target.value))}
                  className="w-full accent-white cursor-pointer"
                  aria-label="Seek track"
                />

                <span className="text-right text-xs text-zinc-400">
                  {formatTime(maxDuration)}
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
                  onClick={prev}
                  className="grid h-12 w-12 place-items-center rounded-full bg-white/5 active:scale-95"
                  aria-label="Previous track"
                >
                  <SkipBack size={20} />
                </button>

                <button
                  type="button"
                  onClick={isPlaying ? pauseCurrent : playCurrent}
                  className="grid h-16 w-16 place-items-center rounded-full bg-white text-black active:scale-95"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>

                <button
                  type="button"
                  onClick={next}
                  className="grid h-12 w-12 place-items-center rounded-full bg-white/5 active:scale-95"
                  aria-label="Next track"
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
