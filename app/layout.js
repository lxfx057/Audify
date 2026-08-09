import "../styles/globals.css";

export const metadata = {
  title: "Music Spotlight",
  description: "Dark music player with queue, favorites and effects",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
