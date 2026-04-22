// Live autocomplete from the shop catalog. Used when typing a new inventory
// item's name — lets the user auto-fill weight / damage / ranged / value.

import { useMemo, useState } from "preact/hooks";
import shopCatalog from "../../data/catalog/shopItems.json";
import type { ShopItem } from "../../data/catalog/types";

const ALL = shopCatalog as ShopItem[];

interface Props {
  value: string;
  onInput: (v: string) => void;
  onPick: (it: ShopItem) => void;
  placeholder?: string;
}

export function ItemAutocomplete({ value, onInput, onPick, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    if (!needle || needle.length < 2) return [];
    return ALL.filter(it => it.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [value]);

  const show = focused && matches.length > 0;

  return (
    <div class="autocomp">
      <input
        value={value}
        placeholder={placeholder}
        onInput={e => onInput((e.currentTarget as HTMLInputElement).value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {show && (
        <div class="autocomp__list">
          {matches.map(it => (
            <button
              class="autocomp__item"
              key={it.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onPick(it); setFocused(false); }}
            >
              <span class="autocomp__name">{it.name}</span>
              <span class="autocomp__meta">
                {it.damage && <>{it.damage} · </>}
                {it.armorClass && <>CA {it.armorClass} · </>}
                {it.weight !== null && <>{it.weight} kg · </>}
                {it.cost}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
