import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Mijn woonplan Frankrijk | Infofrankrijk",
  description: "Verken passende plaatsen, bepaal uw woningwensen en bereid uw zoektocht en bezichtigingen voor. Een woonroute van Infofrankrijk.",
  robots: { index: false, follow: false }
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="nl"><body>{children}</body></html>;
}
