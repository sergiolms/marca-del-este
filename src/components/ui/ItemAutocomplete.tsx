// Live autocomplete from the shop catalog. Used when typing a new inventory
// item's name — lets the user auto-fill weight / damage / ranged / value.

import { useEffect, useMemo, useState } from "preact/hooks";
import shopCatalog from "../../data/catalog/shopItems.json";
import magicCatalog from "../../data/catalog/magicItems.json";
import type { MagicItem, ShopItem } from "../../data/catalog/types";

export type InventoryAutocompleteItem = ShopItem & {
  source?: "mundane" | "potion";
  magicKind?: MagicItem["kind"];
};

const POTIONS: InventoryAutocompleteItem[] = (magicCatalog as MagicItem[])
  .filter(it => it.kind === "potion")
  .map(it => ({
    id: `magic-${it.id}`,
    name: it.name,
    category: "Equipo",
    cost: it.cost,
    weight: 0,
    notes: [it.effect, it.notes].filter(Boolean).join("\n"),
    source: "potion",
    magicKind: it.kind,
  }));

const ALL: InventoryAutocompleteItem[] = [
  ...(shopCatalog as ShopItem[]).map(it => ({ ...it, source: "mundane" as const })),
  ...POTIONS,
];

const SEARCH_STOPWORDS = new Set(["a", "con", "de", "del", "el", "en", "la", "las", "los", "para", "por", "y"]);

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTokens(value: string): string[] {
  return normalizeSearch(value)
    .split(/\s+/)
    .filter(token => token.length > 1 && !SEARCH_STOPWORDS.has(token));
}

function searchableText(it: InventoryAutocompleteItem): string {
  return normalizeSearch([
    it.name,
    it.id.replace(/-/g, " "),
    it.category,
    it.damage,
    it.armorClass,
    it.cost,
    it.notes,
    it.ranged ? "distancia proyectil arco ballesta arrojadiza" : "",
    it.twoHanded ? "dos manos dos manos arma grande arma pesada mandoble" : "",
    it.source === "potion" ? "pocion potion" : "",
  ].filter(Boolean).join(" "));
}

export function findAutocompleteMatches(query: string, limit = 6): InventoryAutocompleteItem[] {
  const needle = normalizeSearch(query);
  const tokens = searchTokens(query);
  if (!needle || needle.length < 2 || tokens.length === 0) return [];

  return ALL
    .map(it => {
      const haystack = searchableText(it);
      const name = normalizeSearch(it.name);
      const nameTokens = searchTokens(it.name);
      const fullMatch = haystack.includes(needle);
      const queryContainsWholeName = nameTokens.length > 0 && nameTokens.every(token => tokens.includes(token));
      const coveredTokens = tokens.filter(token => haystack.includes(token)).length;
      const startsWith = name.startsWith(tokens[0] ?? "");
      const score =
        (fullMatch ? 100 : 0) +
        (queryContainsWholeName ? 80 : 0) +
        (startsWith ? 12 : 0) +
        coveredTokens * 8 -
        Math.max(0, nameTokens.length - coveredTokens);
      return { it, score };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name, "es"))
    .slice(0, limit)
    .map(row => row.it);
}

interface Props {
  value: string;
  onInput: (v: string) => void;
  onPick: (it: InventoryAutocompleteItem) => void;
  placeholder?: string;
}

export function ItemAutocomplete({ value, onInput, onPick, placeholder }: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [focused, value]);

  const matches = useMemo(() => {
    return findAutocompleteMatches(draft);
  }, [draft]);

  const show = focused && matches.length > 0;

  return (
    <div class="autocomp">
      <input
        value={draft}
        placeholder={placeholder}
        onInput={e => {
          const next = (e.currentTarget as HTMLInputElement).value;
          setDraft(next);
          onInput(next);
        }}
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
              onClick={() => { setDraft(it.name); onPick(it); setFocused(false); }}
            >
              <span class="autocomp__name">{it.name}</span>
              <span class="autocomp__meta">
                {it.source === "potion" && <>Poción · </>}
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
