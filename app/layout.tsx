import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Navbar } from "@/components/ui/navbar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mon Tracker",
  description: "Personal finance tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-background text-foreground min-h-screen`}>
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
