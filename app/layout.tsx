import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",          // enables safe-area-inset on iOS
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  title: "Voce",
  description: "Capture your voice. Build your brand.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Voce",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans bg-[#FAFAF8] text-[#0F172A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
