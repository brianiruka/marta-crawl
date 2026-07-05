import type { Metadata } from "next";
import { Barlow, Inter } from "next/font/google";
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

export default function RootLayout({
  children,
  panel,
}: Readonly<{
  children: React.ReactNode;
  panel: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {panel}
      </body>
    </html>
  );
}
