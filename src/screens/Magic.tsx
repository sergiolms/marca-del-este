import { useEffect, useState } from "preact/hooks";
import { activeCharacter, updateActive } from "../state/store";
import { SlotPips } from "../components/ui/SlotPips";
import { SpellPicker } from "../components/ui/SpellPicker";
import { ItemDetail } from "../components/ui/ItemDetail";
import { SpellDetail } from "../components/ui/SpellDetail";
import { SpellAutocomplete, type CatalogSpellHit } from "../components/ui/SpellAutocomplete";
import { Icon } from "../components/ui/Icon";
import { allowedSpellLevelsFor, classByKey, firstSpellSlotLevel, hasSpellProgression, spellSlotsFor, spellTraditionFor } from "../rules/classLookup";
import { uid } from "../state/character";
import { entry } from "../state/timeline";
import { syncAutoEffects } from "../rules/autofill";
import { automaticMagicAbilities } from "../rules/magicAbilities";
import { canPrepareSpell, isDuplicateSpell, setSpellPrepared, spellKey, toggleSpellPrepared } from "../rules/spellbook";
import type { Spell, MagicItemInstance } from "../rules/types";

interface CatalogSpell {
  id: string;
  name: string;
  tradition: "arcane" | "divine" | "druidic";
  level: number;
  range: string;
  duration: string;
  effect: string;
}

export function MagicScreen() {
  const c = activeCharacter.value;
  const [picking, setPicking] = useState(false);
  const [detailMi, setDetailMi] = useState<string | null>(null);
  const [detailSpell, setDetailSpell] = useState<string | null>(null);
  const classKey = c?.character.classKey ?? "";
  const level = c?.character.level ?? 1;

  useEffect(() => {
    if (!activeCharacter.value) return;
    updateActive(cc => syncAutoEffects(cc));
  }, [classKey, level]);

  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;

  const cls = classByKey(c.character.classKey);
  const classSlots = spellSlotsFor(c.character.classKey, c.character.level);
  const slotRows = classSlots?.map((total, idx) => ({ total, level: idx + 1 })).filter(row => row.total > 0) ?? [];
  const firstSpellLevel = firstSpellSlotLevel(c.character.classKey);
  const classWillCast = hasSpellProgression(c.character.classKey);
  const classTradition = spellTraditionFor(c.character.classKey);
  const tradition = classTradition ?? "arcane";
  const allowedSpellLevels = allowedSpellLevelsFor(c.character.classKey, c.character.level);
  const lockedToClassTable = !!classTradition;
  const canPickRulebookSpell = !lockedToClassTable || (allowedSpellLevels?.length ?? 0) > 0;
  const spellTableLabel = lockedToClassTable
    ? `${tradition === "divine" ? "Divina" : tradition === "druidic" ? "Druídica" : "Arcana"}${allowedSpellLevels?.length ? ` · N${allowedSpellLevels.join(", N")}` : " · sin niveles disponibles"}`
    : "Sin tabla de clase";
  const autoMagic = automaticMagicAbilities(c.effects);
  const auraAbilities = autoMagic.filter(a => a.kind === "aura");
  const powerAbilities = autoMagic.filter(a => a.kind === "power");

  const knownSpellKeys = c.spells.map(s => spellKey(s.name, s.level));

  const toggleUsed = (id: string) => updateActive(cc => ({
    ...cc,
    spells: cc.spells.map(s => s.id === id && s.prepared ? { ...s, used: !s.used } : s),
  }));
  const togglePrepared = (id: string) => updateActive(cc => toggleSpellPrepared(cc, id));
  const delSpell = (id: string) => updateActive(cc => ({ ...cc, spells: cc.spells.filter(s => s.id !== id) }));
  const toggleLockSpell = (id: string) => updateActive(cc => {
    const spell = cc.spells.find(s => s.id === id);
    if (spell && !spell.locked && isDuplicateSpell(cc.spells, spell.name, spell.level, id)) {
      window.alert("Ya conoces ese conjuro.");
      return cc;
    }
    return { ...cc, spells: cc.spells.map(s => s.id === id ? { ...s, locked: !s.locked } : s) };
  });
  const patchSpell = (id: string, p: Partial<Spell>) => updateActive(cc => ({
    ...cc, spells: cc.spells.map(s => s.id === id ? { ...s, ...p } : s),
  }));
  const normalizeSpellLevel = (raw: number): number => {
    const level = Math.max(1, Math.min(9, raw || 1));
    if (!allowedSpellLevels?.length) return level;
    if (allowedSpellLevels.includes(level)) return level;
    const lower = allowedSpellLevels.filter(n => n <= level);
    return lower.length > 0 ? lower[lower.length - 1] : allowedSpellLevels[0];
  };
  const toggleEffectActive = (id: string) => updateActive(cc => ({
    ...cc,
    effects: cc.effects.map(e => e.id === id ? { ...e, active: !e.active } : e),
  }));

  const pickSpell = (picked: CatalogSpell | null) => {
    setPicking(false);
    if (!picked) {
      const defaultLevel = allowedSpellLevels?.[0] ?? 1;
      updateActive(cc => ({
        ...cc,
        spells: [...cc.spells, { id: uid(), locked: false, prepared: false, used: false, name: "Conjuro", level: defaultLevel, duration: "", notes: "" }],
      }));
      return;
    }
    updateActive(cc => {
      if (isDuplicateSpell(cc.spells, picked.name, picked.level)) {
        window.alert("Ya conoces ese conjuro.");
        return cc;
      }
      return {
        ...cc,
        spells: [...cc.spells, {
          id: uid(), locked: true, prepared: false, used: false,
          name: picked.name, level: picked.level, duration: picked.duration,
          notes: `${picked.range} · ${picked.effect}`,
        }],
      };
    });
  };

  const useMagicItem = (mi: MagicItemInstance) => {
    if (!canUseMagicItem(mi)) return;
    updateActive(cc => {
      const next = cc.magicItems.map(m => {
        if (m.id !== mi.id) return m;
        if (m.consumable) return m;
        if (m.charges !== undefined) return { ...m, charges: Math.max(0, (m.charges ?? 0) - 1) };
        if (m.usesPerDay !== undefined) return { ...m, usesToday: Math.min(m.usesPerDay, (m.usesToday ?? 0) + 1) };
        return m;
      }).filter(m => !(m.consumable && m.id === mi.id));
      return {
        ...cc,
        magicItems: next,
        combat: {
          ...cc.combat,
          timeline: [
            entry(`✦ Usado objeto mágico: <b>${mi.name}</b>`, "normal"),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      };
    });
    setDetailMi(null);
  };

  const patchMi = (id: string, p: Partial<MagicItemInstance>) => updateActive(cc => ({
    ...cc, magicItems: cc.magicItems.map(m => m.id === id ? { ...m, ...p } : m),
  }));
  const applyScrollSpell = (id: string, spell: CatalogSpellHit) => {
    patchMi(id, {
      name: `Pergamino de ${spell.name} (N${spell.level})`,
      kind: "scroll",
      consumable: true,
      charges: 1,
      maxCharges: 1,
      usesToday: undefined,
      usesPerDay: undefined,
      notes: `Conjuro ${traditionLabel(spell.tradition)} de nivel ${spell.level}\nAlcance: ${spell.range}\nDuración: ${spell.duration}\n\n${spell.effect}`,
    });
  };
  const delMi = (id: string) => updateActive(cc => ({
    ...cc, magicItems: cc.magicItems.filter(m => m.id !== id),
  }));
  const [editingMi, setEditingMi] = useState<string | null>(null);

  const addMagicItem = () => {
    const id = uid();
    updateActive(cc => ({
      ...cc,
      magicItems: [...cc.magicItems, {
        id, name: "Nuevo objeto mágico", kind: "wondrous", notes: "", charges: undefined,
      }],
    }));
    setEditingMi(id);
  };

  const detailMiObj = detailMi ? c.magicItems.find(m => m.id === detailMi) : null;
  const detailSpellObj = detailSpell ? c.spells.find(s => s.id === detailSpell) : null;

  return (
    <div class="scroll">
      <header class="hero">
        <h1 class="hero__name">Magia</h1>
        <div class="hero__meta">
          <span class="hero__badge" style={{ background: `var(--class-${c.character.classKey || "mago"})` }}>
            {c.character.className || "Sin clase"}
          </span>
          <span>Nivel {c.character.level}</span>
          {cls && <span>· Tradición {tradition === "divine" ? "divina" : tradition === "druidic" ? "druídica" : "arcana"}</span>}
        </div>
      </header>

      <section class="section">
        <h2 class="section__title">Espacios de conjuro</h2>
        <div class="card" style="padding:4px 0">
          {slotRows.length > 0 ? (
            slotRows.map(row => (
              <SlotPips
                key={row.level}
                label={`N${row.level}`}
                total={row.total}
                items={c.spells.filter(s => s.prepared && s.level === row.level).map(s => ({ id: s.id, label: s.name }))}
                onItemClick={setDetailSpell}
              />
            ))
          ) : (
            <div style="padding:12px;text-align:center;color:var(--ink-muted);font-size:13px">
              {classWillCast && firstSpellLevel
                ? `Sin espacios en nivel ${c.character.level}. Primeros espacios a nivel ${firstSpellLevel}.`
                : "Esta clase no usa espacios diarios de conjuro."}
            </div>
          )}
        </div>
      </section>

      {(auraAbilities.length > 0 || powerAbilities.length > 0) && (
        <section class="section">
          {auraAbilities.length > 0 && (
            <>
              <h2 class="section__title">Auras</h2>
              {auraAbilities.map(({ effect }) => (
                <div class={`card magic-feature magic-feature--aura ${effect.active ? "" : "magic-feature--off"}`} key={effect.id}>
                  <button
                    class={`aura-toggle ${effect.active ? "on" : ""}`}
                    onClick={() => toggleEffectActive(effect.id)}
                    aria-pressed={effect.active}
                    aria-label={`${effect.active ? "Desactivar" : "Activar"} ${effect.name}`}
                  >
                    <Icon name={effect.active ? "magic" : "cancel"} />
                    <span>{effect.active ? "Activa" : "Inactiva"}</span>
                  </button>
                  <div>
                    <div class="magic-feature__title">{effect.name}</div>
                    <div class="magic-feature__meta">{effect.kind} · {effect.duration || "Permanente"}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {powerAbilities.length > 0 && (
            <>
              <h2 class="section__title" style={auraAbilities.length > 0 ? "margin-top:12px" : undefined}>Conjuros y poderes de clase</h2>
              {powerAbilities.map(({ effect }) => (
                <div class="card magic-feature" key={effect.id}>
                  <div class="magic-feature__ico"><Icon name="magic" /></div>
                  <div>
                    <div class="magic-feature__title">{effect.name}</div>
                    <div class="magic-feature__meta">{effect.kind} · {effect.duration || "Permanente"}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <section class="section">
        <div class="section__header">
          <h2 class="section__title" style="margin:0;flex:0">Conjuros</h2>
          <button
            class="chip btn-with-icon"
            disabled={!canPickRulebookSpell}
            title={canPickRulebookSpell ? "Elegir un conjuro permitido por tu tabla" : "Tu tabla de clase aún no concede espacios de conjuro"}
            onClick={() => setPicking(true)}
          >
            <Icon name="magic" />Del rulebook
          </button>
        </div>
        {lockedToClassTable && (
          <div class="hint" style="margin-top:8px">
            Tabla de {c.character.className || "clase"}: <b>{spellTableLabel}</b>.
          </div>
        )}

        {c.spells.length === 0 && (
          <div class="card" style="padding:16px;text-align:center;color:var(--ink-muted);font-size:13px">
            Sin conjuros. Pulsa «Del rulebook» para elegir uno.
          </div>
        )}

        {c.spells.map(s => (
          s.locked ? (
            <div
              class={`card spell-card ${s.used ? "spell-card--used" : s.prepared ? "card--lift spell-card--prepared" : ""}`}
              key={s.id}
              style="margin-top:8px;cursor:pointer"
              onClick={() => setDetailSpell(s.id)}
            >
              <div style="display:flex;align-items:center;gap:10px">
                <div class="spell-card__ico"><Icon name="magic" /></div>
                <div style="flex:1">
                  <div class="spell-card__title">{s.name}</div>
                  <div class="spell-card__meta">
                    Nivel {s.level}{s.duration ? ` · ${s.duration}` : ""}{s.prepared ? " · equipado" : " · aprendido"}{s.used ? " · usado hoy" : ""}
                  </div>
                  {s.notes && <div class="spell-card__notes">{s.notes}</div>}
                </div>
                <div style="display:flex;gap:4px;align-items:center" onClick={e => e.stopPropagation()}>
                  <button
                    class="d20"
                    disabled={!s.prepared && !canPrepareSpell(c, s)}
                    title={s.prepared ? "Desequipar conjuro" : canPrepareSpell(c, s) ? "Equipar conjuro" : "Sin espacios libres de este nivel"}
                    onClick={() => togglePrepared(s.id)}
                    aria-label={s.prepared ? `Desequipar ${s.name}` : `Equipar ${s.name}`}
                  >
                    <Icon name={s.prepared ? "equip" : "open"} />
                  </button>
                  <button class="d20" disabled={!s.prepared} onClick={() => toggleUsed(s.id)} aria-label={s.used ? `Restaurar ${s.name}` : `Marcar usado ${s.name}`}>
                    {s.used ? <Icon name="rest" /> : <Icon name="magic" />}
                  </button>
                  <button class="d20 d20--small" onClick={() => toggleLockSpell(s.id)} aria-label={`Editar ${s.name}`}><Icon name="edit" /></button>
                </div>
              </div>
            </div>
          ) : (
            <div class="card" key={s.id} style="margin-top:8px">
              <div class="edit-grid">
                <label style="grid-column:span 2">
                  <span>Nombre</span>
                  <input value={s.name} onInput={e => patchSpell(s.id, { name: (e.currentTarget as HTMLInputElement).value })} />
                </label>
                <label>
                  <span>Nivel</span>
                  <input type="number" inputMode="numeric" min={allowedSpellLevels?.[0] ?? 1} max={allowedSpellLevels?.[allowedSpellLevels.length - 1] ?? 9} value={s.level}
                    onChange={e => patchSpell(s.id, { level: normalizeSpellLevel(Number((e.currentTarget as HTMLInputElement).value) || 1), prepared: false, used: false })}
                  />
                </label>
                <label>
                  <span>Duración</span>
                  <input value={s.duration} onInput={e => patchSpell(s.id, { duration: (e.currentTarget as HTMLInputElement).value })} />
                </label>
                <label class="edit-check">
                  <input
                    type="checkbox"
                    checked={s.prepared}
                    disabled={!s.prepared && !canPrepareSpell(c, s)}
                    onChange={e => updateActive(cc => setSpellPrepared(cc, s.id, (e.currentTarget as HTMLInputElement).checked))}
                  />
                  <span>Equipado</span>
                </label>
                <label class="edit-check">
                  <input type="checkbox" checked={s.used} disabled={!s.prepared} onChange={e => patchSpell(s.id, { used: (e.currentTarget as HTMLInputElement).checked && s.prepared })} />
                  <span>Usado hoy</span>
                </label>
                <label style="grid-column:span 2">
                  <span>Notas</span>
                  <textarea rows={3} value={s.notes}
                    onInput={e => patchSpell(s.id, { notes: (e.currentTarget as HTMLTextAreaElement).value })}
                  />
                </label>
              </div>
              <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                <button class="chip btn-with-icon" onClick={() => delSpell(s.id)}><Icon name="trash" />Eliminar</button>
                <button class="buy-btn btn-with-icon" style="background:var(--success);box-shadow:0 2px 0 #244a2e" onClick={() => toggleLockSpell(s.id)}><Icon name="save" />Guardar</button>
              </div>
            </div>
          )
        ))}
      </section>

      <section class="section">
        <div class="section__header">
          <h2 class="section__title" style="margin:0;flex:0">Objetos mágicos</h2>
          <button class="chip btn-with-icon" onClick={addMagicItem}><Icon name="add" />Añadir</button>
        </div>
        {c.magicItems.length === 0 && (
          <div class="card" style="padding:16px;text-align:center;color:var(--ink-muted);font-size:13px">
            Sin objetos mágicos. Cómpralos en la tienda (categoría «Mágico») o añade uno manual.
          </div>
        )}
        {c.magicItems.map(m => editingMi === m.id ? (
          <div class="card" key={m.id} style="margin-bottom:8px">
            <div class="edit-grid">
              <label style="grid-column:span 2">
                <span>Nombre · autocompleta pergaminos</span>
                <SpellAutocomplete
                  value={m.name}
                  placeholder="Proyectil mágico, curar heridas…"
                  onInput={value => patchMi(m.id, { name: value })}
                  onPick={spell => applyScrollSpell(m.id, spell)}
                />
              </label>
              <label>
                <span>Tipo</span>
                <select value={m.kind} onChange={e => patchMi(m.id, { kind: (e.currentTarget as HTMLSelectElement).value as MagicItemInstance["kind"] })}>
                  <option value="ring">Anillo</option>
                  <option value="staff">Bastón</option>
                  <option value="rod">Cetro</option>
                  <option value="wand">Varita</option>
                  <option value="scroll">Pergamino</option>
                  <option value="potion">Poción</option>
                  <option value="wondrous">Objeto maravilloso</option>
                </select>
              </label>
              <label class="edit-check">
                <input type="checkbox" checked={!!m.consumable} onChange={e => patchMi(m.id, { consumable: (e.currentTarget as HTMLInputElement).checked || undefined })} />
                <span>Consumible</span>
              </label>
              <label>
                <span>Cargas actuales</span>
                <input type="number" inputMode="numeric" min="0" value={m.charges ?? ""} placeholder="—"
                  onInput={e => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    patchMi(m.id, { charges: v === "" ? undefined : Math.max(0, Number(v) || 0) });
                  }}
                />
              </label>
              <label>
                <span>Cargas máx.</span>
                <input type="number" inputMode="numeric" min="0" value={m.maxCharges ?? ""} placeholder="—"
                  onInput={e => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    patchMi(m.id, { maxCharges: v === "" ? undefined : Math.max(0, Number(v) || 0) });
                  }}
                />
              </label>
              <label>
                <span>Usos por día</span>
                <input type="number" inputMode="numeric" min="0" value={m.usesPerDay ?? ""} placeholder="—"
                  onInput={e => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    patchMi(m.id, { usesPerDay: v === "" ? undefined : Math.max(0, Number(v) || 0) });
                  }}
                />
              </label>
              <label style="grid-column:span 2">
                <span>Efecto / notas</span>
                <textarea rows={3} value={m.notes}
                  onInput={e => patchMi(m.id, { notes: (e.currentTarget as HTMLTextAreaElement).value })}
                />
              </label>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
              <button class="chip btn-with-icon" onClick={() => delMi(m.id)}><Icon name="trash" />Eliminar</button>
              <button class="buy-btn btn-with-icon" style="background:var(--success);box-shadow:0 2px 0 #244a2e" onClick={() => setEditingMi(null)}><Icon name="save" />Guardar</button>
            </div>
          </div>
        ) : (
          <div class="card mi" key={m.id} onClick={() => setDetailMi(m.id)} style="cursor:pointer">
            <div class="mi__ico">{iconForKind(m.kind)}</div>
            <div>
              <div class="mi__title">{m.name}</div>
              <div class="mi__sub">
                {m.kind === "wand" || m.kind === "staff" || m.kind === "rod"
                  ? `Cargas ${m.charges ?? 0}${m.maxCharges ? ` / ${m.maxCharges}` : ""}`
                  : m.consumable
                    ? "Consumible"
                    : m.usesPerDay
                      ? `${m.usesToday ?? 0} / ${m.usesPerDay} usos hoy`
                      : "Pasivo"}
              </div>
              {(m.charges !== undefined && m.maxCharges) && (
                <div class="mi__charges" style="margin-top:4px">
                  {Array.from({ length: m.maxCharges }).map((_, i) => (
                    <span class={`mi__charge ${i >= (m.charges ?? 0) ? "spent" : ""}`} />
                  ))}
                </div>
              )}
            </div>
            <div style="display:flex;gap:4px" onClick={e => e.stopPropagation()}>
              <button class="d20" disabled={!canUseMagicItem(m)} onClick={() => useMagicItem(m)} aria-label={`Usar ${m.name}`} title={canUseMagicItem(m) ? "Usar este objeto" : "Sin usos disponibles"}><Icon name="magic" /></button>
              <button class="d20 d20--small" onClick={() => setEditingMi(m.id)} aria-label={`Editar ${m.name}`}><Icon name="edit" /></button>
            </div>
          </div>
        ))}
      </section>

      {picking && (
        <SpellPicker
          filterTradition={classTradition ?? undefined}
          allowedLevels={allowedSpellLevels ?? undefined}
          lockedToClassTable={lockedToClassTable}
          knownSpellKeys={knownSpellKeys}
          onPick={pickSpell}
          onCancel={() => setPicking(false)}
        />
      )}

      {detailSpellObj && (
        <SpellDetail
          spell={detailSpellObj}
          onClose={() => setDetailSpell(null)}
          onToggleUsed={() => toggleUsed(detailSpellObj.id)}
          onTogglePrepared={() => togglePrepared(detailSpellObj.id)}
          canPrepare={canPrepareSpell(c, detailSpellObj)}
          onEdit={() => { toggleLockSpell(detailSpellObj.id); setDetailSpell(null); }}
        />
      )}

      {detailMiObj && (
        <ItemDetail
          payload={{ source: "magic-instance", item: detailMiObj }}
          onClose={() => setDetailMi(null)}
          onAction={canUseMagicItem(detailMiObj) ? {
            label: detailMiObj.consumable ? "Consumir" : "Usar",
            variant: "primary",
            onClick: () => useMagicItem(detailMiObj),
          } : undefined}
          secondaryAction={{
            label: "Editar",
            onClick: () => { setEditingMi(detailMiObj.id); setDetailMi(null); },
          }}
        />
      )}

      <div style="height:80px"></div>
    </div>
  );
}

function canUseMagicItem(m: MagicItemInstance): boolean {
  if (m.charges !== undefined) return m.charges > 0;
  if (m.usesPerDay !== undefined) return (m.usesToday ?? 0) < m.usesPerDay;
  return true;
}

function iconForKind(kind: MagicItemInstance["kind"]): string {
  switch (kind) {
    case "wand": return "🪄";
    case "staff": return "🕯";
    case "rod": return "⚡";
    case "scroll": return "📜";
    case "potion": return "🧪";
    case "ring": return "💍";
    case "wondrous": return "✦";
  }
}

function traditionLabel(t: CatalogSpellHit["tradition"]): string {
  return t === "arcane" ? "arcano" : t === "divine" ? "divino" : "druídico";
}
