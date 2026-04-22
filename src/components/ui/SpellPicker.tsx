import { useEffect, useMemo, useState } from "preact/hooks";
import { spellKey } from "../../rules/spellbook";
import { Icon } from "./Icon";

interface CatalogSpell {
  id: string;
  name: string;
  tradition: "arcane" | "divine" | "druidic";
  level: number;
  range: string;
  duration: string;
  effect: string;
}

interface Props {
  onPick: (s: CatalogSpell | null) => void;
  onCancel: () => void;
  filterTradition?: CatalogSpell["tradition"];
  allowedLevels?: number[];
  lockedToClassTable?: boolean;
  knownSpellKeys?: string[];
}

export function SpellPicker({ onPick, onCancel, filterTradition, allowedLevels, lockedToClassTable, knownSpellKeys }: Props) {
  const [all, setAll] = useState<CatalogSpell[] | null>(null);
  const [q, setQ] = useState("");
  const [tradition, setTradition] = useState<"all" | CatalogSpell["tradition"]>(filterTradition ?? "all");
  const [level, setLevel] = useState<number | "all">("all");
  const allowedSet = useMemo(() => allowedLevels ? new Set(allowedLevels) : null, [allowedLevels]);
  const knownSet = useMemo(() => new Set(knownSpellKeys ?? []), [knownSpellKeys]);
  const visibleLevels = allowedLevels ?? [1,2,3,4,5,6,7,8,9];

  useEffect(() => {
    // Dynamic import keeps the 340KB spells catalog out of the main bundle.
    import("../../data/catalog/spells.json").then(m => setAll(m.default as CatalogSpell[]));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    const needle = q.trim().toLowerCase();
    return all.filter(s => {
      if (tradition !== "all" && s.tradition !== tradition) return false;
      if (allowedSet && !allowedSet.has(s.level)) return false;
      if (knownSet.has(spellKey(s.name, s.level))) return false;
      if (level !== "all" && s.level !== level) return false;
      if (!needle) return true;
      return s.name.toLowerCase().includes(needle) || s.effect.toLowerCase().includes(needle);
    }).slice(0, 80);
  }, [all, q, tradition, level, allowedSet, knownSet]);

  return (
    <div class="picker-backdrop" onClick={onCancel}>
      <div class="picker" onClick={e => e.stopPropagation()}>
        <header class="picker__head">
          <h3>Elegir conjuro</h3>
          <button class="d20 d20--small" onClick={onCancel} aria-label="Cerrar"><Icon name="cancel" /></button>
        </header>
        <input
          class="picker__search"
          type="search"
          autofocus
          placeholder="Buscar…"
          value={q}
          onInput={e => setQ((e.currentTarget as HTMLInputElement).value)}
        />
        <div class="filter-chips picker__filters">
          {!lockedToClassTable && <span class={`filter-chip ${tradition === "all" ? "on" : ""}`} onClick={() => setTradition("all")}>Todo</span>}
          {(!lockedToClassTable || filterTradition === "arcane") && <span class={`filter-chip ${tradition === "arcane" ? "on" : ""}`} onClick={() => setTradition("arcane")}>Arcano</span>}
          {(!lockedToClassTable || filterTradition === "divine") && <span class={`filter-chip ${tradition === "divine" ? "on" : ""}`} onClick={() => setTradition("divine")}>Divino</span>}
          {(!lockedToClassTable || filterTradition === "druidic") && <span class={`filter-chip ${tradition === "druidic" ? "on" : ""}`} onClick={() => setTradition("druidic")}>Druídico</span>}
          {visibleLevels.map(n => (
            <span class={`filter-chip ${level === n ? "on" : ""}`} onClick={() => setLevel(level === n ? "all" : n)}>N{n}</span>
          ))}
        </div>

        <div class="picker__list">
          {!all && (
            <div style="padding:24px;text-align:center;color:var(--ink-muted);font-size:13px">Cargando conjuros…</div>
          )}
          {all && results.length === 0 && (
            <div style="padding:24px;text-align:center;color:var(--ink-muted);font-size:13px">
              {lockedToClassTable ? "Nada disponible en la tabla de conjuros actual." : "Nada encontrado."}
            </div>
          )}
          {results.map(s => (
            <button class="picker__item" key={s.id} onClick={() => onPick(s)}>
              <div class="picker__item-head">
                <span class="picker__item-name">{s.name}</span>
                <span class={`chip chip--${traditionChip(s.tradition)}`}>N{s.level} · {traditionLabel(s.tradition)}</span>
              </div>
              <div class="picker__item-meta">{s.range} · {s.duration}</div>
              <div class="picker__item-effect">{s.effect.slice(0, 140)}{s.effect.length > 140 ? "…" : ""}</div>
            </button>
          ))}
        </div>

        <footer class="picker__foot">
          <button class="chip btn-with-icon" disabled={lockedToClassTable && visibleLevels.length === 0} onClick={() => onPick(null)}><Icon name="add" />Crear vacío</button>
        </footer>
      </div>
    </div>
  );
}

function traditionLabel(t: CatalogSpell["tradition"]): string {
  return t === "arcane" ? "Arcano" : t === "divine" ? "Divino" : "Druídico";
}
function traditionChip(t: CatalogSpell["tradition"]): string {
  return t === "arcane" ? "magic" : t === "divine" ? "holy" : "cold";
}
