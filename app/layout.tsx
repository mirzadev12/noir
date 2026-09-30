import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import { Shell } from "@/components/noir/Shell";
import "./globals.css";

/* Two faces, each with one job (their weights, widths and roles are set in
   app/globals.css, not here):
   Manrope        — every word: a geometric sans, heavy and tight for headings.
   JetBrains Mono — addresses, hashes and figures.
   Noto Sans Devanagari is a fallback only, for a unit or case reference typed
   in Hindi; Latin text never uses it and it is fetched only when needed. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});

const DESCRIPTION =
  "Attribute an unknown wallet to the nearest VASP in both directions — where the money went and who funded it — and send one consolidated request per VASP.";

export const metadata: Metadata = {
  title: { default: "NOIR — every wallet has a destination", template: "%s · NOIR" },
  description: DESCRIPTION,
  applicationName: "NOIR",
  openGraph: { type: "website", siteName: "NOIR", title: "NOIR — every wallet has a destination", description: DESCRIPTION, locale: "en_IN" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrains.variable} ${devanagari.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
