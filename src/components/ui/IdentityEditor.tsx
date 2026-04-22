import { useState } from "preact/hooks";
import type { Character } from "../../rules/types";
import { updateActive } from "../../state/store";
import { allClasses, classByKey, lineageForClass, savesFor } from "../../rules/classLookup";
import { syncClassEffects } from "../../rules/autofill";
import { Icon } from "./Icon";

const ALIGNMENTS = [
  "Legal Bueno",
  "Neutral Bueno",
  "Caótico Bueno",
  "Legal Neutral",
  "Neutral",
  "Caótico Neutral",
  "Legal Malvado",
  "Neutral Malvado",
  "Caótico Malvado",
] as const;

interface Props { character: Character; }

export function IdentityEditor({ character: c }: Props) {
  const [open, setOpen] = useState(false);

  const patch = (fn: (cc: Character) => Character) => updateActive(fn);

  const setClass = (key: string) => {
    const def = classByKey(key);
    const lineage = lineageForClass(key);
    patch(cc => {
      const next: Character = {
        ...cc,
        character: {
          ...cc.character,
          classKey: key,
          className: def?.name ?? "",
          raceKey: lineage.raceKey,
          race: lineage.race,
          movement: lineage.movement ?? cc.character.movement,
        },
        combat: { ...cc.combat, hitDice: def ? `${def.hitDie} · ${cc.character.level}` : cc.combat.hitDice },
      };
      // Auto-apply rulebook saving throws for the new class at the current level.
      const published = savesFor(key, next.character.level);
      if (published) next.saves = { ...published };
      return syncClassEffects(next);
    });
  };

  const setLevel = (level: number) => {
    patch(cc => {
      const next: Character = { ...cc, character: { ...cc.character, level } };
      const published = savesFor(cc.character.classKey, level);
      if (published) next.saves = { ...published };
      return next;
    });
  };
  const classAccentKey = c.character.classKey || "guerrero";
  const classAccent = `var(--class-${classAccentKey})`;

  return (
    <div class="identity">
      <div class="identity__head">
        <div class="identity__name-row">
          <input
            class="identity__name"
            value={c.character.name}
            placeholder="Nombre del aventurero"
            onInput={e => patch(cc => ({ ...cc, character: { ...cc.character, name: (e.currentTarget as HTMLInputElement).value } }))}
          />
          <button
            class="chip btn-with-icon identity__toggle"
            aria-expanded={open}
            aria-label={open ? "Cerrar perfil" : "Editar perfil"}
            onClick={() => setOpen(o => !o)}
          >
            <Icon name="edit" />
            {open ? "Cerrar" : "Perfil"}
          </button>
        </div>

        <div class="identity__meta">
          <span class="hero__badge" style={{ background: classAccent }}>
            {c.character.className || "Sin clase"}
          </span>
          {c.character.race && (
            <>
              <span class="identity__dot">·</span>
              <span>{c.character.race}</span>
            </>
          )}
          <span class="identity__dot">·</span>
          <span>{c.character.alignment || "Neutral"}</span>
        </div>
      </div>

      {open && (
        <div class="identity__form">
          <div class="edit-grid">
            <label>
              <span>Jugador</span>
              <input value={c.character.player}
                onInput={e => patch(cc => ({ ...cc, character: { ...cc.character, player: (e.currentTarget as HTMLInputElement).value } }))}
              />
            </label>
            <label>
              <span>Nivel</span>
              <input type="number" min="1" max="36" inputMode="numeric" value={c.character.level}
                onChange={e => {
                  const n = Math.max(1, Math.min(36, Number((e.currentTarget as HTMLInputElement).value) || 1));
                  setLevel(n);
                }}
              />
            </label>
            <label>
              <span>Clase / raza</span>
              <select value={c.character.classKey} onChange={e => setClass((e.currentTarget as HTMLSelectElement).value)}>
                <option value="">— Elegir —</option>
                {allClasses().map(k => (
                  <option value={k.key}>{k.name}{k.advanced ? " ✦" : ""}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Alineamiento</span>
              <select value={c.character.alignment} onChange={e => patch(cc => ({ ...cc, character: { ...cc.character, alignment: (e.currentTarget as HTMLSelectElement).value as Character["character"]["alignment"] } }))}>
                <option value="">—</option>
                {ALIGNMENTS.map(a => <option value={a}>{a}</option>)}
              </select>
            </label>
            <label>
              <span>Movimiento</span>
              <input value={c.character.movement}
                onInput={e => patch(cc => ({ ...cc, character: { ...cc.character, movement: (e.currentTarget as HTMLInputElement).value } }))}
              />
            </label>
            <label style="grid-column:span 2">
              <span>Idiomas</span>
              <input value={c.character.languages}
                onInput={e => patch(cc => ({ ...cc, character: { ...cc.character, languages: (e.currentTarget as HTMLInputElement).value } }))}
              />
            </label>
            <label>
              <span>PX actuales</span>
              <input type="number" min="0" inputMode="numeric" value={c.xp.current}
                onChange={e => patch(cc => ({ ...cc, xp: { ...cc.xp, current: Math.max(0, Number((e.currentTarget as HTMLInputElement).value) || 0) } }))}
              />
            </label>
            <label class="edit-check">
              <input type="checkbox" checked={c.xp.autoLevel}
                onChange={e => patch(cc => ({ ...cc, xp: { ...cc.xp, autoLevel: (e.currentTarget as HTMLInputElement).checked } }))}
              />
              <span>Nivel automático</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
