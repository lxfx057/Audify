# 🎧 Audify

> A modern, private, browser-based music player for your local audio and video files.

Audify lets you import, organize, play, and manage your personal media library directly in your browser.  
Everything stays on your device: files are stored locally with IndexedDB, with no account, server upload, or cloud dependency required. 🔒

---

## ✨ Features

### 🎵 Local media library

- Import local **audio and video** files
- Supported examples: MP3, MP4, M4V, and browser-supported audio/video formats
- Play files directly in the browser
- Automatically creates thumbnails for supported video files
- Search your library by track title or artist
- Playback controls: play, pause, previous, next, seek, shuffle, and loop

### ❤️ Favorites

- Add or remove tracks from your Favorites
- Dedicated Favorites page in the bottom navigation
- Favorites are saved locally on your device

### 💿 Albums and playlists

- Create custom **albums** and **playlists**
- Add imported tracks to any collection
- Open a collection to view, play, add, or remove its tracks
- Delete collections without deleting the original audio files
- Automatically generated cover art for each new album or playlist

### 👤 Artists

- Automatic artist view generated from your imported tracks
- Shows the number of tracks available for every artist

### 🗑️ Trash and recovery

- Move tracks to the trash from the Files page
- Move albums and playlists to their own dedicated collection trash
- Restore deleted items within **10 days**
- Permanently delete files, albums, or playlists when no longer needed

### 🚫 Duplicate protection

- Detects duplicate imports before saving files
- Duplicate checks use file name, type, size, and last modification date
- Shows a clean popup with every skipped duplicate file
- Prevents unnecessary duplicate tracks in the local library

### 🎛️ Graphic equalizer

- Seven-band graphic equalizer:
  - 60 Hz
  - 170 Hz
  - 310 Hz
  - 600 Hz
  - 1 kHz
  - 3 kHz
  - 6 kHz
- Drag each vertical band from **-12 dB** to **+12 dB**
- EQ on/off switch
- Reset button
- Bass Boost preset
- Designed for desktop, iPhone, and Safari Mobile support

### 📱 Mobile-first interface

- Dark AMOLED-inspired UI
- Responsive layout for phones, tablets, and desktops
- Bottom navigation for quick access to:
  - 🏠 Home
  - ❤️ Favorites
  - 📁 Files
  - ⚙️ Settings
- Expandable mini player with full playback controls

---

## 🧭 Navigation

| Section | What it does |
|---|---|
| 🏠 **Home** | Browse tracks, albums, playlists, and artists |
| ❤️ **Favorites** | View all liked tracks |
| 📁 **Files** | Manage imported local media and move tracks to trash |
| ⚙️ **Settings** | Use the equalizer and manage deleted tracks, albums, and playlists |

---

## 🚀 Getting started

### 1. Clone the repository

```bash
git clone https://github.com/lxfx057/Audify.git
cd Audify
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## 🛠️ Production build

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

## 📁 Main project structure

```text
Audify/
├── app/
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx
├── components/
│   ├── MiniPlayer.jsx
│   └── PlayerShell.jsx
├── public/
├── package.json
└── README.md
```

| File | Purpose |
|---|---|
| `components/PlayerShell.jsx` | Main application interface, library, collections, equalizer, trash, import system |
| `components/MiniPlayer.jsx` | Bottom mini player and expanded playback screen |
| `app/globals.css` | Global styling and vertical EQ slider support |
| `app/page.jsx` | Main application entry point |
| `app/layout.jsx` | Global Next.js layout and metadata |

---

## 💾 Local storage

Audify is built with a privacy-first approach.

- Your imported files are saved locally through **IndexedDB**
- Favorites are saved in local browser storage
- Albums and playlists are saved locally in IndexedDB
- No music files are uploaded to an external server
- No account is required
- Clearing browser site data may remove your Audify library

> ⚠️ Important: Browser storage is local to the current browser and device. Export or keep a backup of your original media files.

---

## 🎚️ Equalizer guide

The equalizer changes the gain for specific frequency ranges.

| Band | Typical effect |
|---|---|
| `60 Hz` | Deep bass and sub-bass |
| `170 Hz` | Bass warmth and punch |
| `310 Hz` | Low-mid body |
| `600 Hz` | Midrange presence |
| `1 kHz` | Vocals and instruments |
| `3 kHz` | Clarity and attack |
| `6 kHz` | Brightness and detail |

### Controls

- Drag a band **up** to increase it
- Drag a band **down** to decrease it
- Tap **Reset** to return all bands to `0 dB`
- Tap **Bass Boost** for a bass-oriented preset
- Turn **EQ OFF** to bypass all equalizer settings

---

## 📲 iPhone and Safari

Audify is designed to work on mobile browsers, including Safari on iPhone.

For the best experience:

- Keep iOS and Safari updated
- Use the latest version of Safari where possible
- Drag directly on the center area of each equalizer band
- Allow audio playback after a user interaction, such as pressing Play

---

## 🗑️ Trash behavior

Deleted content is recoverable for up to **10 days**.

### Tracks

When a track is moved to trash:

- It is removed from the active library
- It is removed from Favorites
- It is removed from albums and playlists
- It can be restored from **Settings → Files trash**

### Albums and playlists

When an album or playlist is moved to trash:

- Only the collection is deleted
- Original tracks remain in the library
- The collection can be restored from **Settings → Albums & playlists trash**

---

## 🧩 Tech stack

- ⚛️ React
- ▲ Next.js
- 🎨 Tailwind CSS
- 🔊 Web Audio API
- 💾 IndexedDB
- 🗂️ LocalStorage
- 🎯 Lucide React icons

---

## 🔐 Privacy

Audify does not require a backend server for its core features.

Your music files, collection data, equalizer preferences, and favorites remain in your browser storage on your device. 🔒

---

## 🗺️ Future ideas

- [ ] Edit track metadata
- [ ] Custom album and playlist cover uploads
- [ ] Import/export playlists
- [ ] Audio waveform preview
- [ ] Recently played history
- [ ] Queue management
- [ ] Theme customization
- [ ] PWA offline installation
- [ ] Drag-and-drop sorting for playlists
- [ ] More equalizer presets

---

## 🤝 Contributing

Contributions, feature ideas, bug reports, and UI suggestions are welcome.

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Commit your work
5. Open a pull request

```bash
git checkout -b feature/your-feature-name
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

---

## 📄 License

This project is currently published without a license file.

If you want others to freely use, modify, and distribute the project, consider adding an MIT License.

---

## 👤 Author

Created by [@lxfx057](https://github.com/lxfx057)

⭐ If you like Audify, consider giving the repository a star!
