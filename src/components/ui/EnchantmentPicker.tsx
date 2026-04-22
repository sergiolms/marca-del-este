// Chip-input picker for weapon/armor/shield enchantments.
// Reads src/data/catalog/enchantments.json and enforces the +N cap of 5.

import { useMemo, useState } from "preact/hooks";
import enchantsCatalog from "../../data/catalog/enchantments.json";
import type { Enchantment, EnchantmentTarget } from "../../data/catalog/types";
import { Icon } from "./Icon";

const ALL = enchantsCatalog as Enchantment[];

interface Props {
  target: EnchantmentTarget;        // weapon | armor | shield
  value: string[];                  // current enchantment ids on the item
  onChange: (next: string[]) => void;
  label?: string;
}

/** Number of "+1-equivalent" slots a given enchantment id consumes (default 1). */
function slotCost(e: Enchantment): number {
  return e.bonus ?? 1;
}

export function EnchantmentPicker({ target, value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(ALL.map(e => [e.id, e])), []);

  const applied = value.map(id => byId.get(id)).filter((x): x is Enchantment => !!x);
  const usedSlots = applied.reduce((n, e) => n + slotCost(e), 0);
  const remainingSlots = Math.max(0, 5 - usedSlots);

  const candidates = useMemo(() => {
    return ALL.filter(e => e.appliesTo.includes(target))
      .filter(e => !value.includes(e.id))
      .filter(e => slotCost(e) <= remainingSlots || remainingSlots === 0);
  }, [target, value, remainingSlots]);

  const add = (e: Enchantment) => {
    if (slotCost(e) > remainingSlots) return;
    onChange([...value, e.id]);
    setOpen(false);
  };
  const remove = (id: string) => onChange(value.filter(v => v !== id));

  return (
    <div class="ench">
      <div class="ench__head">
        <span class="ench__label">{label ?? "Encantamientos"}</span>
        <span class="ench__slots" title="Cada encantamiento numérico ocupa tantos espacios como su bonif. (+1..+5). Los rasgos con nombre ocupan 1.">
          {usedSlots}/5
        </span>
      </div>
      <div class="ench__chips">
        {applied.length === 0 && <span class="ench__empty">Sin encantamientos</span>}
        {applied.map(e => (
          <button class={`chip ${e.bonus ? "chip--plus" : "chip--magic"}`} key={e.id} onClick={() => remove(e.id)} title={`${e.name} · ${e.effect}`}>
            {e.name}<Icon name="cancel" />
          </button>
        ))}
        {remainingSlots > 0 && (
          <button class="chip btn-with-icon ench__add" onClick={() => setOpen(true)}>
            <Icon name="add" />Añadir
          </button>
        )}
      </div>

      {open && (
        <div class="picker-backdrop" onClick={() => setOpen(false)}>
          <div class="picker" onClick={e => e.stopPropagation()} style="height:70vh">
            <header class="picker__head">
              <h3>Añadir encantamiento</h3>
              <button class="d20 d20--small" onClick={() => setOpen(false)} aria-label="Cerrar"><Icon name="cancel" /></button>
            </header>
            <div class="picker__list">
              {candidates.length === 0 && (
                <div style="padding:24px;text-align:center;color:var(--ink-muted);font-size:13px">
                  Sin encantamientos disponibles (quedan {remainingSlots} espacios).
                </div>
              )}
              {candidates.map(e => (
                <button class="picker__item" key={e.id} onClick={() => add(e)}>
                  <div class="picker__item-head">
                    <span class="picker__item-name">{e.name}</span>
                    <span class="chip">+{slotCost(e)} · {e.costDelta}</span>
                  </div>
                  <div class="picker__item-effect">{e.effect}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
