import { activeCharacter, updateActive } from "../state/store";
import { HpBar } from "../components/ui/HpBar";
import { Timeline } from "../components/ui/Timeline";
import { SealButton } from "../components/ui/SealButton";
import { EditableStat } from "../components/ui/EditableStat";
import { clampHp, applyLongRest, applyShortRest, totalCarriedWeight } from "../rules/combat";
import { parseDamageExpr, parseBonus, roll, haptic } from "../state/dice";
import { fx } from "../components/ui/FxLayer";
import { uid } from "../state/character";
import { entry } from "../state/timeline";
import { Icon } from "../components/ui/Icon";
import { attackStatMod, damageStatMod, inferAttackStats, enchantmentBonus, enchantmentLabels } from "../rules/attackMath";
import { formatModifier } from "../rules/modifier";
import { isDerivedAttack, unequipFromAttack } from "../rules/equip";
import { EnchantmentPicker } from "../components/ui/EnchantmentPicker";
import { acBonusLabel, acValue, calculateArmorClass, setBaseArmorClass, type AcMode } from "../rules/armorClass";
import { automaticMagicAbilities } from "../rules/magicAbilities";
import type { Attack } from "../rules/types";

export function CombatScreen() {
  const c = activeCharacter.value;
  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;
  const ac = calculateArmorClass(c);
  const acMode = c.combat.acMode ?? "descending";
  const acInputValue = acMode === "ascending" ? c.combat.acAscending : c.combat.ac;
  const acModeLabel = acMode === "ascending" ? "ascendente" : "descendente";
  const preparedSpells = c.spells.filter(s => s.prepared);
  const classPowers = automaticMagicAbilities(c.effects)
    .filter(a => a.kind === "power" && a.effect.usesPerDay !== undefined)
    .map(a => a.effect);
  const carryWeight = totalCarriedWeight(c.inventory.items);
  const isHeavy = carryWeight > c.inventory.maxWeight * 0.75;
  const movement = movementInfo(c.character.movement, isHeavy);

  const onHp = (delta: number) => {
    haptic(delta < 0 ? "heavy" : "light");
    updateActive(cc => {
      let hpCurrent = cc.combat.hpCurrent + delta;
      let hpTemp = cc.combat.hpTemp;
      if (delta < 0 && hpTemp > 0) {
        const absorbed = Math.min(hpTemp, -delta);
        hpTemp -= absorbed;
        hpCurrent = cc.combat.hpCurrent - (-delta - absorbed);
      }
      return {
        ...cc,
        combat: {
          ...cc.combat,
          hpCurrent: clampHp(hpCurrent, cc.combat.hpMax, hpTemp),
          hpTemp,
          timeline: [
            entry(delta < 0 ? `Daño <b>${-delta}</b> PG` : `Curación <b>+${delta}</b> PG`, delta < 0 ? "damage" : "heal"),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      };
    });
  };

  const onLongRest = () => {
    haptic("heavy");
    const dusk = document.createElement("div");
    dusk.className = "dusk-overlay";
    document.body.appendChild(dusk);
    window.setTimeout(() => dusk.classList.add("is-on"), 30);
    window.setTimeout(() => dusk.classList.remove("is-on"), 1400);
    window.setTimeout(() => dusk.remove(), 2000);

    updateActive(cc => {
      const after = applyLongRest(cc);
      return {
        ...after,
        combat: {
          ...after.combat,
          timeline: [
            entry("🌙 Descanso largo — PG al máximo, hechizos recuperados", "heal"),
            ...after.combat.timeline,
          ].slice(0, 30),
        },
      };
    });
  };

  const onShortRest = () => {
    haptic("medium");
    updateActive(cc => {
      const { next, rolled, recovered } = applyShortRest(cc);
      return {
        ...next,
        combat: {
          ...next.combat,
          timeline: [
            entry(`☕ Descanso corto — 1d6=${rolled} + CON → <b>+${recovered} PG</b>`, "heal"),
            ...next.combat.timeline,
          ].slice(0, 30),
        },
      };
    });
    fx.emitStamp(undefined, `+${1}`, "normal", "Descanso corto");
  };

  const useClassPower = (effectId: string) => {
    const power = c.effects.find(e => e.id === effectId);
    if (!power?.usesPerDay) return;
    const spent = (power.usesToday ?? 0) >= power.usesPerDay;
    haptic(spent ? "light" : "medium");
    updateActive(cc => ({
      ...cc,
      effects: cc.effects.map(e => {
        if (e.id !== effectId || e.usesPerDay === undefined) return e;
        if (spent) return { ...e, usesToday: 0 };
        return { ...e, usesToday: Math.min(e.usesPerDay, (e.usesToday ?? 0) + 1) };
      }),
      combat: {
        ...cc.combat,
        timeline: [
          entry(spent ? `↺ Recuperado: <b>${power.name}</b>` : `✦ Poder activado: <b>${power.name}</b>`, spent ? "heal" : "normal"),
          ...cc.combat.timeline,
        ].slice(0, 30),
      },
    }));
    if (!spent) fx.emitStamp(undefined, "", "normal", power.name);
  };

  const castPreparedSpell = (spellId: string) => {
    const spell = c.spells.find(s => s.id === spellId);
    if (!spell?.prepared) return;
    const wasUsed = spell.used;
    haptic(wasUsed ? "light" : "medium");
    updateActive(cc => ({
      ...cc,
      spells: cc.spells.map(s => s.id === spellId ? { ...s, used: !s.used } : s),
      combat: {
        ...cc.combat,
        timeline: [
          entry(wasUsed ? `↺ Recuperado: <b>${spell.name}</b> (N${spell.level})` : `✦ Conjuro lanzado: <b>${spell.name}</b> (N${spell.level})`, wasUsed ? "heal" : "normal"),
          ...cc.combat.timeline,
        ].slice(0, 30),
      },
    }));
    if (!wasUsed) fx.emitStamp(undefined, "", "normal", `${spell.name} · N${spell.level}`);
  };

  const rollAttack = (attackId: string, kind: "atk" | "dmg") => (e: MouseEvent) => {
    const att = c.combat.attacks.find(a => a.id === attackId);
    if (!att) return;
    const cardEl = (e.currentTarget as HTMLElement).closest(".attack-card") as HTMLElement | null;
    cardEl?.classList.add("is-rolling");
    window.setTimeout(() => cardEl?.classList.remove("is-rolling"), 700);

    if (kind === "atk") {
      const classBonus = parseBonus(att.bonus);
      const statMod = attackStatMod(att, c.stats);
      const enchMod = enchantmentBonus(att.enchantments);
      const totalMod = classBonus + statMod + enchMod;
      const result = roll({ count: 1, sides: 20, modifier: totalMod });
      haptic(result.crit ? "crit" : result.fumble ? "heavy" : "medium");
      if (result.crit) cardEl?.classList.add("is-crit");
      if (result.fumble) cardEl?.classList.add("is-fumble");
      window.setTimeout(() => { cardEl?.classList.remove("is-crit"); cardEl?.classList.remove("is-fumble"); }, 900);

      const statStr = att.attackStat === "strength" ? "FUE" : att.attackStat === "dexterity" ? "DES" : null;
      const parts = [`1d20=${result.rolls[0]}${formatModifier(classBonus)}`];
      if (statMod !== 0 && statStr) parts.push(`${formatModifier(statMod)} ${statStr}`);
      if (enchMod !== 0) parts.push(`${formatModifier(enchMod)} encant.`);
      const breakdown = ` (${parts.join(" ")})`;

      updateActive(cc => ({
        ...cc,
        combat: {
          ...cc.combat,
          timeline: [
            entry(`⚔ ${att.name} → <b>${result.total}</b>${breakdown}${result.crit ? " — <b>¡Crítico!</b>" : result.fumble ? " — <b>pifia</b>" : ""}`, result.crit ? "crit" : result.fumble ? "fumble" : "normal"),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      }));
      fx.emitStamp(undefined, String(result.total), result.crit ? "crit" : result.fumble ? "fumble" : "normal", `Ataque · ${att.name}`);
    } else {
      const spec = parseDamageExpr(att.damage);
      if (!spec) return;
      const statMod = damageStatMod(att, c.stats);
      const enchMod = enchantmentBonus(att.enchantments);
      const result = roll({ ...spec, modifier: (spec.modifier ?? 0) + statMod + enchMod });
      haptic("heavy");

      const statStr = att.damageStat === "strength" ? "FUE" : att.damageStat === "dexterity" ? "DES" : null;
      const parts: string[] = [att.damage];
      if (statMod !== 0 && statStr) parts.push(`${formatModifier(statMod)} ${statStr}`);
      if (enchMod !== 0) parts.push(`${formatModifier(enchMod)} encant.`);
      const breakdown = parts.length > 1 ? ` (${parts.join(" ")})` : "";

      updateActive(cc => ({
        ...cc,
        combat: {
          ...cc.combat,
          timeline: [
            entry(`Daño ${att.damage} → <b>${result.total}</b>${breakdown}`, "damage"),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      }));
      fx.emitStamp(undefined, String(result.total), "normal", `Daño · ${att.name}`);
    }
  };

  const addAttack = () => {
    const inferred = inferAttackStats("cuerpo");
    updateActive(cc => ({
      ...cc,
      combat: {
        ...cc.combat,
        attacks: [
          ...cc.combat.attacks,
          {
            id: uid(), locked: false, name: "Nuevo ataque",
            bonus: cc.combat.attackBonus || "+0",
            damage: "1d6", range: "cuerpo", notes: "",
            attackStat: inferred.attackStat,
            damageStat: inferred.damageStat,
          },
        ],
      },
    }));
  };

  const deleteAttack = (id: string) => {
    updateActive(cc => {
      const atk = cc.combat.attacks.find(a => a.id === id);
      if (atk && isDerivedAttack(atk)) {
        // Derived attack: unequip the item instead of deleting.
        return unequipFromAttack(cc, id);
      }
      return { ...cc, combat: { ...cc.combat, attacks: cc.combat.attacks.filter(a => a.id !== id) } };
    });
  };

  const toggleLock = (id: string) => {
    updateActive(cc => ({
      ...cc,
      combat: { ...cc.combat, attacks: cc.combat.attacks.map(a => a.id === id ? { ...a, locked: !a.locked } : a) },
    }));
  };

  const patchAttack = (id: string, p: Partial<Attack>) => updateActive(cc => ({
    ...cc,
    combat: { ...cc.combat, attacks: cc.combat.attacks.map(x => x.id === id ? { ...x, ...p } : x) },
  }));

  const setCombat = <K extends keyof typeof c.combat>(k: K, v: (typeof c.combat)[K]) => {
    updateActive(cc => ({ ...cc, combat: { ...cc.combat, [k]: v } }));
  };
  const setAcMode = (mode: AcMode) => {
    updateActive(cc => ({ ...cc, combat: setBaseArmorClass(cc.combat, mode === "ascending" ? cc.combat.acAscending : cc.combat.ac, mode) }));
  };
  const setAcBase = (value: number) => {
    updateActive(cc => ({ ...cc, combat: setBaseArmorClass(cc.combat, value, cc.combat.acMode ?? "descending") }));
  };

  return (
    <div class="scroll">
      <section class="section" style="margin-top:12px">
        <HpBar hpCurrent={c.combat.hpCurrent} hpMax={c.combat.hpMax} hpTemp={c.combat.hpTemp} onAdjust={onHp} />
        <div class="hp-meta">
          <label class="hp-meta__row">
            <span>PG máx.</span>
            <input type="number" inputMode="numeric" min="1" value={c.combat.hpMax}
              onChange={e => {
                const n = Math.max(1, Number((e.currentTarget as HTMLInputElement).value) || 1);
                setCombat("hpMax", n);
              }}
            />
          </label>
          <label class="hp-meta__row">
            <span>PG temp.</span>
            <input type="number" inputMode="numeric" min="0" value={c.combat.hpTemp}
              onChange={e => {
                const n = Math.max(0, Number((e.currentTarget as HTMLInputElement).value) || 0);
                setCombat("hpTemp", n);
              }}
            />
          </label>
        </div>
      </section>

      <section class="section">
        <div class="card move-card">
          <div>
            <span class="stat__label">Desplazamiento disponible</span>
            <div class="move-card__value">{movement.metersLabel}</div>
          </div>
          <div class="move-card__grid">
            <Icon name="open" />
            <span>{movement.squaresLabel}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="combat-stats">
          <div class="card ac-editor">
            <div class="stat__label">CA base</div>
            <div class="ac-editor__row">
              <div class="ac-mode" role="group" aria-label="Modo de clase de armadura">
                <button class={acMode === "descending" ? "on" : ""} onClick={() => setAcMode("descending")}>Desc</button>
                <button class={acMode === "ascending" ? "on" : ""} onClick={() => setAcMode("ascending")}>Asc</button>
              </div>
              <input
                aria-label="Editar CA base"
                type="number"
                inputMode="numeric"
                value={acInputValue}
                onChange={e => setAcBase(Number((e.currentTarget as HTMLInputElement).value) || 0)}
              />
            </div>
            <div class="ac-editor__mirror">Modo {acModeLabel}</div>
          </div>

          <div class="card ac-result">
            <span class="stat__label">CA calculada</span>
            <span class="ac-result__value">{acValue(ac.calculated, acMode)}</span>
            <span class="ac-result__meta">
              {ac.armorSource ? ac.armorSource : "Sin armadura"}
              {ac.totalBonus > 0 ? ` · ${acBonusLabel(ac.totalBonus, acMode)}` : ""}
            </span>
          </div>

          <EditableStat label="Iniciativa" value={c.combat.initiative} small
            onCommit={v => setCombat("initiative", v)} />
          <EditableStat label="BA" value={c.combat.attackBonus} small
            onCommit={v => setCombat("attackBonus", v)} />
        </div>
        {(ac.armorSource || ac.bonuses.length > 0) && (
          <div class="ac-breakdown">
            <span>Base {acValue(ac.base, acMode)}</span>
            {ac.armorSource && <span>Armadura: {ac.armorSource} → {acValue(ac.armorBase, acMode)}</span>}
            {ac.bonuses.map(b => <span>{b.source}: {acBonusLabel(b.bonus, acMode)}</span>)}
          </div>
        )}
      </section>

      {(preparedSpells.length > 0 || classPowers.length > 0) && (
        <section class="section">
          <h2 class="section__title">Conjuros y poderes</h2>
          {classPowers.map(p => {
            const used = p.usesToday ?? 0;
            const max = p.usesPerDay ?? 0;
            const spent = used >= max;
            return (
              <div class={`card spell-card combat-spell ${spent ? "spell-card--used" : "card--lift"}`} key={p.id}>
                <div class="combat-spell__main">
                  <div class="spell-card__ico"><Icon name="magic" /></div>
                  <div>
                    <div class="spell-card__title">{p.name}</div>
                    <div class="spell-card__meta">
                      Poder de clase · {used} / {max} usos hoy
                    </div>
                  </div>
                </div>
                <button
                  class="buy-btn btn-with-icon"
                  onClick={() => useClassPower(p.id)}
                  aria-label={spent ? `Recuperar ${p.name}` : `Activar ${p.name}`}
                  title={spent ? "Pulsa para recuperar manualmente" : "Gastar un uso"}
                >
                  <Icon name={spent ? "rest" : "magic"} />
                  {spent ? "Recuperar" : "Usar"}
                </button>
              </div>
            );
          })}
          {preparedSpells.map(s => (
            <div class={`card spell-card combat-spell ${s.used ? "spell-card--used" : "card--lift"}`} key={s.id}>
              <div class="combat-spell__main">
                <div class="spell-card__ico"><Icon name="magic" /></div>
                <div>
                  <div class="spell-card__title">{s.name}</div>
                  <div class="spell-card__meta">
                    Nivel {s.level}{s.duration ? ` · ${s.duration}` : ""}{s.used ? " · usado hoy" : ""}
                  </div>
                  {s.notes && <div class="spell-card__notes">{s.notes}</div>}
                </div>
              </div>
              <button
                class="buy-btn btn-with-icon"
                onClick={() => castPreparedSpell(s.id)}
                aria-label={s.used ? `Recuperar ${s.name}` : `Lanzar ${s.name}`}
                title={s.used ? "Pulsa para recuperar manualmente" : "Lanzar (gastar hoy)"}
              >
                <Icon name={s.used ? "rest" : "magic"} />
                {s.used ? "Recuperar" : "Lanzar"}
              </button>
            </div>
          ))}
        </section>
      )}

      <section class="section">
        <h2 class="section__title">Ataques</h2>
        {c.combat.attacks.length === 0 && (
          <div class="card" style="padding:16px;text-align:center;color:var(--ink-muted);font-size:13px">
            Sin ataques aún — añade tu primera arma.
          </div>
        )}
        {c.combat.attacks.map(a => {
          const atkStat = a.attackStat ?? inferAttackStats(a.range).attackStat;
          const dmgStat = a.damageStat ?? inferAttackStats(a.range).damageStat;
          const atkMod = attackStatMod(a, c.stats);
          const dmgMod = damageStatMod(a, c.stats);
          const enchMod = enchantmentBonus(a.enchantments);
          const atkTotal = parseBonus(a.bonus) + atkMod + enchMod;
          const derived = isDerivedAttack(a);
          const enchLabels = enchantmentLabels(a.enchantments);
          return (
            a.locked ? (
              <div class={`card attack-card ${derived ? "attack-card--derived" : ""}`} key={a.id} style="margin-top:8px">
                <div class="attack">
                  <div>
                    <div class="attack__title">
                      <Icon name="sword" /> {a.name}
                      {derived && <span class="chip chip--magic" style="padding:1px 6px;font-size:10px" title="Ataque proveniente de una arma equipada">Equipada</span>}
                      {enchLabels.map(label => <span class="chip chip--plus" style="padding:1px 6px;font-size:10px">{label}</span>)}
                    </div>
                    <div class="attack__stats" style="margin-top:4px">
                      <span>Atq total <b>{formatModifier(atkTotal)}</b></span>
                      <span>Daño <b>{a.damage}{dmgMod + enchMod !== 0 ? ` ${formatModifier(dmgMod + enchMod)}` : ""}</b></span>
                      <span>{a.range}</span>
                    </div>
                    {a.notes && <div class="attack__notes clamp-3">{a.notes}</div>}
                  </div>
                  <div class="attack__roll">
                    <SealButton onClick={rollAttack(a.id, "atk")} ariaLabel={`Ataque con ${a.name}`}>Atq</SealButton>
                    <SealButton variant="damage" onClick={rollAttack(a.id, "dmg")} ariaLabel={`Daño con ${a.name}`}>Dmg</SealButton>
                    <button class="d20 d20--small" onClick={() => toggleLock(a.id)} aria-label={`Editar ${a.name}`}><Icon name="edit" /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div class="card" key={a.id} style="margin-top:8px">
                {derived && (
                  <div class="hint" style="margin:0 0 8px">
                    Ataque derivado del arma equipada. Los cambios de <b>nombre / daño / alcance</b>
                    se editan desde la mochila.
                  </div>
                )}
                <div class="edit-grid">
                  <label>
                    <span>Nombre</span>
                    <input value={a.name} disabled={derived} onInput={e => patchAttack(a.id, { name: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>Bono de clase</span>
                    <input value={a.bonus} inputMode="numeric" onInput={e => patchAttack(a.id, { bonus: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>Daño (dado)</span>
                    <input value={a.damage} disabled={derived} onInput={e => patchAttack(a.id, { damage: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>Alcance</span>
                    <input value={a.range} disabled={derived} onInput={e => patchAttack(a.id, { range: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>Mod. Atq</span>
                    <select value={atkStat}
                      onChange={e => patchAttack(a.id, { attackStat: (e.currentTarget as HTMLSelectElement).value as Attack["attackStat"] })}>
                      <option value="strength">FUE (cuerpo)</option>
                      <option value="dexterity">DES (distancia)</option>
                      <option value="none">Sin bonif.</option>
                    </select>
                  </label>
                  <label>
                    <span>Mod. Daño</span>
                    <select value={dmgStat}
                      onChange={e => patchAttack(a.id, { damageStat: (e.currentTarget as HTMLSelectElement).value as Attack["damageStat"] })}>
                      <option value="strength">FUE</option>
                      <option value="dexterity">DES</option>
                      <option value="none">Sin bonif.</option>
                    </select>
                  </label>
                  <label style="grid-column:span 2">
                    <span>Notas</span>
                    <input value={a.notes} onInput={e => patchAttack(a.id, { notes: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                </div>
                {!derived && (
                  <EnchantmentPicker
                    target="weapon"
                    value={a.enchantments ?? []}
                    onChange={next => patchAttack(a.id, { enchantments: next })}
                  />
                )}
                {derived && (
                  <div class="hint" style="margin-top:8px">Los encantamientos de este ataque se editan desde la mochila.</div>
                )}
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                  <button class="chip btn-with-icon" onClick={() => deleteAttack(a.id)} title={derived ? "Desequipa el arma" : "Eliminar ataque"}>
                    <Icon name={derived ? "equip" : "trash"} />
                    {derived ? "Desequipar" : "Eliminar"}
                  </button>
                  <button class="buy-btn btn-with-icon" style="background:var(--success);box-shadow:0 2px 0 #244a2e" onClick={() => toggleLock(a.id)}><Icon name="save" />Guardar</button>
                </div>
              </div>
            )
          );
        })}
        <button class="dash-btn btn-with-icon" onClick={addAttack}><Icon name="add" />Añadir ataque</button>
      </section>

      <div class="rest-row">
        <button class="rest rest--short btn-with-icon" onClick={onShortRest}>
          <Icon name="rest" /><span>Descanso corto</span>
        </button>
        <button class="rest btn-with-icon" onClick={onLongRest}>
          <Icon name="rest" /><span>Descanso largo</span>
        </button>
      </div>

      <section class="section">
        <h2 class="section__title">Crónica</h2>
        <Timeline entries={c.combat.timeline} />
      </section>

      <div style="height:80px"></div>
    </div>
  );
}

function movementInfo(raw: string, isHeavy = false): { metersLabel: string; squaresLabel: string } {
  const norm = raw.replace(",", ".");
  const parseValue = (pattern: RegExp) => {
    const m = norm.match(pattern);
    return m ? Number(m[1]) : null;
  };
  const heavyMatch = parseValue(/(\d+(?:\.\d+)?)\s*m[.\s]*(?:con carga pesada)/i);
  const combatMatch = parseValue(/(\d+(?:\.\d+)?)\s*m[.\s]*en combate/i);
  const fallback = parseValue(/^(\d+(?:\.\d+)?)/);
  const meters = (isHeavy && heavyMatch != null) ? heavyMatch : (combatMatch ?? fallback);
  if (meters == null || !Number.isFinite(meters)) return { metersLabel: raw || "—", squaresLabel: "— casillas" };
  return {
    metersLabel: `${formatMove(meters)} m`,
    squaresLabel: `${formatMove(meters / 2)} casillas`,
  };
}

function formatMove(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
