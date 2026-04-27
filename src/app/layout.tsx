import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ayo — Joy, Live.",
  description:
    "Ticketed live streams for African artists, live bands, and creative groups. One ticket, one device — every show is yours.",
  openGraph: {
    title: "Ayo — Joy, Live.",
    description: "African stages, ticketed live.",
    url: "https://ayo.live",
    siteName: "Ayo",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-stage-black text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
