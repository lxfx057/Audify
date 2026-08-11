"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  Heart,
  Home,
  Music2,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import MiniPlayer from "./MiniPlayer";

const DATABASE_NAME = "audify-library";
const DATABASE_VERSION = 2;
const TRACK_STORE = "tracks";
const FAVORITES_KEY = "audify-favorites";
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const EQ_BANDS = [
  { label: "60 Hz", frequency: 60 },
  { label: "170 Hz", frequency: 170 },
  { label: "310 Hz", frequency: 310 },
  { label: "600 Hz", frequency: 600 },
  { label: "1 kHz", frequency: 1000 },
  { label: "3 kHz", frequency: 3000 },
  { label: "6 kHz", frequency: 6000 },
];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TRACK_STORE)) {
        database.createObjectStore(TRACK_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSavedTracks() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(TRACK_STORE, "readonly");
    const request = transaction.objectStore(TRACK_STORE).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function saveTrack(track) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(TRACK_STORE, "readwrite");
    transaction.objectStore(TRACK_STORE).put(track);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteTrackFromDatabase(id) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(TRACK_STORE, "readwrite");
    transaction.objectStore(TRACK_STORE).delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function getKind(file) {
  const filename = file.name.toLowerCase();

  if (
    file.type.startsWith("video/") ||
    filename.endsWith(".mp4") ||
    filename.endsWith(".m4v")
  ) {
    return "video";
  }

  return "audio";
}

function createTrackFromRecord(record) {
  return {
    ...record,
    url: URL.createObjectURL(record.file),
  };
}

function releaseTrackUrl(track) {
  if (track?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(track.url);
  }
}

async function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const temporaryUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(temporaryUrl);
      video.remove();
    };

    video.src = temporaryUrl;
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(0.2, Math.max(0, video.duration / 10));
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 720;

        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnail = canvas.toDataURL("image/jpeg", 0.82);
        cleanup();
        resolve(thumbnail);
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });
  });
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatEqValue(value) {
  return `${value > 0 ? "+" : ""}${value} dB`;
}

export default function PlayerShell() {
  const [tracks, setTracks] = useState([]);
  const [deletedTracks, setDeletedTracks] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [section, setSection] = useState("home");
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState("normal");
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eqValues, setEqValues] = useState(Array(EQ_BANDS.length).fill(0));
  const [ready, setReady] = useState(false);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioFiltersRef = useRef([]);
  const trackMapRef = useRef(new Map());
  const activeTrackIdRef = useRef(null);
  const modeRef = useRef("normal");
  const tracksRef = useRef([]);

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === activeTrackId) || null,
    [tracks, activeTrackId]
  );

  const filteredTracks = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) return tracks;

    return tracks.filter((track) =>
      `${track.title} ${track.artist}`.toLowerCase().includes(term)
    );
  }, [tracks, searchText]);

  useEffect(() => {
    activeTrackIdRef.current = activeTrackId;
  }, [activeTrackId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    try {
      const savedFavorites = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || "[]"
      );

      if (Array.isArray(savedFavorites)) {
        setFavorites(savedFavorites);
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let alive = true;

    async function loadLibrary() {
      try {
        const records = await getSavedTracks();
        const now = Date.now();
        const availableTracks = [];
        const trashTracks = [];

        for (const record of records) {
          if (record.deletedAt && now - record.deletedAt > TEN_DAYS_MS) {
            await deleteTrackFromDatabase(record.id);
            continue;
          }

          const track = createTrackFromRecord(record);

          if (track.deletedAt) {
            trashTracks.push(track);
          } else {
            availableTracks.push(track);
          }
        }

        if (!alive) {
          [...availableTracks, ...trashTracks].forEach(releaseTrackUrl);
          return;
        }

        trackMapRef.current = new Map(
          [...availableTracks, ...trashTracks].map((track) => [
            track.id,
            track,
          ])
        );

        setTracks(
          availableTracks.sort((first, second) => second.createdAt - first.createdAt)
        );

        setDeletedTracks(
          trashTracks.sort((first, second) => second.deletedAt - first.deletedAt)
        );
      } catch (error) {
        console.error("Cannot load local library", error);
      } finally {
        if (alive) {
          setReady(true);
        }
      }
    }

    loadLibrary();

    return () => {
      alive = false;

      trackMapRef.current.forEach(releaseTrackUrl);
      trackMapRef.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const ensureAudioGraph = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      const context = new AudioContextClass();
      const source = context.createMediaElementSource(audio);

      const filters = EQ_BANDS.map((band, index) => {
        const filter = context.createBiquadFilter();

        if (index === 0) {
          filter.type = "lowshelf";
        } else if (index === EQ_BANDS.length - 1) {
          filter.type = "highshelf";
        } else {
          filter.type = "peaking";
        }

        filter.frequency.value = band.frequency;
        filter.Q.value = 1.1;
        filter.gain.value = 0;

        return filter;
      });

      source.connect(filters[0]);

      for (let index = 0; index < filters.length - 1; index += 1) {
        filters[index].connect(filters[index + 1]);
      }

      filters[filters.length - 1].connect(context.destination);

      audioContextRef.current = context;
      audioFiltersRef.current = filters;
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    audioFiltersRef.current.forEach((filter, index) => {
      filter.gain.value = eqEnabled ? eqValues[index] : 0;
    });
  }, [eqEnabled, eqValues]);

  function updateEqBand(index, value) {
    const safeValue = Math.max(-12, Math.min(12, Number(value)));

    setEqValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = safeValue;
      return nextValues;
    });
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      const allTracks = tracksRef.current;
      const currentId = activeTrackIdRef.current;

      if (!allTracks.length || !currentId) {
        setIsPlaying(false);
        return;
      }

      if (modeRef.current === "loop") {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }

      let nextTrack;

      if (modeRef.current === "shuffle") {
        const otherTracks = allTracks.filter((track) => track.id !== currentId);

        nextTrack =
          otherTracks[Math.floor(Math.random() * otherTracks.length)] ||
          allTracks[0];
      } else {
        const currentIndex = allTracks.findIndex(
          (track) => track.id === currentId
        );

        nextTrack = allTracks[(currentIndex + 1) % allTracks.length];
      }

      if (nextTrack) {
        setActiveTrackId(nextTrack.id);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("durationchange", updateProgress);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    audio.pause();
    audio.src = activeTrack.url;
    audio.load();

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [activeTrack?.id]);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    try {
      await ensureAudioGraph();
      await audio.play();
    } catch (error) {
      console.error("Playback blocked or unavailable", error);
      setIsPlaying(false);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const selectTrack = (track) => {
    if (!track) return;

    if (track.id !== activeTrackId) {
      setActiveTrackId(track.id);
      return;
    }

    play();
  };

  useEffect(() => {
    if (!activeTrack) return;

    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay = async () => {
      audio.removeEventListener("canplay", onCanPlay);
      await play();
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [activeTrack?.id]);

  const previous = () => {
    if (!tracks.length || !activeTrackId) return;

    const index = tracks.findIndex((track) => track.id === activeTrackId);
    const previousTrack = tracks[(index - 1 + tracks.length) % tracks.length];

    setActiveTrackId(previousTrack.id);
  };

  const next = () => {
    if (!tracks.length || !activeTrackId) return;

    if (mode === "shuffle") {
      const otherTracks = tracks.filter((track) => track.id !== activeTrackId);

      const nextTrack =
        otherTracks[Math.floor(Math.random() * otherTracks.length)] ||
        tracks[0];

      setActiveTrackId(nextTrack.id);
      return;
    }

    const index = tracks.findIndex((track) => track.id === activeTrackId);
    setActiveTrackId(tracks[(index + 1) % tracks.length].id);
  };

  const seek = (time) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFavorite = (id) => {
    setFavorites((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : [...items, id]
    );
  };

  const importFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    const acceptedFiles = files.filter((file) => {
      const lower = file.name.toLowerCase();

      return (
        file.type.startsWith("audio/") ||
        file.type.startsWith("video/") ||
        lower.endsWith(".mp3") ||
        lower.endsWith(".mp4") ||
        lower.endsWith(".m4v")
      );
    });

    const importedTracks = [];

    for (const file of acceptedFiles) {
      const kind = getKind(file);
      const thumbnail =
        kind === "video" ? await createVideoThumbnail(file) : null;

      const record = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: kind === "video" ? "Local video" : "Local audio",
        kind,
        file,
        thumbnail,
        createdAt: Date.now(),
        deletedAt: null,
      };

      await saveTrack(record);

      const track = createTrackFromRecord(record);
      importedTracks.push(track);
      trackMapRef.current.set(track.id, track);
    }

    if (importedTracks.length) {
      setTracks((existing) => [...importedTracks, ...existing]);
    }
  };

  const moveToTrash = async (track) => {
    if (!track) return;

    const record = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      kind: track.kind,
      file: track.file,
      thumbnail: track.thumbnail || null,
      createdAt: track.createdAt,
      deletedAt: Date.now(),
    };

    await saveTrack(record);

    const deletedTrack = {
      ...track,
      deletedAt: record.deletedAt,
    };

    trackMapRef.current.set(track.id, deletedTrack);

    setTracks((existing) =>
      existing.filter((item) => item.id !== track.id)
    );
    setDeletedTracks((existing) => [deletedTrack, ...existing]);

    if (track.id === activeTrackId) {
      pause();
      setActiveTrackId(null);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  const restoreTrack = async (track) => {
    if (!track) return;

    const record = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      kind: track.kind,
      file: track.file,
      thumbnail: track.thumbnail || null,
      createdAt: track.createdAt,
      deletedAt: null,
    };

    await saveTrack(record);

    const restoredTrack = {
      ...track,
      deletedAt: null,
    };

    trackMapRef.current.set(track.id, restoredTrack);

    setDeletedTracks((existing) =>
      existing.filter((item) => item.id !== track.id)
    );
    setTracks((existing) => [restoredTrack, ...existing]);
  };

  const permanentlyDeleteTrack = async (track) => {
    if (!track) return;

    await deleteTrackFromDatabase(track.id);

    releaseTrackUrl(track);
    trackMapRef.current.delete(track.id);

    setDeletedTracks((existing) =>
      existing.filter((item) => item.id !== track.id)
    );

    setFavorites((existing) =>
      existing.filter((id) => id !== track.id)
    );
  };

  const recoverableDeletedTracks = deletedTracks.filter(
    (track) => Date.now() - track.deletedAt <= TEN_DAYS_MS
  );

  return (
    <main className="min-h-screen bg-[#09090b] pb-44 text-white">
      <audio ref={audioRef} preload="metadata" />

      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="rounded-[28px] border border-white/10 bg-[#111113] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
          {!ready && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
              Loading your local library…
            </div>
          )}

          {ready && section === "home" && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Music2 />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Audify</h1>
                  <p className="text-sm text-zinc-400">
                    Your local audio library
                  </p>
                </div>
              </div>

              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition active:scale-[0.99]">
                <Upload size={17} />
                Import audio or video
                <input
                  type="file"
                  multiple
                  accept="audio/*,video/*,.mp3,.mp4,.m4v"
                  className="hidden"
                  onChange={importFiles}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                  <p className="text-sm text-zinc-400">Tracks</p>
                  <p className="mt-2 text-2xl font-bold">{tracks.length}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                  <p className="text-sm text-zinc-400">Favorites</p>
                  <p className="mt-2 text-2xl font-bold">
                    {favorites.length}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Search size={16} />
                  Search
                </div>

                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search tracks"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-3">
                {filteredTracks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                    Import an MP3 or MP4 to start.
                  </div>
                )}

                {filteredTracks.map((track) => {
                  const favorite = favorites.includes(track.id);
                  const selected = activeTrackId === track.id;

                  return (
                    <article
                      key={track.id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                        selected
                          ? "border-[#7db6ff]/60 bg-[#7db6ff]/10"
                          : "border-white/10 bg-[#16161a]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectTrack(track)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0b1020] text-xl text-[#7db6ff]">
                          {track.thumbnail ? (
                            <img
                              src={track.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "♫"
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {track.title}
                          </p>
                          <p className="truncate text-sm text-zinc-400">
                            {track.artist}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(track.id)}
                        className="grid h-11 w-11 place-items-center rounded-full bg-white/5 active:scale-95"
                        aria-label="Favorite track"
                      >
                        <Heart
                          size={17}
                          className={favorite ? "fill-white text-white" : ""}
                        />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {ready && section === "files" && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Folder />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Files</h1>
                  <p className="text-sm text-zinc-400">
                    Manage your local library
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {tracks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                    No local files yet.
                  </div>
                )}

                {tracks.map((track) => (
                  <article
                    key={track.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161a] px-4 py-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0b1020] text-xl text-[#7db6ff]">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "♫"
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{track.title}</p>
                      <p className="truncate text-sm text-zinc-400">
                        Added {formatDate(track.createdAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => moveToTrash(track)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/5 active:scale-95"
                      aria-label="Move file to trash"
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {ready && section === "settings" && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Settings />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Settings</h1>
                  <p className="text-sm text-zinc-400">
                    Equalizer and deleted files
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101116] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Graphic Equalizer
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Drag each band up or down
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEqEnabled((value) => !value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
                      eqEnabled
                        ? "bg-[#79a9e8] text-[#07111f]"
                        : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {eqEnabled ? "EQ ON" : "EQ OFF"}
                  </button>
                </div>

                <div
                  className={`rounded-2xl border border-white/10 bg-black/20 px-3 pb-4 pt-5 ${
                    eqEnabled ? "" : "opacity-40"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    <span>+12 dB</span>
                    <span>0 dB</span>
                    <span>-12 dB</span>
                  </div>

                  <div className="flex min-h-[276px] items-end justify-between gap-1 sm:gap-3">
                    {EQ_BANDS.map((band, index) => {
                      const value = eqValues[index];
                      const percentage = ((value + 12) / 24) * 100;

                      return (
                        <div
                          key={band.frequency}
                          className="flex min-w-0 flex-1 flex-col items-center gap-3"
                        >
                          <div className="relative h-[220px] w-full max-w-[42px]">
                            <div className="pointer-events-none absolute inset-x-1 top-2 h-px bg-white/10" />
                            <div className="pointer-events-none absolute inset-x-1 top-1/4 h-px bg-white/[0.07]" />
                            <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px bg-white/15" />
                            <div className="pointer-events-none absolute inset-x-1 top-3/4 h-px bg-white/[0.07]" />
                            <div className="pointer-events-none absolute inset-x-1 bottom-2 h-px bg-white/10" />

                            <div className="pointer-events-none absolute left-1/2 top-3 h-[196px] w-[5px] -translate-x-1/2 rounded-full bg-[#06080d] ring-1 ring-white/10">
                              <div
                                className="absolute bottom-0 left-0 w-full rounded-full bg-[#4e8fe8] transition-[height] duration-75"
                                style={{ height: `${percentage}%` }}
                              />
                            </div>

                            <div
                              className="pointer-events-none absolute left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full border border-[#b8d0ef] bg-[#dce9fa] shadow-[0_1px_3px_rgba(0,0,0,0.55)] transition-[bottom] duration-75"
                              style={{
                                bottom: `calc(${percentage}% - 8px)`,
                              }}
                            />

                            <input
                              type="range"
                              min="-12"
                              max="12"
                              step="1"
                              value={value}
                              disabled={!eqEnabled}
                              orient="vertical"
                              onChange={(event) =>
                                updateEqBand(index, event.target.value)
                              }
                              className="eq-real-slider absolute inset-0 z-20 h-[220px] w-full"
                              aria-label={`${band.label}: ${formatEqValue(
                                value
                              )}`}
                            />
                          </div>

                          <div className="text-center">
                            <p className="whitespace-nowrap text-[10px] font-semibold text-white">
                              {band.label
                                .replace(" Hz", "")
                                .replace(" kHz", "K")}
                            </p>

                            <p className="mt-1 whitespace-nowrap text-[9px] text-[#91bdf3]">
                              {formatEqValue(value)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEqValues(Array(EQ_BANDS.length).fill(0))
                    }
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => setEqValues([7, 4, 2, 0, -1, 2, 5])}
                    className="flex-1 rounded-xl border border-[#719fd6]/30 bg-[#719fd6]/10 px-3 py-3 text-sm font-medium text-[#bdd9fa] transition active:scale-[0.98]"
                  >
                    Bass Boost
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium">Trash</p>
                  <span className="text-sm text-zinc-400">
                    {recoverableDeletedTracks.length} recoverable
                  </span>
                </div>

                <p className="mb-4 text-sm text-zinc-400">
                  Deleted files can be restored for 10 days.
                </p>

                <div className="space-y-3">
                  {deletedTracks.length === 0 && (
                    <p className="text-sm text-zinc-500">Trash is empty.</p>
                  )}

                  {deletedTracks.map((track) => {
                    const expired =
                      Date.now() - track.deletedAt > TEN_DAYS_MS;

                    return (
                      <article
                        key={track.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="truncate font-medium">{track.title}</p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {expired
                            ? "Recovery period expired"
                            : `Deleted ${formatDate(track.deletedAt)}`}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={expired}
                            onClick={() => restoreTrack(track)}
                            className={`rounded-full px-4 py-2 text-sm ${
                              expired
                                ? "cursor-not-allowed bg-white/5 text-zinc-600"
                                : "bg-white/10 text-white active:scale-95"
                            }`}
                          >
                            Restore
                          </button>

                          <button
                            type="button"
                            onClick={() => permanentlyDeleteTrack(track)}
                            className="rounded-full bg-white/5 px-4 py-2 text-sm text-zinc-300 active:scale-95"
                          >
                            Delete forever
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <MiniPlayer
        track={activeTrack}
        isPlaying={isPlaying}
        isFavorite={activeTrack ? favorites.includes(activeTrack.id) : false}
        duration={duration}
        currentTime={currentTime}
        onPlay={play}
        onPause={pause}
        onPrevious={previous}
        onNext={next}
        onSeek={seek}
        onToggleFavorite={() =>
          activeTrack && toggleFavorite(activeTrack.id)
        }
        mode={mode}
        setMode={setMode}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0f]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setSection("home")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs ${
              section === "home"
                ? "bg-white/10 text-white"
                : "text-zinc-400"
            }`}
          >
            <Home size={18} />
            Home
          </button>

          <button
            type="button"
            onClick={() => setSection("files")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs ${
              section === "files"
                ? "bg-white/10 text-white"
                : "text-zinc-400"
            }`}
          >
            <Folder size={18} />
            Files
          </button>

          <button
            type="button"
            onClick={() => setSection("settings")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs ${
              section === "settings"
                ? "bg-white/10 text-white"
                : "text-zinc-400"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </nav>
    </main>
  );
}
