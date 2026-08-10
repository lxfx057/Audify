import "../styles/globals.css";

export const metadata = {
  title: "Audify",
  description: "Local music player with EQ and trash recovery",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
