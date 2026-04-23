import { useEffect, useRef, useState } from "preact/hooks";
import type { Wallet } from "../../rules/types";
import { walletToGold } from "../../rules/wallet";
import { updateActive } from "../../state/store";
import { Coin, type CoinKind } from "./Coin";

interface Props { wallet: Wallet; }

type Col = { key: keyof Wallet; kind: CoinKind; full: string; sub: string; count: number };

const PILE_CAPACITY = 34;
const MAX_PILES = 4;

export function CoinStacks({ wallet }: Props) {
  const [editing, setEditing] = useState<keyof Wallet | null>(null);
  const [draft, setDraft] = useState("");
  const repeatRef = useRef<{ timer: number; startedAt: number } | null>(null);

  const cols: Col[] = [
    { key: "gold",     kind: "gold",     full: "Oro",     sub: "ORO", count: wallet.gold },
    { key: "silver",   kind: "silver",   full: "Plata",   sub: "PLATA", count: wallet.silver },
    { key: "copper",   kind: "copper",   full: "Cobre",   sub: "COBRE", count: wallet.copper },
  ];
  const hiddenCoins = wallet.platinum + wallet.electrum;

  const setCount = (k: keyof Wallet, n: number) => {
    updateActive(cc => ({ ...cc, money: { ...cc.money, [k]: Math.max(0, Math.floor(n)) } }));
  };
  const addCount = (k: keyof Wallet, delta: number) => {
    updateActive(cc => ({ ...cc, money: { ...cc.money, [k]: Math.max(0, Math.floor((cc.money[k] ?? 0) + delta)) } }));
  };
  const startEdit = (k: keyof Wallet, value: number) => {
    setDraft(String(value));
    setEditing(k);
  };
  const commitEdit = (k: keyof Wallet) => {
    setCount(k, Number(draft) || 0);
    setEditing(null);
  };
  const stopRepeat = () => {
    if (!repeatRef.current) return;
    window.clearTimeout(repeatRef.current.timer);
    repeatRef.current = null;
  };
  const startRepeat = (key: keyof Wallet, direction: 1 | -1) => (e: PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    stopRepeat();
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const unit = elapsed > 3400 ? 100 : elapsed > 2100 ? 10 : elapsed > 1050 ? 5 : 1;
      addCount(key, direction * unit);
      const delay = elapsed > 3400 ? 70 : elapsed > 2100 ? 95 : elapsed > 1050 ? 125 : 240;
      repeatRef.current = { startedAt, timer: window.setTimeout(tick, delay) };
    };
    tick();
  };

  useEffect(() => stopRepeat, []);

  return (
    <>
      <div class="card coins">
        {cols.map(c => {
          const piles = splitPiles(c.count);
          const hasOverflow = c.count > 14;
          const isEditing = editing === c.key;
          return (
            <div class="coin-col" key={c.key}>
              <div class="coin-col__stack" aria-hidden="true">
                {piles.map((pile, pileIndex) => {
                  const pileX = pileOffset(pileIndex, piles.length);
                  const baseY = piles.length * 5 + pileIndex * 1.5;
                  const seedBase = c.key.length * 17 + pileIndex * 53;
                  return (
                    <div key={`pile-${pileIndex}`} class={`coin-pile coin-pile--${pileIndex}`} style={`--pile-x:${pileX}px;--pile-y:${baseY}px;--pile-z:${pile.z};`}>
                      {Array.from({ length: pile.count }).map((_, i) => {
                        const seed = seedBase + i * 31;
                        const x = ((seed % 9) - 4) * 0.34;
                        const r = ((seed % 17) - 8) * 0.65;
                        const y = i * 4.2 + (seed % 2);
                        const fall = Math.min(560, (pile.start + i) * 28);
                        return (
                          <Coin
                            key={`edge-${i}`}
                            class="coin-piece coin-piece--edge"
                            kind={c.kind}
                            edge
                            size={34}
                            style={`--x:${x}px;--r:${r}deg;--fall-delay:${fall}ms;bottom:${y}px;`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div class="coin-col__controls">
                <button
                  class="coin-step"
                  disabled={c.count <= 0}
                  onPointerDown={startRepeat(c.key, -1)}
                  onPointerUp={stopRepeat}
                  onPointerCancel={stopRepeat}
                  onPointerLeave={stopRepeat}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addCount(c.key, -1);
                    }
                  }}
                  aria-label={`Quitar una moneda de ${c.full.toLowerCase()}`}
                >−</button>
                {isEditing ? (
                  <input
                    class="coin-col__input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    autofocus
                    value={draft}
                    onInput={e => setDraft((e.currentTarget as HTMLInputElement).value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") commitEdit(c.key);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    onBlur={() => commitEdit(c.key)}
                  />
                ) : (
                  <button class="coin-col__label" onClick={() => startEdit(c.key, c.count)} aria-label={`Editar ${c.full.toLowerCase()}`}>
                    {hasOverflow ? `×${c.count}` : `${c.count}`}
                  </button>
                )}
                <button
                  class="coin-step"
                  onPointerDown={startRepeat(c.key, 1)}
                  onPointerUp={stopRepeat}
                  onPointerCancel={stopRepeat}
                  onPointerLeave={stopRepeat}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addCount(c.key, 1);
                    }
                  }}
                  aria-label={`Añadir una moneda de ${c.full.toLowerCase()}`}
                >+</button>
              </div>
              <div class="coin-col__sub">{c.sub}</div>
            </div>
          );
        })}
      </div>
      <div class="coins-total">
        Total ≈ <b>{walletToGold(wallet).toFixed(2)} mo</b>
        {hiddenCoins > 0 && <span> · otras monedas: {hiddenCoins}</span>}
      </div>
    </>
  );
}

function splitPiles(count: number): Array<{ count: number; start: number; z: number }> {
  const visible = Math.min(count, PILE_CAPACITY * MAX_PILES);
  const piles: Array<{ count: number; start: number; z: number }> = [];
  for (let start = 0; start < visible; start += PILE_CAPACITY) {
    piles.push({
      count: Math.min(PILE_CAPACITY, visible - start),
      start,
      z: 30 - piles.length,
    });
  }
  return piles;
}

function pileOffset(index: number, total: number): number {
  if (total <= 1) return 0;
  if (total === 2) return index === 0 ? 9 : -12;
  if (total === 3) return [0, -20, 20][index] ?? 0;
  return [-5, -25, 16, 32][index] ?? 0;
}
