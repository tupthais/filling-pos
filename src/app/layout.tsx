import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#12382e",
};

export const metadata: Metadata = {
  title: "Filling POS — ร้านอาหาร",
  description: "ระบบขายหน้าร้าน จัดการโต๊ะ และส่งครัวสำหรับร้านอาหารไทย",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Filling POS",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f7f4] text-[#1a2d24] select-none font-sans">
        {children}
      </body>
    </html>
  );
}
