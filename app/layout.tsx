import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import { GlobalErrorBoundary } from "@/components/ErrorBoundary/GlobalErrorBoundary";

const dmSans = DM_Sans({
  variable:  "--font-sans",
  subsets:   ["latin"],
  weight:    ["300", "400", "500", "600", "700"],
  display:   "swap",
});

const lora = Lora({
  variable: "--font-serif",
  subsets:  ["latin"],
  weight:   ["400", "600", "700"],
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "Axis — Adaptive Fitness Intelligence",
  description: "Personalized training, powered by your biology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlobalErrorBoundary label="RootLayout">
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
