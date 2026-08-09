"use client";

import { useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Search,
  Share2,
  Trash2,
  Settings,
  Music2,
  LibraryBig,
  Shuffle,
  Repeat2,
  Upload,
  SlidersHorizontal,
  Video,
  AudioLines,
} from "lucide-react";

const seedSongs = [];

const gradientSets = [
  ["#ff2d55", "#1d4ed8"],
  ["#8b5cf6", "#ec4899"],
  ["#0f172a", "#22c55e"],
  ["#111827", "#f59e0b"],
  ["#1e1b4b", "#06b6d4"],
  ["#3f3f46", "#ef4444"],
];

const randomGradient = () => {
  const g = gradientSets[Math.floor(Math.random() * gradientSets.length)];
  return `radial-gradient(circle at top left, ${g[0]}, ${g[1]})`;
};

const shareLinks = (title) => ({
  email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Ascolta: " + title)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent("Ascolta: " + title)}`,
  bluetooth: "https://support.google.com/chrome/answer/142065?hl=it",
});

function isVideoFile(file) {
  return (
    file.type.startsWith("video/") ||
    file.name.toLowerCase().endsWith(".mp4") ||
    file.name.toLowerCase().endsWith(".m4v")
  );
}

export default function MusicApp() {
  const [songs, setSongs] = useState(seedSongs);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [eq, setEq] = useState({ bass: 0, mid: 0, treble: 0 });
  const [bg, setBg] = useState("radial-gradient(circle at top left, #111827, #000000)");
  const [mediaMode, setMediaMode] = useState("none");
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const visible = useMemo(
    () => songs.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase())),
    [songs, query]
  );

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
    nodesRef.current.bass.gain.value = eq.bass;
    nodesRef.current.mid.gain.value = eq.mid;
    nodesRef.current.treble.gain.value = eq.treble;
  };

  const playCurrent = async () => {
    if (!track) return;
    if (track.kind === "video") {
      await videoRef.current.play();
    } else {
      ensureAudioGraph();
      applyEq();
      await audioRef.current.play();
    }
    setIsPlaying(true);
  };

  const pauseCurrent = () => {
    if (track?.kind === "video") videoRef.current.pause();
    else audioRef.current.pause();
    setIsPlaying(false);
  };

  const toggle = () => (isPlaying ? pauseCurrent() : playCurrent());

  const next = () => {
    if (!songs.length) return;
    setCurrent((c) => (c + 1) % songs.length);
    setIsPlaying(false);
  };

  const prev = () => {
    if (!songs.length) return;
    
