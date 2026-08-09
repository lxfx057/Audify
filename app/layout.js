import "../styles/globals.css";

export const metadata = {
  title: "Music Spotlight",
  description: "Dark music player with library, favorites, sharing and audio effects",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
