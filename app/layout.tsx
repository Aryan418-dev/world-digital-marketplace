import type { Metadata } from "next";
import "./globals.css";
import "./branding.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "WORLD — Digital Real Estate Marketplace",
  description:
    "Own a piece of the digital world. Buy exclusive digital ownership of countries, states, and cities on an interactive global map.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
