import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

// Display face for TOTW titles, counts, badge numbers and post tags.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Vokamsbulary 13",
  description: "Personal English vocabulary feed, grouped by Team of the Week.",
  // iOS home-screen app (11.1). The manifest (app/manifest.ts) covers Android
  // and desktop; the apple-touch-icon comes from app/apple-icon.png.
  appleWebApp: {
    capable: true,
    title: "Vokams 13",
    // Black bar above the page: the app background is near-black, and the
    // content stays below the bar (no safe-area padding needed).
    statusBarStyle: "black",
  },
  // Next only writes the standard `mobile-web-app-capable`; older iOS versions
  // open full screen only with Apple's own tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
