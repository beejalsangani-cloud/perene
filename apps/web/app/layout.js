import { Playfair_Display, Inter, Italiana } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";
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
  applicationName: "Perene",
  // iOS PWA behaviour — emits apple-mobile-web-app-capable: yes,
  // apple-mobile-web-app-title: Perene, and the default status-bar style.
  appleWebApp: {
    capable: true,
    title: "Perene",
    statusBarStyle: "default",
  },
  // Next 16 emits only the modern `mobile-web-app-capable` from
  // appleWebApp.capable. Older iOS still needs the apple-prefixed tag to launch
  // standalone, so emit it explicitly too (harmless on modern iOS).
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  // Icons served by app/icons/[size]/route.js. icon → browser tab,
  // apple → iOS home-screen touch icons.
  icons: {
    icon: [{ url: "/icons/192", sizes: "192x192", type: "image/png" }],
    apple: [
      { url: "/icons/180", sizes: "180x180", type: "image/png" },
      { url: "/icons/152", sizes: "152x152", type: "image/png" },
    ],
  },
};

// themeColor lives in the viewport export in Next 16 (forest green to match the
// brand and the manifest). background_color stays in the manifest.
export const viewport = {
  themeColor: "#2A3D2E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${italiana.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
