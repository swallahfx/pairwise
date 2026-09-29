import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/ui/NavBar";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk"
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex"
});

export const metadata: Metadata = {
  title: "Pairwize — Creator Marketplace",
  description: "Find creators who already cover your niche, with the rate up front.",
  icons: { icon: "/logo.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlex.variable}`}>
      <body className="font-body">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
