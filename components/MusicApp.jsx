"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

const seedSongs = [
  { id: 1, title: "Consideration", artist: "Rihanna", album: "ANTI", src: "/sample.mp3", liked: true },
  { id: 2, title: "Trouble", artist: "Avicii", album: "True", src: "/sample.mp3", liked: false },
  { id: 3, title: "Stay", artist: "The Kid LAROI", album: "Single", src: "/sample.mp3", liked: false },
];

const shareLinks = (title) => ({
  email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Ascolta: " + title)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent("Ascolta: " + title)}`,
  bluetooth: "https://support.google.com/chrome/answer/142065?hl=it",
});

export default function MusicApp() {
  const [songs, setSongs] = useState(seedSongs);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([1]);
  const [eq, setEq] = useState({ bass: 0, mid: 0, treble: 0 });
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);

  const visible = useMemo(
    () => songs.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase())),
    [songs, query]
  );

  const track = songs[current] || songs[0];

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audio);
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
    }
  }, []);

  useEffect(() => {
    if (!nodesRef.current) return;
    nodesRef.current.bass.gain.value = eq.bass;
    nodesRef.current.mid.gain.value = eq.mid;
    nodesRef.current.treble.gain.value = eq.treble;
  }, [eq]);

  const play = async () => {
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {}
  };

  const pause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const toggle = () => (isPlaying ? pause() : play());
  const next = () => setCurrent((current + 1) % songs.length);
  const prev = () => setCurrent((current - 1 + songs.length) % songs.length);

  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const removeSong = (id) => {
    const idx = songs.findIndex((s) => s.id === id);
    const list = songs.filter((s) => s.id !== id);
    setSongs(list);
    setCurrent(Math.max(0, Math.min(idx, list.length - 1)));
  };

  const importFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const added = files.map((file, i) => ({
      id: Date.now() + i,
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local file",
      album: "Imported",
      src: URL.createObjectURL(file),
      liked: false,
    }));
    setSongs((s) => [...added, ...s]);
  };

  const active = shareLinks(track?.title || "Brano");

  return (
    <div className="min-h-screen bg-bg text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl grid gap-4 lg:grid-cols-[320px_1fr_360px]">
        <aside className="rounded-3xl bg-panel p-4 shadow-glow">
          <div className="flex items-center gap-3 mb-6">
            <Music2 className="text-pink-500" />
            <div>
              <div className="font-semibold">Music Spotlight</div>
              <div className="text-xs text-zinc-400">Vercel ready</div>
            </div>
          </div>

          <nav className="space-y-2 text-sm">
            {["Library", "Favorites", "Albums", "Settings"].map((x, i) => (
              <div key={x} className="rounded-2xl bg-panel2 px-4 py-3 flex items-center gap-3">
                <span className="text-pink-500">
                  {[
                    <LibraryBig size={16} key="l" />,
                    <Heart size={16} key="h" />,
                    <Music2 size={16} key="m" />,
                    <Settings size={16} key="s" />,
                  ][i]}
                </span>
                {x}
              </div>
            ))}
          </nav>

          <label className="mt-6 flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-800 px-4 py-3 text-sm">
            <Upload size={16} />
            Importa file
            <input type="file" accept="audio/*" multiple className="hidden" onChange={importFiles} />
          </label>
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

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl bg-gradient-to-b from-zinc-900 to-black p-5 border border-zinc-800">
              <img src="/cover.jpg" alt="cover" className="aspect-square w-full rounded-3xl object-cover shadow-2xl" />
              <div className="mt-5 text-center">
                <div className="text-2xl font-semibold">{track?.title}</div>
                <div className="text-pink-400">{track?.artist} • {track?.album}</div>
              </div>

              <audio ref={audioRef} src={track?.src} onEnded={next} className="hidden" />

              <div className="mt-6 flex items-center justify-center gap-4 text-zinc-200">
                <button onClick={prev}><SkipBack /></button>
                <button onClick={toggle} className="rounded-full bg-pink-500 p-4 text-black shadow-glow">
                  {isPlaying ? <Pause /> : <Play />}
                </button>
                <button onClick={next}><SkipForward /></button>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <input type="range" min="0" max="100" className="w-full" />
                <span className="text-xs text-zinc-500">volume</span>
              </div>

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

                  <a href={active.email} className="text-zinc-400">
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
            <a className="block text-pink-400" href={active.email}>Email</a>
            <a className="block text-pink-400" href={active.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="block text-pink-400" href={active.bluetooth} target="_blank" rel="noreferrer">Bluetooth / app</a>
          </div>

          <div className="rounded-2xl bg-panel2 p-4 text-sm text-zinc-300">
            Album, preferiti e brani sono gestiti direttamente nell’interfaccia. Per una versione definitiva conviene aggiungere un database, ma questa build è già pronta per Vercel.
          </div>
        </aside>
      </div>
    </div>
  );
}
