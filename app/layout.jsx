import RegisterSW from "@/components/RegisterSW";
import "../styles/globals.css";

export const metadata = {
  title: "Audify",
  description: "Local music player with EQ and trash recovery",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Audify",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
