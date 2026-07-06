import type { Metadata } from "next";
import { Suspense } from "react";
import { Barlow, Inter } from "next/font/google";
import { ListSheet } from "@/components/ListSheet";
import { getPoiCounts, getPoisByCategory } from "@/lib/data";
import "./globals.css";

// Barlow: a grotesque drawn from highway signage — display/headings.
// Inter: body and UI text.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MARTA Crawl",
    template: "%s | MARTA Crawl",
  },
  description:
    "An Atlanta city guide centered on the MARTA rail system — pick a station, find what's nearby.",
};

export default async function RootLayout({
  children,
  panel,
}: Readonly<{
  children: React.ReactNode;
  panel: React.ReactNode;
}>) {
  const [counts, poisByCategory] = await Promise.all([
    getPoiCounts(),
    getPoisByCategory(),
  ]);
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {panel}
        {/* useSearchParams inside ListSheet requires a Suspense boundary on
            prerendered pages, or `next build` fails (missing-suspense). */}
        <Suspense fallback={null}>
          <ListSheet counts={counts} poisByCategory={poisByCategory} />
        </Suspense>
      </body>
    </html>
  );
}
