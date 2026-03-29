import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ออมด้วยกัน",
  description: "วางแผนการเงินด้วยกัน",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#FAFAF8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon-180.png" />
      </head>
      <body
        className={geist.className}
        style={{
          background: "#FAFAF8",
          color: "#1C1C1A",
          minHeight: "100vh",
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
