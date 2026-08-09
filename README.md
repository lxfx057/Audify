# 🎵 Music Spotlight

A sleek dark music player built with **Next.js** and ready for **Vercel**.  
It supports local media import, a real mini-player, favorites, queue management, equalizer controls, playback time, and MP4 thumbnails.

---

## ✨ Features

- 📱 Mobile-first dark UI inspired by premium music apps.
- 🎧 Import local **MP3** and **MP4** files from your device.
- 🖼️ Auto cover:
  - MP4 files generate a thumbnail from the video.
  - MP3 files get a random gradient cover.
- ▶️ Real playback controls in the mini-player.
- 💗 Favorite tracks with the heart button.
- ⏱️ Live playback timer with seek bar.
- 🎚️ Real equalizer with bass, mid, and treble controls.
- 🗂️ Queue management with:
  - custom order.
  - alphabetical order.
  - random order.
- 🗑️ Remove songs from the queue.
- 📚 Recent, favorite, and deleted sections.

---

## 🛠️ Tech Stack

- **Next.js**
- **React**
- **Tailwind CSS**
- **Web Audio API**
- **Vercel**

The equalizer uses the browser audio graph through `AudioContext.createMediaElementSource()`, which lets the media element be routed into the audio processing chain. [web:71][web:79][web:89]

---

## 🚀 Deployment

This project is designed to work well on **Vercel**.

### Deploy from GitHub
1. Push the project to a GitHub repository.
2. Open Vercel.
3. Click **New Project**.
4. Import your GitHub repository.
5. Keep the default settings.
6. Click **Deploy**.

Vercel automatically detects a standard Next.js app and uses the default build settings. [web:10][web:118]

---

## 📁 Project Structure

```text
app/
  layout.js
  page.js
components/
  MusicApp.jsx
  MiniPlayer.jsx
styles/
  globals.css
public/
package.json
next.config.js
tailwind.config.js
postcss.config.js
jsconfig.json
.gitignore
```

---

## 📱 Usage

- Tap **Importa file** to add MP3 or MP4 media.
- Tap a track to select it.
- Open the **mini-player** to control playback.
- Use the **heart** button to save favorites.
- Expand the mini-player to access:
  - playback seek bar.
  - equalizer.
  - playback controls.

---

## 🔍 Notes

- MP4 tracks use a generated thumbnail when possible.
- MP3 tracks use a random gradient cover.
- Playback time is managed with `currentTime`, `duration`, and `timeupdate`.
- The app is optimized for touch screens and mobile use.

---

## 🧩 Roadmap

- Drag and drop queue reordering.
- Local storage save/load.
- Cloud sync for favorites and queue.
- Better animated transitions.
- Lyrics panel.

---

## 📄 License

For personal use and customization.

If you want, I can also make it:

- shorter and more professional,
more aesthetic with badges,
or fully GitHub-ready with sections like

- Installation
- Contributing
- Credits.
