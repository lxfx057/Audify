import "../styles/globals.css";

export const metadata = {
  title: "Music Cloud",
  description: "Local music player with equalizer and trash recovery",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
