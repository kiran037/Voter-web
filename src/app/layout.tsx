// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Udaipur Voters",
  description: "Nagar Nigam Udaipur",
  // ⚠️ Do NOT put themeColor here in Next 15—use the viewport export below.
};

export const viewport: Viewport = {
  themeColor: "#ffffff",     // fixes the warning
  colorScheme: "light",      // tells UA to use light UI
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900`}>
        <Header />
        <main className="mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
