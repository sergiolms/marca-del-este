import { useEffect } from "preact/hooks";
import { activeCharacter, updateActive } from "../state/store";
import { abilityModifier, formatModifier } from "../rules/modifier";
import { computeXpInfo } from "../rules/xp";
import { xpTableFor, hitProgressionFor, classByKey, savesFor } from "../rules/classLookup";
import { IdentityEditor } from "../components/ui/IdentityEditor";
import { SealButton } from "../components/ui/SealButton";
import { roll, haptic } from "../state/dice";
import { uid } from "../state/character";
import { entry } from "../state/timeline";
import { fx } from "../components/ui/FxLayer";
import type { StatKey, Stats } from "../rules/types";
import { Icon } from "../components/ui/Icon";
import { syncAutoEffects } from "../rules/autofill";

const STAT_ROWS: Array<{ key: StatKey; label: string; full: string }> = [
  { key: "strength",     label: "FUE", full: "Fuerza" },
  { key: "dexterity",    label: "DES", full: "Destreza" },
  { key: "constitution", label: "CON", full: "Constitución" },
  { key: "intelligence", label: "INT", full: "Inteligencia" },
  { key: "wisdom",       label: "SAB", full: "Sabiduría" },
  { key: "charisma",     label: "CAR", full: "Carisma" },
];

const SAVE_ROWS: Array<{ key: keyof import("../rules/types").Saves; label: string }> = [
  { key: "breath", label: "Aliento" },
  { key: "death", label: "Muerte" },
  { key: "paralysis", label: "Parálisis" },
  { key: "wands", label: "Varas" },
  { key: "spells", label: "Conjuros" },
];

export function SheetScreen() {
  const c = activeCharacter.value;
  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;

  const xpTable = xpTableFor(c.character.classKey);
  const xp = computeXpInfo(xpTable, c.xp.current);

  useEffect(() => {
    if (c.xp.autoLevel && c.character.level !== xp.level) {
      updateActive(cc => {
        const next = { ...cc, character: { ...cc.character, level: xp.level } };
        const published = savesFor(cc.character.classKey, xp.level);
        if (published) next.saves = { ...published };
        return next;
      });
    }
  }, [c.xp.autoLevel, c.xp.current, c.character.classKey, c.character.level, xp.level]);

  const cls = classByKey(c.character.classKey);
  const hitLine = hitProgressionFor(c.character.classKey, c.character.level);

  useEffect(() => {
    updateActive(cc => syncAutoEffects(cc));
  }, [c.character.classKey, c.character.level]);

  /** 3d6 — classic OSR ability generation. */
  const rollAbility = () => {
    const rolls = [
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ];
    return { rolls, total: rolls[0] + rolls[1] + rolls[2] };
  };

  /** Tap the 3d6 icon on a stat card → roll 3d6 and set the stat to that value. */
  const rollStat = (key: StatKey, label: string, full: string) => (e: MouseEvent) => {
    const r = rollAbility();
    haptic("medium");
    updateActive(cc => ({
      ...cc,
      stats: { ...cc.stats, [key]: r.total },
      combat: {
        ...cc.combat,
        timeline: [
          entry(`${full} 3d6 → <b>${r.total}</b> (${r.rolls.join("+")}) — fijado en ${label}`, "normal"),
          ...cc.combat.timeline,
        ].slice(0, 30),
      },
    }));
    fx.emitStamp((e.currentTarget as HTMLElement).getBoundingClientRect(), String(r.total), "normal", `${full} 3d6`);
  };

  const rerollAllStats = () => {
    haptic("crit");
    const newStats: Stats = { ...c.stats };
    const lines: string[] = [];
    for (const s of STAT_ROWS) {
      const r = rollAbility();
      newStats[s.key] = r.total;
      lines.push(`${s.label} ${r.total}`);
    }
    updateActive(cc => ({
      ...cc,
      stats: newStats,
      combat: {
        ...cc.combat,
        timeline: [
          entry(`🎲 Generación de características: ${lines.join(" · ")}`, "normal"),
          ...cc.combat.timeline,
        ].slice(0, 30),
      },
    }));
    fx.emitGrid(
      STAT_ROWS.map(s => ({ label: s.label, value: String(newStats[s.key]) })),
      "crit",
      "3d6 × 6",
    );
  };

  const rollSave = (saveKey: keyof import("../rules/types").Saves, label: string) => (e: MouseEvent) => {
    const target = c.saves[saveKey];
    const result = roll({ count: 1, sides: 20 });
    const success = result.total >= target;
    haptic(result.crit ? "crit" : "medium");
    updateActive(cc => ({
      ...cc,
      combat: {
        ...cc.combat,
        timeline: [
          entry(`Salv. ${label} → ${result.total} vs ${target} <b>${success ? "✓" : "✗"}</b>`, success ? "normal" : "fumble"),
          ...cc.combat.timeline,
        ].slice(0, 30),
      },
    }));
    fx.emitStamp((e.currentTarget as HTMLElement).getBoundingClientRect(), String(result.total), result.crit ? "crit" : result.fumble ? "fumble" : "normal", `Salv. ${label}`);
  };

  const autoEffectsFor = (kind: string) => c.effects.filter(e => e.kind === kind);
  // Class-as-race means automatic abilities come from the selected class only.
  const allEffects = c.effects.filter(e => e.kind !== "Rasgo racial");

  return (
    <div class={`scroll sheet sheet--${c.character.classKey || "neutral"}`}>
      <IdentityEditor character={c} />

      <section class="section">
        <div class="xp-bar">
          <div class="xp-bar__head">
            <span class="xp-bar__label">Experiencia</span>
            <span class="xp-bar__count">
              <b>{c.xp.current.toLocaleString("es-ES")}</b>
              {xp.nextThreshold !== null ? ` / ${xp.nextThreshold.toLocaleString("es-ES")}` : " · máximo"}
            </span>
          </div>
          <div class="xp-bar__track">
            <div class="xp-bar__fill" style={{ width: `${xp.progressPct}%` }} />
          </div>
          {cls && (
            <div class="xp-bar__foot">
              <span>Nivel <b>{c.character.level}</b></span>
              <span>·</span>
              <span>PG <b>{hitLine}</b></span>
              <span>·</span>
              <span>{cls.hitDie}</span>
            </div>
          )}
        </div>
      </section>

      <section class="section">
        <div class="section__header">
          <h2 class="section__title" style="margin:0;flex:0 0 auto">Características</h2>
          <div style="display:flex;gap:6px;align-items:center">
            <button
              class={`chip btn-with-icon stats-lock ${c.statsLocked ? "stats-lock--on" : ""}`}
              onClick={() => updateActive(cc => ({ ...cc, statsLocked: !cc.statsLocked }))}
              aria-label={c.statsLocked ? "Desbloquear características" : "Bloquear características"}
              title={c.statsLocked ? "Características bloqueadas — pulsa para desbloquear" : "Pulsa para bloquear características"}
            >
              <Icon name={c.statsLocked ? "lock" : "unlock"} />{c.statsLocked ? "Bloqueado" : "Bloquear"}
            </button>
            {!c.statsLocked && (
              <button class="chip btn-with-icon" onClick={rerollAllStats} aria-label="Generar las seis características con 3d6">
                <Icon name="d20" />Generar 3d6×6
              </button>
            )}
          </div>
        </div>
        <div class="stats-grid">
          {STAT_ROWS.map(s => {
            const v = c.stats[s.key];
            const m = abilityModifier(v);
            return (
              <div class={`card stat stat--card ${c.statsLocked ? "stat--locked" : ""}`} key={s.key}>
                <span class="stat__label" title={s.full}>{s.label}</span>
                {c.statsLocked ? (
                  <span class="stat__value" style="font-size:22px">{v}</span>
                ) : (
                  <input
                    type="number"
                    class="stat__value stat__value-input"
                    value={v}
                    inputMode="numeric"
                    min="1"
                    max="25"
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(25, Number((e.currentTarget as HTMLInputElement).value) || 1));
                      updateActive(cc => ({ ...cc, stats: { ...cc.stats, [s.key]: n } }));
                    }}
                    aria-label={s.full}
                  />
                )}
                <span class={`stat__mod ${m > 0 ? "stat__mod--plus" : m < 0 ? "stat__mod--minus" : ""}`}>
                  {formatModifier(m)}
                  {!c.statsLocked && <SealButton small onClick={rollStat(s.key, s.label, s.full)} ariaLabel={`Tira 3d6 para ${s.full} y fija el valor`}>3d6</SealButton>}
                </span>
              </div>
            );
          })}
        </div>
        <div class="hint">{c.statsLocked ? "Características bloqueadas. Desbloquea para editar." : <>Al pulsar <b>3d6</b> en un atributo se lanza y el valor queda fijado.</>}</div>
      </section>

      <section class="section">
        <h2 class="section__title">Salvaciones</h2>
        <div class="saves">
          {SAVE_ROWS.map(s => (
            <div class="card save" key={s.key}>
              <span class="save__label">{s.label}</span>
              <input
                type="number"
                class="save__value save__value-input"
                value={c.saves[s.key]}
                inputMode="numeric"
                onChange={(e) => {
                  const n = Number((e.currentTarget as HTMLInputElement).value) || 0;
                  updateActive(cc => ({ ...cc, saves: { ...cc.saves, [s.key]: n } }));
                }}
                aria-label={`Valor salvación ${s.label}`}
              />
              <SealButton onClick={rollSave(s.key, s.label)} ariaLabel={`Tira salvación ${s.label}`}>d20</SealButton>
            </div>
          ))}
        </div>
      </section>

      {autoEffectsFor("Habilidad de clase").length > 0 && (
        <section class="section">
          <h2 class="section__title">Habilidades de clase</h2>
          <div class="card" style="padding:6px 4px">
            {autoEffectsFor("Habilidad de clase").map(e => (
              <div class="ability-line" key={e.id}>
                <Icon name="shield" />
                <span>{e.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section class="section">
        <h2 class="section__title">Efectos activos</h2>
        <div class="card" style="padding:6px 4px">
          {allEffects.length === 0 && (
            <div style="padding:12px;text-align:center;color:var(--ink-muted);font-size:13px">Sin efectos activos.</div>
          )}
          {allEffects.map(ef => (
            ef.locked ? (
              <div class="effect" key={ef.id}>
                <div class="effect__ico"><Icon name="magic" /></div>
                <div>
                  <div class="effect__title">{ef.name}</div>
                  <div class="effect__sub">{ef.kind}{ef.duration ? ` · ${ef.duration}` : ""}</div>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="d20 d20--small" onClick={() => updateActive(cc => ({ ...cc, effects: cc.effects.map(e => e.id === ef.id ? { ...e, locked: false } : e) }))} aria-label={`Editar ${ef.name}`}><Icon name="edit" /></button>
                  <button class="d20 d20--small" onClick={() => updateActive(cc => ({ ...cc, effects: cc.effects.filter(e => e.id !== ef.id) }))} aria-label={`Eliminar ${ef.name}`}><Icon name="trash" /></button>
                </div>
              </div>
            ) : (
              <div class="card" key={ef.id} style="margin:6px 4px;box-shadow:none">
                <div class="edit-grid">
                  <label style="grid-column:span 2">
                    <span>Nombre</span>
                    <input value={ef.name}
                      onInput={e => updateActive(cc => ({ ...cc, effects: cc.effects.map(x => x.id === ef.id ? { ...x, name: (e.currentTarget as HTMLInputElement).value } : x) }))}
                    />
                  </label>
                  <label>
                    <span>Tipo</span>
                    <input value={ef.kind}
                      onInput={e => updateActive(cc => ({ ...cc, effects: cc.effects.map(x => x.id === ef.id ? { ...x, kind: (e.currentTarget as HTMLInputElement).value } : x) }))}
                    />
                  </label>
                  <label>
                    <span>Duración</span>
                    <input value={ef.duration}
                      onInput={e => updateActive(cc => ({ ...cc, effects: cc.effects.map(x => x.id === ef.id ? { ...x, duration: (e.currentTarget as HTMLInputElement).value } : x) }))}
                    />
                  </label>
                  <label style="grid-column:span 2">
                    <span>Notas</span>
                    <input value={ef.notes}
                      onInput={e => updateActive(cc => ({ ...cc, effects: cc.effects.map(x => x.id === ef.id ? { ...x, notes: (e.currentTarget as HTMLInputElement).value } : x) }))}
                    />
                  </label>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                  <button class="chip btn-with-icon" onClick={() => updateActive(cc => ({ ...cc, effects: cc.effects.filter(e => e.id !== ef.id) }))}><Icon name="trash" />Eliminar</button>
                  <button class="buy-btn btn-with-icon" style="background:var(--success);box-shadow:0 2px 0 #244a2e" onClick={() => updateActive(cc => ({ ...cc, effects: cc.effects.map(e => e.id === ef.id ? { ...e, locked: true } : e) }))}><Icon name="save" />Guardar</button>
                </div>
              </div>
            )
          ))}
          <button
            class="dash-btn btn-with-icon"
            onClick={() => updateActive(cc => ({
              ...cc,
              effects: [...cc.effects, { id: uid(), locked: false, active: true, name: "Nuevo efecto", kind: "Aura", duration: "", notes: "" }],
            }))}
          ><Icon name="add" />Añadir efecto personalizado</button>
        </div>
      </section>

      <div style="height:80px"></div>
    </div>
  );
}
