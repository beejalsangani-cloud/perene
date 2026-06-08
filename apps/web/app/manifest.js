// Web App Manifest — makes Perene installable to the home screen.
// Next auto-injects <link rel="manifest" href="/manifest.webmanifest"> into
// <head> because this file exists. start_url is /dashboard so launching from
// the home screen drops the user straight into the app (it redirects to /login
// client-side if there's no session). Colors match the brand tokens in
// globals.css. Icons are served by app/icons/[size]/route.js.

export default function manifest() {
  return {
    name: "Perene",
    short_name: "Perene",
    description: "AI styling for your daily ritual",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F1E8",
    theme_color: "#2A3D2E",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Separate maskable entries (don't combine "any maskable" on one icon —
      // browsers treat the whole icon as maskable then, cropping the corners).
      // These have extra padding so Android's circular crop never clips the mark.
      { src: "/icons/maskable/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
