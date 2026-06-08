/**
 * Perene wordmark — the "P" is set in Italiana (ornamental serif),
 * scaled ~1.3× relative to the surrounding text. "erene" stays in
 * Playfair Display regular. Pass `className` for size / colour / spacing.
 */
export default function Wordmark({ className = "", italic = false }) {
  return (
    <span className={`inline-flex items-baseline tracking-tight ${className}`}>
      <span
        style={{
          fontFamily: "var(--font-italiana)",
          fontSize: "1.3em",
          fontWeight: 400,
          fontStyle: italic ? "italic" : "normal",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        P
      </span>
      <span
        style={{
          fontFamily: "var(--font-playfair)",
          fontWeight: 700,
          fontStyle: italic ? "italic" : "normal",
        }}
      >
        erene
      </span>
    </span>
  );
}
