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
    setCurrent((c) => (c - 1 + songs.length) % songs.length);
    setIsPlaying(false);
  };

  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const removeSong = (id) => {
    const idx = songs.findIndex((s) => s.id === id);
    const list = songs.filter((s) => s.id !== id);
    setSongs(list);
    setCurrent(Math.max(0, Math.min(idx, list.length - 1)));
    setIsPlaying(false);
  };

  const importFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((file) => {
      const name = file.name.toLowerCase();
      const okMp3 = file.type === "audio/mpeg" || file.type === "audio/mp3" || name.endsWith(".mp3");
      const okMp4 = file.type === "video/mp4" || file.type === "video/x-m4v" || name.endsWith(".mp4") || name.endsWith(".m4v");
      return okMp3 || okMp4;
    });

    const added = valid.map((file, i) => {
      const video = isVideoFile(file);
      return {
        id: Date.now() + i,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Local file",
        album: video ? "Video importato" : "Audio importato",
        src: URL.createObjectURL(file),
        kind: video ? "video" : "audio",
        gradient: randomGradient(),
      };
    });

    if (added.length) {
      setSongs((s) => [...added, ...s]);
      setCurrent(0);
    }
  };

  const activeShare = shareLinks(track?.title || "Brano");
  const showVideo = track?.kind === "video";

  return (
    <div className="min-h-screen bg-bg text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-3xl bg-panel p-4 shadow-glow">
          <div className="flex items-center gap-3 mb-6">
            <Music2 className="text-pink-500" />
            <div>
              <div className="font-semibold">Music Spotlight</div>
              <div className="text-xs text-zinc-400">Mobile ready</div>
            </div>
          </div>

          <nav className="space-y-2 text-sm">
            {[
              ["Library", <LibraryBig size={16} key="l" />],
              ["Favorites", <Heart size={16} key="h" />],
              ["Albums", <Music2 size={16} key="m" />],
              ["Settings", <Settings size={16} key="s" />],
            ].map(([label, icon]) => (
              <div key={label} className="rounded-2xl bg-panel2 px-4 py-3 flex items-center gap-3">
                <span className="text-pink-500">{icon}</span>
                {label}
              </div>
            ))}
          </nav>

          <label className="mt-6 flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-800 px-4 py-3 text-sm">
            <Upload size={16} />
            Importa file
            <input
              type="file"
              multiple
              className="hidden"
              accept="audio/mpeg,audio/mp3,.mp3,video/mp4,video/x-m4v,.mp4,.m4v,video/*"
              onChange={importFiles}
            />
          </label>

          <div className="mt-3 text-xs text-zinc-500">
            Accetta solo MP3 e MP4.
          </div>
        </aside>

        <main className="rounded-3xl bg-panel p-4 md:p-6 shadow-glow">
          <div className="flex items-center gap-3 rounded-2xl bg-panel2 px-4 py-3 mb-5">
            <Search size={16} className="text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca canzoni, album, artista"
              className="w-full bg-transparent outline-none"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section
              className="rounded-3xl border border-zinc-800 p-5"
              style={{
                background: showVideo ? "#000" : (track?.gradient || bg),
              }}
            >
              {showVideo ? (
                <video
                  ref={videoRef}
                  src={track?.src}
                  className="aspect-square w-full rounded-3xl object-cover bg-black"
                  controls
                  playsInline
                  preload="metadata"
                  onEnded={next}
                />
              ) : (
                <div className="aspect-square w-full rounded-3xl bg-black/30 flex items-center justify-center text-center p-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-300 mb-3">MP3</div>
                    <div className="text-2xl font-semibold">{track?.title || "Nessun brano"}</div>
                    <div className="text-pink-300 mt-2">{track?.artist || "Importa un file"}</div>
                  </div>
                </div>
              )}

              <div className="mt-5 text-center">
                <div className="text-2xl font-semibold">{track?.title || "Importa un file"}</div>
                <div className="text-pink-400">{track?.artist || "Da iPhone funziona"}</div>
              </div>

              {track?.kind === "audio" && (
                <audio ref={audioRef} src={track?.src} onEnded={next} className="hidden" />
              )}

              <div className="mt-6 flex items-center justify-center gap-4 text-zinc-200">
                <button onClick={prev}><SkipBack /></button>
                <button onClick={toggle} className="rounded-full bg-pink-500 p-4 text-black shadow-glow">
                  {isPlaying ? <Pause /> : <Play />}
                </button>
                <button onClick={next}><SkipForward /></button>
              </div>

              {track?.kind === "audio" && (
                <div className="mt-4 flex items-center gap-3">
                  <input type="range" min="0" max="100" className="w-full" />
                  <span className="text-xs text-zinc-400">vol</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <button onClick={() => setEq({ ...eq, bass: eq.bass === 0 ? 6 : 0 })} className="rounded-xl bg-zinc-800 py-2">Bass</button>
                <button onClick={() => setEq({ ...eq, mid: eq.mid === 0 ? 5 : 0 })} className="rounded-xl bg-zinc-800 py-2">Mid</button>
                <button onClick={() => setEq({ ...eq, treble: eq.treble === 0 ? 5 : 0 })} className="rounded-xl bg-zinc-800 py-2">Treble</button>
              </div>
            </section>

            <section className="space-y-3">
              {visible.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-2xl border ${track?.id === s.id ? "border-pink-500 bg-zinc-900" : "border-zinc-800 bg-panel2"} p-4 flex items-center gap-3`}
                >
                  <button onClick={() => setCurrent(songs.findIndex((x) => x.id === s.id))} className="flex-1 text-left">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-zinc-400">{s.artist}</div>
                  </button>

                  <button onClick={() => toggleFav(s.id)}>
                    <Heart size={18} className={favorites.includes(s.id) ? "fill-pink-500 text-pink-500" : ""} />
                  </button>

                  <a href={activeShare.email} className="text-zinc-400">
                    <Share2 size={18} />
                  </a>

                  <button onClick={() => removeSong(s.id)} className="text-zinc-400">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </section>
          </div>
        </main>

        <aside className="rounded-3xl bg-panel p-4 shadow-glow space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <SlidersHorizontal size={16} /> Impostazioni
          </div>

          <div className="rounded-2xl bg-panel2 p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>Shuffle</span><Shuffle size={16} /></div>
            <div className="flex justify-between"><span>Repeat</span><Repeat2 size={16} /></div>
            <div className="flex justify-between"><span>Condividi via</span></div>
            <a className="block text-pink-400" href={activeShare.email}>Email</a>
            <a className="block text-pink-400" href={activeShare.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="block text-pink-400" href={activeShare.bluetooth} target="_blank" rel="noreferrer">Bluetooth / app</a>
          </div>

          <div className="rounded-2xl bg-panel2 p-4 text-sm text-zinc-300">
            Se importi un MP3, il player usa uno sfondo gradient casuale. Se importi un MP4, parte il video nel player.
          </div>
        </aside>
      </div>
    </div>
  );
}
