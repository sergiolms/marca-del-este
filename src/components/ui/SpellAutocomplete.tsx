import { useEffect, useMemo, useState } from "preact/hooks";

export interface CatalogSpellHit {
  id: string;
  name: string;
  tradition: "arcane" | "divine" | "druidic";
  level: number;
  range: string;
  duration: string;
  effect: string;
}

interface Props {
  value: string;
  placeholder?: string;
  onInput: (value: string) => void;
  onPick: (spell: CatalogSpellHit) => void;
}

export function SpellAutocomplete({ value, placeholder, onInput, onPick }: Props) {
  const [all, setAll] = useState<CatalogSpellHit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    import("../../data/catalog/spells.json").then(m => setAll(m.default as CatalogSpellHit[]));
  }, []);

  const results = useMemo(() => {
    const needle = normalizeSpellQuery(value);
    if (needle.length < 2) return [];
    return all
      .filter(s => normalize(s.name).includes(needle))
      .slice(0, 8);
  }, [all, value]);

  return (
    <div class="autocomp">
      <input
        value={value}
        placeholder={placeholder}
        onInput={e => {
          onInput((e.currentTarget as HTMLInputElement).value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {open && results.length > 0 && (
        <div class="autocomp__list">
          {results.map(s => (
            <button
              class="autocomp__item"
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onPick(s);
                setOpen(false);
              }}
            >
              <span class="autocomp__name">{s.name}</span>
              <span class="autocomp__meta">N{s.level} · {traditionLabel(s.tradition)} · {s.duration}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeSpellQuery(value: string): string {
  return normalize(value)
    .replace(/\bpergamino\b/g, "")
    .replace(/\bde\b/g, "")
    .replace(/\bnivel\s*\d+\b/g, "")
    .replace(/\bn\s*\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function traditionLabel(t: CatalogSpellHit["tradition"]): string {
  return t === "arcane" ? "Arcano" : t === "divine" ? "Divino" : "Druídico";
}
