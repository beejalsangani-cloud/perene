import { iconTypeFromCode } from "@/lib/weather";

// Base cloud path (Feather icons cloud, 24×24 grid)
const CLOUD = "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z";

export default function WeatherIcon({ code = 0, className = "w-10 h-10" }) {
  const type = iconTypeFromCode(code);
  const base = { className, fill: "none", xmlns: "http://www.w3.org/2000/svg" };

  switch (type) {

    case "sun":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" fill="currentColor"/>
          <path
            d="M12 1v3M12 20v3M1 12h3M20 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          />
        </svg>
      );

    case "partly-cloudy":
      // Small sun top-right, cloud bottom-left (28×28 canvas)
      return (
        <svg {...base} viewBox="0 0 28 28">
          <circle cx="19" cy="7" r="3.5" fill="currentColor" opacity="0.8"/>
          <path
            d="M19 1.5v2M19 10.5v2M12.5 7h2M23.5 7h2M14.4 2.9l1.4 1.4M22.2 10.7l1.4 1.4M14.4 11.1l1.4-1.4M22.2 3.3l1.4-1.4"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"
          />
          {/* Shift the standard cloud path down-left to sit below the sun */}
          <g transform="translate(-1, 7)">
            <path d={CLOUD} fill="currentColor"/>
          </g>
        </svg>
      );

    case "cloud":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d={CLOUD} fill="currentColor"/>
        </svg>
      );

    case "fog":
      return (
        <svg {...base} viewBox="0 0 24 26">
          <path d={CLOUD} fill="currentColor" opacity="0.55"/>
          <path
            d="M4 22h16M6 25h12"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45"
          />
        </svg>
      );

    case "rain":
      return (
        <svg {...base} viewBox="0 0 24 28">
          <path d={CLOUD} fill="currentColor"/>
          <path
            d="M8 23l-1.5 4M12.5 22l-1.5 4M17 23l-1.5 4"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.65"
          />
        </svg>
      );

    case "snow":
      return (
        <svg {...base} viewBox="0 0 24 28">
          <path d={CLOUD} fill="currentColor"/>
          <circle cx="8"    cy="24.5" r="1.5" fill="currentColor" opacity="0.65"/>
          <circle cx="13"   cy="26"   r="1.5" fill="currentColor" opacity="0.65"/>
          <circle cx="17.5" cy="24"   r="1.5" fill="currentColor" opacity="0.65"/>
        </svg>
      );

    case "thunder":
      return (
        <svg {...base} viewBox="0 0 24 30">
          <path d={CLOUD} fill="currentColor"/>
          <path
            d="M14 20l-4 5h5l-3 6"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d={CLOUD} fill="currentColor"/>
        </svg>
      );
  }
}
