// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AppToaster from "@/components/ui/Toaster";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Udaipur Voters",
  description: "Nagar Nigam Udaipur",
  // Note: themeColor belongs in `viewport` for Next 15+
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900`}
      >
        <Header />
        {/* Keep page-level padding inside each page for better mobile control */}
        <main className="w-full">{children}</main>
        {/* Global toast portal */}
        <AppToaster />
      </body>
    </html>
  );
}
