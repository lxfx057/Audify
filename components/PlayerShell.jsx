"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Album,
  ChevronLeft,
  Folder,
  Heart,
  Home,
  ListMusic,
  Music2,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import MiniPlayer from "./MiniPlayer";

const DATABASE_NAME = "audify-library";
const DATABASE_VERSION = 3;
const TRACK_STORE = "tracks";
const COLLECTION_STORE = "collections";
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

      if (!database.objectStoreNames.contains(COLLECTION_STORE)) {
        database.createObjectStore(COLLECTION_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecords(storeName) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(storeName, record) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteRecord(storeName, id) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);

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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isSameFile(file, track) {
  if (!track?.file) return false;

  return (
    normalizeText(file.name) === normalizeText(track.file.name) &&
    file.size === track.file.size &&
    file.type === track.file.type &&
    file.lastModified === track.file.lastModified
  );
}

function makeCollectionCover(type, name) {
  const palette =
    type === "album"
      ? ["#173b67", "#265e9e", "#8ec5ff"]
      : ["#312260", "#6f4dc7", "#c7b7ff"];

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <defs>
        <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="55%" stop-color="${palette[1]}"/>
          <stop offset="100%" stop-color="${palette[2]}"/>
        </linearGradient>
      </defs>
      <rect width="600" height="600" rx="90" fill="url(#cover)"/>
      <circle cx="450" cy="145" r="120" fill="rgba(255,255,255,0.09)"/>
      <circle cx="135" cy="485" r="175" fill="rgba(0,0,0,0.12)"/>
      <text x="300" y="335" text-anchor="middle" fill="white"
        font-family="Arial, sans-serif" font-size="180" font-weight="700">
        ${initials || "A"}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const temporaryUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(temporaryUrl);
      video.remove();
      resolve(value);
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

        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish(null);
      }
    });

    video.addEventListener("error", () => finish(null));
  });
}

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-5 py-9 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function TrackRow({
  track,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
  rightAction,
}) {
  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        isSelected
          ? "border-[#7db6ff]/60 bg-[#7db6ff]/10"
          : "border-white/10 bg-[#16161a]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(track)}
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
          <p className="truncate font-medium">{track.title}</p>
          <p className="truncate text-sm text-zinc-400">{track.artist}</p>
        </div>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(track.id)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 active:scale-95"
          aria-label="Toggle favorite"
        >
          <Heart
            size={17}
            className={isFavorite ? "fill-white text-white" : ""}
          />
        </button>
      )}

      {rightAction}
    </article>
  );
}

export default function PlayerShell() {
  const [tracks, setTracks] = useState([]);
  const [deletedTracks, setDeletedTracks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [deletedCollections, setDeletedCollections] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [section, setSection] = useState("home");
  const [libraryView, setLibraryView] = useState("tracks");
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState("normal");
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eqValues, setEqValues] = useState(Array(EQ_BANDS.length).fill(0));
  const [ready, setReady] = useState(false);

  const [collectionModal, setCollectionModal] = useState(null);
  const [collectionName, setCollectionName] = useState("");
  const [duplicateNames, setDuplicateNames] = useState([]);

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioFiltersRef = useRef([]);
  const activeTrackIdRef = useRef(null);
  const modeRef = useRef("normal");
  const tracksRef = useRef([]);

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === activeTrackId) || null,
    [tracks, activeTrackId]
  );

  const selectedCollection = useMemo(
    () =>
      collections.find((collection) => collection.id === selectedCollectionId) ||
      null,
    [collections, selectedCollectionId]
  );

  const filteredTracks = useMemo(() => {
    const term = normalizeText(searchText);

    if (!term) return tracks;

    return tracks.filter((track) =>
      `${track.title} ${track.artist}`.toLowerCase().includes(term)
    );
  }, [tracks, searchText]);

  const favoriteTracks = useMemo(
    () => tracks.filter((track) => favorites.includes(track.id)),
    [tracks, favorites]
  );

  const albumCollections = useMemo(
    () => collections.filter((collection) => collection.type === "album"),
    [collections]
  );

  const playlistCollections = useMemo(
    () => collections.filter((collection) => collection.type === "playlist"),
    [collections]
  );

  const artists = useMemo(() => {
    const artistMap = new Map();

    tracks.forEach((track) => {
      const artistName = track.artist?.trim() || "Unknown artist";
      const current = artistMap.get(artistName) || 0;
      artistMap.set(artistName, current + 1);
    });

    return Array.from(artistMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [tracks]);

  const collectionTracks = useMemo(() => {
    if (!selectedCollection) return [];

    const ids = new Set(selectedCollection.trackIds || []);
    return tracks.filter((track) => ids.has(track.id));
  }, [tracks, selectedCollection]);

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
        const [trackRecords, collectionRecords] = await Promise.all([
          getAllRecords(TRACK_STORE),
          getAllRecords(COLLECTION_STORE),
        ]);

        const now = Date.now();
        const availableTracks = [];
        const trashedTracks = [];
        const activeCollections = [];
        const trashedCollections = [];

        for (const record of trackRecords) {
          if (record.deletedAt && now - record.deletedAt > TEN_DAYS_MS) {
            await deleteRecord(TRACK_STORE, record.id);
            continue;
          }

          const track = createTrackFromRecord(record);

          if (track.deletedAt) {
            trashedTracks.push(track);
          } else {
            availableTracks.push(track);
          }
        }

        for (const collection of collectionRecords) {
          if (
            collection.deletedAt &&
            now - collection.deletedAt > TEN_DAYS_MS
          ) {
            await deleteRecord(COLLECTION_STORE, collection.id);
            continue;
          }

          if (collection.deletedAt) {
            trashedCollections.push(collection);
          } else {
            activeCollections.push(collection);
          }
        }

        if (!alive) {
          [...availableTracks, ...trashedTracks].forEach(releaseTrackUrl);
          return;
        }

        setTracks(
          availableTracks.sort((first, second) => second.createdAt - first.createdAt)
        );

        setDeletedTracks(
          trashedTracks.sort((first, second) => second.deletedAt - first.deletedAt)
        );

        setCollections(
          activeCollections.sort(
            (first, second) => second.createdAt - first.createdAt
          )
        );

        setDeletedCollections(
          trashedCollections.sort(
            (first, second) => second.deletedAt - first.deletedAt
          )
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

    const knownTracks = [...tracks, ...deletedTracks];
    const queuedFiles = [];
    const duplicates = [];

    for (const file of acceptedFiles) {
      const alreadySaved = knownTracks.some((track) => isSameFile(file, track));
      const alreadyQueued = queuedFiles.some(
        (queuedFile) =>
          normalizeText(queuedFile.name) === normalizeText(file.name) &&
          queuedFile.size === file.size &&
          queuedFile.type === file.type &&
          queuedFile.lastModified === file.lastModified
      );

      if (alreadySaved || alreadyQueued) {
        duplicates.push(file.name);
      } else {
        queuedFiles.push(file);
      }
    }

    if (duplicates.length) {
      setDuplicateNames(duplicates);
    }

    const importedTracks = [];

    for (const file of queuedFiles) {
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

      await saveRecord(TRACK_STORE, record);

      const track = createTrackFromRecord(record);
      importedTracks.push(track);
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

    await saveRecord(TRACK_STORE, record);

    const deletedTrack = {
      ...track,
      deletedAt: record.deletedAt,
    };

    setTracks((existing) => existing.filter((item) => item.id !== track.id));
    setDeletedTracks((existing) => [deletedTrack, ...existing]);

    setFavorites((existing) => existing.filter((id) => id !== track.id));

    setCollections((existing) =>
      existing.map((collection) => {
        if (!collection.trackIds?.includes(track.id)) return collection;

        const updatedCollection = {
          ...collection,
          trackIds: collection.trackIds.filter((id) => id !== track.id),
          updatedAt: Date.now(),
        };

        saveRecord(COLLECTION_STORE, updatedCollection).catch(() => {});
        return updatedCollection;
      })
    );

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

    await saveRecord(TRACK_STORE, record);

    const restoredTrack = {
      ...track,
      deletedAt: null,
    };

    setDeletedTracks((existing) =>
      existing.filter((item) => item.id !== track.id)
    );

    setTracks((existing) => [restoredTrack, ...existing]);
  };

  const permanentlyDeleteTrack = async (track) => {
    if (!track) return;

    await deleteRecord(TRACK_STORE, track.id);
    releaseTrackUrl(track);

    setDeletedTracks((existing) =>
      existing.filter((item) => item.id !== track.id)
    );

    setFavorites((existing) => existing.filter((id) => id !== track.id));
  };

  const createCollection = async () => {
    const name = collectionName.trim();

    if (!name || !collectionModal) return;

    const collection = {
      id: crypto.randomUUID(),
      name,
      type: collectionModal,
      cover: makeCollectionCover(collectionModal, name),
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };

    await saveRecord(COLLECTION_STORE, collection);

    setCollections((existing) => [collection, ...existing]);
    setCollectionName("");
    setCollectionModal(null);
  };

  const moveCollectionToTrash = async (collection) => {
    if (!collection) return;

    const deletedCollection = {
      ...collection,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveRecord(COLLECTION_STORE, deletedCollection);

    setCollections((existing) =>
      existing.filter((item) => item.id !== collection.id)
    );

    setDeletedCollections((existing) => [deletedCollection, ...existing]);

    if (selectedCollectionId === collection.id) {
      setSelectedCollectionId(null);
    }
  };

  const restoreCollection = async (collection) => {
    const restoredCollection = {
      ...collection,
      deletedAt: null,
      updatedAt: Date.now(),
    };

    await saveRecord(COLLECTION_STORE, restoredCollection);

    setDeletedCollections((existing) =>
      existing.filter((item) => item.id !== collection.id)
    );

    setCollections((existing) => [restoredCollection, ...existing]);
  };

  const permanentlyDeleteCollection = async (collection) => {
    await deleteRecord(COLLECTION_STORE, collection.id);

    setDeletedCollections((existing) =>
      existing.filter((item) => item.id !== collection.id)
    );
  };

  const addTrackToCollection = async (trackId) => {
    if (!selectedCollection) return;

    if (selectedCollection.trackIds?.includes(trackId)) return;

    const updatedCollection = {
      ...selectedCollection,
      trackIds: [...(selectedCollection.trackIds || []), trackId],
      updatedAt: Date.now(),
    };

    await saveRecord(COLLECTION_STORE, updatedCollection);

    setCollections((existing) =>
      existing.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
    );
  };

  const removeTrackFromCollection = async (trackId) => {
    if (!selectedCollection) return;

    const updatedCollection = {
      ...selectedCollection,
      trackIds: (selectedCollection.trackIds || []).filter(
        (id) => id !== trackId
      ),
      updatedAt: Date.now(),
    };

    await saveRecord(COLLECTION_STORE, updatedCollection);

    setCollections((existing) =>
      existing.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
    );
  };

  const recoverableDeletedTracks = deletedTracks.filter(
    (track) => Date.now() - track.deletedAt <= TEN_DAYS_MS
  );

  const recoverableDeletedCollections = deletedCollections.filter(
    (collection) => Date.now() - collection.deletedAt <= TEN_DAYS_MS
  );

  const openCollection = (collection) => {
    setSelectedCollectionId(collection.id);
    setSection("home");
  };

  const CollectionCard = ({ collection }) => (
    <button
      type="button"
      onClick={() => openCollection(collection)}
      className="min-w-0 text-left active:scale-[0.98]"
    >
      <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#101a2d]">
        <img
          src={collection.cover}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{collection.name}</p>
      <p className="truncate text-xs text-zinc-400">
        {collection.type === "album" ? "Album" : "Playlist"} ·{" "}
        {collection.trackIds?.length || 0} tracks
      </p>
    </button>
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

          {ready && section === "home" && !selectedCollection && (
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[#7db6ff]">
                  <Music2 />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Audify</h1>
                  <p className="text-sm text-zinc-400">
                    Your local music library
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

                <button
                  type="button"
                  onClick={() => setSection("favorites")}
                  className="rounded-2xl border border-white/10 bg-[#16161a] p-4 text-left active:scale-[0.98]"
                >
                  <p className="text-sm text-zinc-400">Favorites</p>
                  <p className="mt-2 text-2xl font-bold">
                    {favoriteTracks.length}
                  </p>
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Search size={16} />
                  Search library
                </div>

                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search tracks or artists"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  ["tracks", "Tracks", Music2],
                  ["albums", "Albums", Album],
                  ["playlists", "Playlists", ListMusic],
                  ["artists", "Artists", UserRound],
                ].map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLibraryView(value)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition active:scale-95 ${
                      libraryView === value
                        ? "bg-white text-black"
                        : "bg-white/5 text-zinc-300"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              {libraryView === "tracks" && (
                <div className="space-y-3">
                  {filteredTracks.length === 0 ? (
                    <EmptyState>Import an MP3 or MP4 to start.</EmptyState>
                  ) : (
                    filteredTracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        isFavorite={favorites.includes(track.id)}
                        isSelected={activeTrackId === track.id}
                        onSelect={selectTrack}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))
                  )}
                </div>
              )}

              {libraryView === "albums" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionName("");
                      setCollectionModal("album");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#7db6ff]/40 bg-[#7db6ff]/5 px-4 py-4 text-sm font-medium text-[#b9d7fb] active:scale-[0.99]"
                  >
                    <Plus size={17} />
                    Create album
                  </button>

                  {albumCollections.length === 0 ? (
                    <EmptyState>No albums yet.</EmptyState>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {albumCollections.map((collection) => (
                        <CollectionCard
                          key={collection.id}
                          collection={collection}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {libraryView === "playlists" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionName("");
                      setCollectionModal("playlist");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b99aff]/40 bg-[#8d68ef]/5 px-4 py-4 text-sm font-medium text-[#d9ccff] active:scale-[0.99]"
                  >
                    <Plus size={17} />
                    Create playlist
                  </button>

                  {playlistCollections.length === 0 ? (
                    <EmptyState>No playlists yet.</EmptyState>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {playlistCollections.map((collection) => (
                        <CollectionCard
                          key={collection.id}
                          collection={collection}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {libraryView === "artists" && (
                <div className="space-y-3">
                  {artists.length === 0 ? (
                    <EmptyState>Artists appear after you import tracks.</EmptyState>
                  ) : (
                    artists.map((artist) => (
                      <div
                        key={artist.name}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161a] px-4 py-3"
                      >
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0b1020] text-[#7db6ff]">
                          <UserRound size={20} />
                        </div>
                        <div>
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-sm text-zinc-400">
                            {artist.total} {artist.total === 1 ? "track" : "tracks"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {ready && section === "home" && selectedCollection && (
            <section className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedCollectionId(null)}
                className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-zinc-300 active:scale-95"
              >
                <ChevronLeft size={17} />
                Library
              </button>

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#16161a]">
                <div className="aspect-[16/8] bg-[#0b1020]">
                  <img
                    src={selectedCollection.cover}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#92bff4]">
                    {selectedCollection.type}
                  </p>
                  <h1 className="mt-2 text-2xl font-bold">
                    {selectedCollection.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    {collectionTracks.length}{" "}
                    {collectionTracks.length === 1 ? "track" : "tracks"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <p className="mb-3 text-sm font-medium">Add tracks</p>

                {tracks.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Import tracks before adding them here.
                  </p>
                ) : (
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {tracks.map((track) => {
                      const exists = selectedCollection.trackIds?.includes(
                        track.id
                      );

                      return (
                        <button
                          key={track.id}
                          type="button"
                          disabled={exists}
                          onClick={() => addTrackToCollection(track.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${
                            exists
                              ? "cursor-not-allowed bg-white/[0.03] text-zinc-600"
                              : "bg-white/5 text-zinc-200 active:scale-[0.99]"
                          }`}
                        >
                          <span className="truncate">{track.title}</span>
                          <span className="ml-3 shrink-0 text-xs">
                            {exists ? "Added" : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {collectionTracks.length === 0 ? (
                  <EmptyState>No tracks in this collection yet.</EmptyState>
                ) : (
                  collectionTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isFavorite={favorites.includes(track.id)}
                      isSelected={activeTrackId === track.id}
                      onSelect={selectTrack}
                      onToggleFavorite={toggleFavorite}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => removeTrackFromCollection(track.id)}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 active:scale-95"
                          aria-label="Remove from collection"
                        >
                          <X size={17} />
                        </button>
                      }
                    />
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => moveCollectionToTrash(selectedCollection)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300/15 bg-red-300/[0.06] px-4 py-4 text-sm font-medium text-red-200 active:scale-[0.99]"
              >
                <Trash2 size={17} />
                Move {selectedCollection.type} to trash
              </button>
            </section>
          )}

          {ready && section === "favorites" && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-400/10 text-red-200">
                  <Heart className="fill-current" />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Favorites</h1>
                  <p className="text-sm text-zinc-400">
                    Your liked tracks
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {favoriteTracks.length === 0 ? (
                  <EmptyState>
                    Tap the heart on a track to add it here.
                  </EmptyState>
                ) : (
                  favoriteTracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isFavorite
                      isSelected={activeTrackId === track.id}
                      onSelect={selectTrack}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))
                )}
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
                    Manage imported media
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {tracks.length === 0 ? (
                  <EmptyState>No local files yet.</EmptyState>
                ) : (
                  tracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      isFavorite={favorites.includes(track.id)}
                      isSelected={activeTrackId === track.id}
                      onSelect={selectTrack}
                      onToggleFavorite={toggleFavorite}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => moveToTrash(track)}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 active:scale-95"
                          aria-label="Move file to trash"
                        >
                          <Trash2 size={17} />
                        </button>
                      }
                    />
                  ))
                )}
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
                    Equalizer and trash
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
                  <div>
                    <p className="font-medium">Files trash</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Deleted files can be restored for 10 days.
                    </p>
                  </div>

                  <span className="text-sm text-zinc-400">
                    {recoverableDeletedTracks.length}
                  </span>
                </div>

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

              <div className="rounded-2xl border border-white/10 bg-[#16161a] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Albums & playlists trash</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Deleted collections can be restored for 10 days.
                    </p>
                  </div>

                  <span className="text-sm text-zinc-400">
                    {recoverableDeletedCollections.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {deletedCollections.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      No deleted albums or playlists.
                    </p>
                  )}

                  {deletedCollections.map((collection) => {
                    const expired =
                      Date.now() - collection.deletedAt > TEN_DAYS_MS;

                    return (
                      <article
                        key={collection.id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="truncate font-medium">
                          {collection.name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {collection.type} ·{" "}
                          {expired
                            ? "Recovery period expired"
                            : `Deleted ${formatDate(collection.deletedAt)}`}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={expired}
                            onClick={() => restoreCollection(collection)}
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
                            onClick={() =>
                              permanentlyDeleteCollection(collection)
                            }
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

      {collectionModal && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collection-modal-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createCollection();
            }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#17171b] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  id="collection-modal-title"
                  className="text-lg font-semibold"
                >
                  Create {collectionModal}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Your collection remains on this device.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCollectionModal(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder={
                collectionModal === "album"
                  ? "Album name"
                  : "Playlist name"
              }
              className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-zinc-600"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCollectionModal(null)}
                className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!collectionName.trim()}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {duplicateNames.length > 0 && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicates-modal-title"
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#17171b] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  id="duplicates-modal-title"
                  className="text-lg font-semibold"
                >
                  Duplicate tracks skipped
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  These files are already present in your library and were not
                  imported.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDuplicateNames([])}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5"
                aria-label="Close duplicate dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
              {duplicateNames.map((name, index) => (
                <div
                  key={`${name}-${index}`}
                  className="truncate rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-zinc-200"
                >
                  {name}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDuplicateNames([])}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black active:scale-[0.99]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0f]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-3 py-3">
          <button
            type="button"
            onClick={() => {
              setSelectedCollectionId(null);
              setSection("home");
            }}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] ${
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
            onClick={() => setSection("favorites")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] ${
              section === "favorites"
                ? "bg-white/10 text-white"
                : "text-zinc-400"
            }`}
          >
            <Heart size={18} />
            Favorites
          </button>

          <button
            type="button"
            onClick={() => setSection("files")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] ${
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
            className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] ${
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
