/** @type {import('tailwindcss').Config} */
// NativeWind v4 requires Tailwind CSS v3 (kept as a nested dep in this app,
// independent of the web app's Tailwind v4). Brand palette mirrors
// @perene/shared/brand so class names like `bg-forest` map to the real hex.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        forest: "#2A3D2E",
        cream: "#F5F1E8",
        lime: "#C4E552",
        "lime-bright": "#D4F562",
        gold: "#C9A87C",
      },
      fontFamily: {
        // Names must match the font keys loaded via useFonts in app/_layout.tsx
        display: ["PlayfairDisplay_700Bold"],
        "display-regular": ["PlayfairDisplay_400Regular"],
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
