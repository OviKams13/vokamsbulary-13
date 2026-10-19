import { useId } from "react";

type TotwBadgeSize = "sm" | "md" | "lg";

const WIDTH: Record<TotwBadgeSize, number> = { sm: 36, md: 48, lg: 64 };

type TotwBadgeProps = {
  /** TOTW number shown inside the shield. */
  number: number;
  size?: TotwBadgeSize;
  /** Gold glow, used for the current TOTW. */
  glow?: boolean;
  className?: string;
};

// Shield outline (viewBox 100 × 152, shield starts at y = 27 under the "TOTW" label).
// Shape taken from the brand shield: chamfered top corners, a V notch in the
// middle of the top edge, and a long pointed bottom.
const OUTER = "0,38 9,27 36,27 50,32.5 64,27 91,27 100,38 100,126 50,152 0,126";
const INNER = "7,41 14,34 36.5,34 50,39.5 63.5,34 86,34 93,41 93,122 50,144 7,122";

/**
 * Team of the Week badge (X-08): a black-and-gold shield drawn in SVG, with a
 * dynamic number. Not an image.
 */
export function TotwBadge({ number, size = "md", glow = false, className }: TotwBadgeProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const width = WIDTH[size];
  const digits = String(number).length;
  const fontSize = digits === 1 ? 64 : digits === 2 ? 50 : 38;

  return (
    <svg
      role="img"
      aria-label={`TOTW ${number}`}
      viewBox="0 0 100 152"
      width={width}
      height={(width * 152) / 100}
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 7px rgb(232 184 75 / 0.6))" } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fbe29a" />
          <stop offset="0.55" stopColor="#c9952e" />
          <stop offset="1" stopColor="#f0c75e" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1d21" />
          <stop offset="1" stopColor="#0b0b0c" />
        </linearGradient>
        <pattern
          id={`${id}-stripes`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-50)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <polygon points={OUTER} />
        </clipPath>
      </defs>

      {/* "TOTW" label above the shield */}
      <text
        x="50"
        y="17"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="20"
        letterSpacing="2"
        fill="#e8b84b"
      >
        TOTW
      </text>
      <rect x="27" y="21" width="46" height="1.5" fill="#e8b84b" opacity="0.6" />

      {/* Shield */}
      <polygon points={OUTER} fill={`url(#${id}-fill)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="27" width="100" height="125" fill={`url(#${id}-stripes)`} />
        <line
          x1="4"
          y1="140"
          x2="100"
          y2="44"
          stroke="#e8b84b"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      </g>
      <polygon
        points={INNER}
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeOpacity="0.7"
        strokeWidth="1.3"
      />
      <polygon
        points={OUTER}
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="5"
        strokeLinejoin="miter"
      />

      {/* Number */}
      <text
        x="50"
        y="86"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize={fontSize}
        fill="#fbe29a"
      >
        {number}
      </text>
    </svg>
  );
}
