import { useState } from "preact/hooks";
import type { Wallet } from "../../rules/types";
import { walletToGold } from "../../rules/wallet";
import { updateActive } from "../../state/store";
import { Coin, type CoinKind } from "./Coin";

interface Props { wallet: Wallet; }

type Col = { key: keyof Wallet; kind: CoinKind; full: string; sub: string; count: number };

const PILE_CAPACITY = 26;
const MAX_PILES = 3;

export function CoinStacks({ wallet }: Props) {
  const [editing, setEditing] = useState<keyof Wallet | null>(null);

  const cols: Col[] = [
    { key: "platinum", kind: "platinum", full: "Platino", sub: "PLT", count: wallet.platinum },
    { key: "gold",     kind: "gold",     full: "Oro",     sub: "ORO", count: wallet.gold },
    { key: "electrum", kind: "electrum", full: "Electro", sub: "EL",  count: wallet.electrum },
    { key: "silver",   kind: "silver",   full: "Plata",   sub: "PLA", count: wallet.silver },
    { key: "copper",   kind: "copper",   full: "Cobre",   sub: "COB", count: wallet.copper },
  ];

  const setCount = (k: keyof Wallet, n: number) => {
    updateActive(cc => ({ ...cc, money: { ...cc.money, [k]: Math.max(0, Math.floor(n)) } }));
  };

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
                  const baseY = piles.length * 2;
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
                            size={30}
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
                  onClick={() => setCount(c.key, c.count - 1)}
                  aria-label={`Quitar una moneda de ${c.full.toLowerCase()}`}
                >−</button>
                {isEditing ? (
                  <input
                    class="coin-col__input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    autofocus
                    value={c.count}
                    onChange={e => { setCount(c.key, Number((e.currentTarget as HTMLInputElement).value) || 0); setEditing(null); }}
                    onBlur={e => { setCount(c.key, Number((e.currentTarget as HTMLInputElement).value) || 0); setEditing(null); }}
                  />
                ) : (
                  <button class="coin-col__label" onClick={() => setEditing(c.key)} aria-label={`Editar ${c.full.toLowerCase()}`}>
                    {hasOverflow ? `×${c.count}` : `${c.count}`}
                  </button>
                )}
                <button
                  class="coin-step"
                  onClick={() => setCount(c.key, c.count + 1)}
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
  if (total === 2) return index === 0 ? 5 : -10;
  return [2, -13, 14][index] ?? 0;
}
