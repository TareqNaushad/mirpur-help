import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "মিরপুর সাহায্য — Mirpur Help",
  description:
    "আপনার কাছাকাছি বিনামূল্যে খাবার, চিকিৎসা, আশ্রয় ও সরকারি সহায়তা খুঁজুন। Find free food, medical care, shelter & govt help near you in Mirpur, Dhaka.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1d8a4e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
