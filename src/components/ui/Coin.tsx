// A single SVG coin with metal gradient + rim + relief.
// Sized via the CSS var / prop. Color tokens via `kind`.

import type { JSX } from "preact";

export type CoinKind = "platinum" | "gold" | "electrum" | "silver" | "copper";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  kind: CoinKind;
  /** Edge-on view (for stacks). Renders as a thin ellipse. */
  edge?: boolean;
  size?: number;
}

const FACE_GRAD: Record<CoinKind, { light: string; mid: string; dark: string; rim: string }> = {
  platinum: { light: "#fbfcff", mid: "#cfd6e2", dark: "#8e99ad", rim: "#5b6579" },
  gold:     { light: "#ffe8a6", mid: "#d9a441", dark: "#8a6017", rim: "#5a3f0b" },
  electrum: { light: "#f5e0b5", mid: "#c59f58", dark: "#7d5d22", rim: "#4e390f" },
  silver:   { light: "#f5f6f8", mid: "#b7bcc4", dark: "#737880", rim: "#4b4e54" },
  copper:   { light: "#f6c8a5", mid: "#c07541", dark: "#7a401c", rim: "#4a230d" },
};

export function Coin({ kind, edge, size = 18, ...rest }: Props) {
  const g = FACE_GRAD[kind];
  if (edge) {
    // Thin ellipse seen from the side (used for stack interior)
    return (
      <div {...rest} style={`width:${size}px;height:${Math.max(3, Math.round(size * 0.28))}px;${rest.style ?? ""}`}>
        <svg viewBox="0 0 100 30" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id={`edge-${kind}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color={g.light} />
              <stop offset="45%" stop-color={g.mid} />
              <stop offset="100%" stop-color={g.dark} />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="15" rx="48" ry="10" fill={`url(#edge-${kind})`} stroke={g.rim} stroke-width="1.2" />
          <ellipse cx="50" cy="11" rx="36" ry="2" fill={g.light} opacity="0.45" />
        </svg>
      </div>
    );
  }
  return (
    <div {...rest} style={`width:${size}px;height:${size}px;${rest.style ?? ""}`}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <defs>
          <radialGradient id={`face-${kind}`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stop-color={g.light} />
            <stop offset="55%" stop-color={g.mid} />
            <stop offset="100%" stop-color={g.dark} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#face-${kind})`} stroke={g.rim} stroke-width="3" />
        {/* inner relief ring */}
        <circle cx="50" cy="50" r="34" fill="none" stroke={g.rim} stroke-width="1.2" opacity="0.45" />
        {/* glyph — a simple star/rune */}
        <path d="M50 32 L54 48 L70 48 L58 58 L62 74 L50 65 L38 74 L42 58 L30 48 L46 48 Z"
              fill={g.dark} opacity="0.45" />
        {/* specular highlight */}
        <ellipse cx="37" cy="34" rx="14" ry="8" fill={g.light} opacity="0.7" />
      </svg>
    </div>
  );
}
