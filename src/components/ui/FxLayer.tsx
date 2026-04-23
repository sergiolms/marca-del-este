// Shared particle/stamp overlay. The stamp is now a big readable tile
// centered on the screen — the previous version was too subtle.

import { useEffect, useState } from "preact/hooks";
import { prefersReducedMotion } from "../../state/dice";

interface GridCell { label: string; value: string }

interface Stamp {
  id: string;
  value: string;
  sub?: string;
  kind: "normal" | "crit" | "fumble";
  grid?: GridCell[];
}

let stamps: Stamp[] = [];
let subscribers: Array<() => void> = [];

function pushStamp(stamp: Stamp, durBase: number) {
  stamps = [...stamps, stamp];
  subscribers.forEach(f => f());
  const dur = prefersReducedMotion() ? 400 : durBase;
  setTimeout(() => {
    stamps = stamps.filter(s => s.id !== stamp.id);
    subscribers.forEach(f => f());
  }, dur);
}

export const fx = {
  emitStamp(_rect: DOMRect | undefined, value: string, kind: "normal" | "crit" | "fumble" = "normal", sub?: string) {
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    pushStamp({ id, value, sub, kind }, kind === "crit" ? 1400 : 1200);
  },
  /** Renders a mini table inside the stamp. Each cell has a small header label
   *  and a big value — used for showing a full 3d6×6 ability generation at once. */
  emitGrid(entries: GridCell[], kind: "normal" | "crit" | "fumble" = "crit", sub?: string) {
    const id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    pushStamp({ id, value: "", sub, kind, grid: entries }, 1800);
  },
};

export function FxLayer() {
  const [, tick] = useState(0);
  useEffect(() => {
    const sub = () => tick(t => t + 1);
    subscribers.push(sub);
    return () => {
      subscribers = subscribers.filter(f => f !== sub);
    };
  }, []);

  return (
    <div class="fx-layer" aria-hidden="true">
      {stamps.map(s => {
        const labelOnly = !s.grid && !s.value && !!s.sub;
        return (
          <div key={s.id} class={`fx-stamp fx-stamp--${s.kind} ${s.grid ? "fx-stamp--grid" : ""} ${labelOnly ? "fx-stamp--label" : ""}`}>
            {s.grid ? (
              <div class="fx-stamp__grid">
                {s.grid.map(cell => (
                  <div class="fx-stamp__cell" key={cell.label}>
                    <span class="fx-stamp__cell-label">{cell.label}</span>
                    <span class="fx-stamp__cell-value">{cell.value}</span>
                  </div>
                ))}
              </div>
            ) : labelOnly ? (
              <span class="fx-stamp__label">{s.sub}</span>
            ) : s.value}
            {s.sub && !labelOnly && <span class="fx-stamp__sub">{s.sub}</span>}
          </div>
        );
      })}
    </div>
  );
}
