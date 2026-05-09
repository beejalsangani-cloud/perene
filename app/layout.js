import { Playfair_Display, Inter, Italiana } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const italiana = Italiana({
  variable: "--font-italiana",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Perene — Your Personal AI Stylist",
  description:
    "AI-powered personal styling for every event and occasion. Upload your wardrobe, enter your event, get the perfect outfit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${italiana.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
