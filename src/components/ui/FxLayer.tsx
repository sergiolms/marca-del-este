// Shared particle/stamp overlay. The stamp is now a big readable tile
// centered on the screen — the previous version was too subtle.

import { useEffect, useState } from "preact/hooks";
import { prefersReducedMotion } from "../../state/dice";

interface Stamp {
  id: string;
  value: string;
  sub?: string;
  kind: "normal" | "crit" | "fumble";
}

let stamps: Stamp[] = [];
let subscribers: Array<() => void> = [];

export const fx = {
  emitStamp(_rect: DOMRect | undefined, value: string, kind: "normal" | "crit" | "fumble" = "normal", sub?: string) {
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    stamps = [...stamps, { id, value, sub, kind }];
    subscribers.forEach(f => f());
    const dur = prefersReducedMotion() ? 400 : kind === "crit" ? 1400 : 1200;
    setTimeout(() => {
      stamps = stamps.filter(s => s.id !== id);
      subscribers.forEach(f => f());
    }, dur);
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
      {stamps.map(s => (
        <div key={s.id} class={`fx-stamp fx-stamp--${s.kind}`}>
          {s.value}
          {s.sub && <span class="fx-stamp__sub">{s.sub}</span>}
        </div>
      ))}
    </div>
  );
}
