import { useState } from "preact/hooks";
import { activeCharacter, updateActive } from "../state/store";
import { CoinStacks } from "../components/ui/CoinStacks";
import { totalCarriedWeight, equippedWeight } from "../rules/combat";
import { uid } from "../state/character";
import { entry } from "../state/timeline";
import { parsePriceToCopper, walletToCopper, copperToWallet } from "../rules/wallet";
import { Icon } from "../components/ui/Icon";
import { canEquipItem, equipLimitReason, isWeapon, setEquipped, syncEquippedAttacks, toggleEquipped } from "../rules/equip";
import { EnchantmentPicker } from "../components/ui/EnchantmentPicker";
import { ItemAutocomplete } from "../components/ui/ItemAutocomplete";
import { ItemDetail } from "../components/ui/ItemDetail";
import { enchantmentLabels } from "../rules/attackMath";
import type { InventoryItem } from "../rules/types";
import type { EnchantmentTarget, ShopItem } from "../data/catalog/types";

export function InventoryScreen() {
  const c = activeCharacter.value;
  const [detailFor, setDetailFor] = useState<string | null>(null);
  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;

  const carryWeight = totalCarriedWeight(c.inventory.items);
  const wornWeight = equippedWeight(c.inventory.items);
  const overloaded = carryWeight > c.inventory.maxWeight;

  const addItem = () => {
    updateActive(cc => ({
      ...cc,
      inventory: {
        ...cc.inventory,
        items: [
          ...cc.inventory.items,
          { id: uid(), locked: false, equipped: false, name: "", quantity: 1, weight: 0, value: "", notes: "" },
        ],
      },
    }));
  };
  const del = (id: string) => updateActive(cc => syncEquippedAttacks({
    ...cc, inventory: { ...cc.inventory, items: cc.inventory.items.filter(i => i.id !== id) },
  }));
  const toggle = (id: string) => updateActive(cc => ({ ...cc, inventory: { ...cc.inventory, items: cc.inventory.items.map(i => i.id === id ? { ...i, locked: !i.locked } : i) } }));
  const patch = (id: string, p: Partial<InventoryItem>) =>
    updateActive(cc => syncEquippedAttacks({
      ...cc, inventory: { ...cc.inventory, items: cc.inventory.items.map(i => i.id === id ? { ...i, ...p } : i) },
    }));
  const equipToggle = (id: string) => updateActive(cc => {
    const item = cc.inventory.items.find(i => i.id === id);
    if (item && !item.equipped && !canEquipItem(cc, id)) {
      window.alert(equipLimitReason(item));
      return cc;
    }
    return toggleEquipped(cc, id);
  });
  const applyShopMatch = (id: string, it: ShopItem) => {
    patch(id, {
      name: it.name,
      weight: it.weight ?? 0,
      value: it.cost,
      notes: it.notes ?? "",
      damage: it.damage,
      ranged: it.ranged,
      armorClass: it.armorClass,
    });
  };

  const sell = (id: string) => {
    const item = c.inventory.items.find(i => i.id === id);
    if (!item) return;
    const priceCopper = parsePriceToCopper(item.value);
    if (priceCopper === null) {
      alert(`“${item.name}” no tiene un precio reconocible (valor: ${item.value || "vacío"}). Edítalo para venderlo.`);
      return;
    }
    if (!confirm(`Vender 1 × ${item.name} por ${item.value}?`)) return;
    updateActive(cc => {
      const items = cc.inventory.items.flatMap(i => {
        if (i.id !== id) return [i];
        const q = Math.max(0, i.quantity - 1);
        return q === 0 ? [] : [{ ...i, quantity: q }];
      });
      const money = copperToWallet(walletToCopper(cc.money) + priceCopper);
      const next = {
        ...cc,
        money,
        inventory: { ...cc.inventory, items },
        combat: {
          ...cc.combat,
          timeline: [
            entry(`💰 Vendido: <b>${item.name}</b> por ${item.value}`, "heal"),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      };
      return syncEquippedAttacks(next);
    });
    setDetailFor(null);
  };

  // Sort: equipped first, then by name
  const sorted = [...c.inventory.items].sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });

  const detailItem = detailFor ? c.inventory.items.find(i => i.id === detailFor) : null;

  return (
    <div class="scroll">
      <section class="section">
        <h2 class="section__title">Monedero</h2>
        <CoinStacks wallet={c.money} />
      </section>

      <section class="section">
        <h2 class="section__title">Carga</h2>
        <div class="card weight">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px">
            <span style="font-family:var(--font-display);font-weight:700;font-size:20px">{carryWeight} <span style="color:var(--ink-muted);font-size:14px">/ {c.inventory.maxWeight} kg</span></span>
            <span class="chip">{overloaded ? "Sobrecarga" : carryWeight > c.inventory.maxWeight * 0.75 ? "Pesado" : "Ligero"}</span>
          </div>
          <div class="weight__bar" style="margin-top:6px">
            <div class={`weight__fill ${overloaded ? "over" : ""}`} style={{ width: `${Math.min(140, (carryWeight / Math.max(1, c.inventory.maxWeight)) * 100)}%` }} />
          </div>
          {wornWeight > 0 && (
            <div style="margin-top:6px;color:var(--ink-muted);font-size:11px">
              Llevas puestos <b style="color:var(--ink)">{wornWeight} kg</b> que no cuentan para la carga.
            </div>
          )}
        </div>
      </section>

      <section class="section">
        <h2 class="section__title">Objetos</h2>

        {c.inventory.items.length === 0 && (
          <div class="card" style="padding:16px;text-align:center;color:var(--ink-muted);font-size:13px">
            Mochila vacía. Compra algo en la tienda o añade un objeto.
          </div>
        )}

        {sorted.map(i => {
          const sellableCopper = parsePriceToCopper(i.value);
          const sellable = sellableCopper !== null && sellableCopper > 0;
          const enchTarget: EnchantmentTarget =
            isWeapon(i) ? "weapon" :
            /escudo/i.test(i.name) ? "shield" :
            i.armorClass || /armadura|cota|cuero|malla|placa/i.test(i.name) ? "armor" : "weapon";
          const canEnchant = isWeapon(i) || !!i.armorClass || /armadura|cota|cuero|malla|placa|escudo/i.test(i.name);
          const canEquip = isWeapon(i) || !!i.armorClass || /armadura|cota|cuero|malla|placa|escudo|casco|anillo|cap/i.test(i.name);
          const canToggleEquip = canEquip && (i.equipped || canEquipItem(c, i.id));
          const enchNames = enchantmentLabels(i.enchantments);
          return (
            i.locked ? (
              <div class={`card inv-row ${i.equipped ? "inv-row--equipped" : ""}`} key={i.id}>
                <button
                  class={`equip-toggle ${i.equipped ? "equip-toggle--on" : ""}`}
                  onClick={(e) => { e.stopPropagation(); if (canToggleEquip) equipToggle(i.id); }}
                  disabled={!canToggleEquip}
                  aria-pressed={i.equipped}
                  aria-label={i.equipped ? `Desequipar ${i.name}` : `Equipar ${i.name}`}
                  title={!canEquip ? "Este objeto no se equipa" : !canToggleEquip ? equipLimitReason(i) : i.equipped ? "Llevada · toca para desequipar" : "Toca para equipar"}
                >
                  <Icon name={i.equipped ? "equip" : "shield"} />
                  <span>{!canEquip ? "—" : i.equipped ? "Equipada" : "Guardada"}</span>
                </button>
                <button
                  class="inv-row__info"
                  onClick={() => setDetailFor(i.id)}
                  aria-label={`Ver detalles de ${i.name}`}
                >
                  <div class="inv-row__name">{i.name || "Sin nombre"}</div>
                  <div class="inv-row__sub">
                    {enchNames.map(e => <span class="chip chip--plus" style="padding:1px 6px;font-size:10px">{e}</span>)}
                    {i.damage && <span class="chip chip--fire" style="padding:1px 6px;font-size:10px">{i.damage}</span>}
                    {i.armorClass && <span class="chip chip--cold" style="padding:1px 6px;font-size:10px">CA {i.armorClass}</span>}
                    <span>{i.weight} kg</span>
                    {i.value && <><span>·</span><span>{i.value}</span></>}
                  </div>
                  {i.notes && <div class="inv-row__notes clamp-3">{i.notes}</div>}
                </button>
                <div class="inv-row__actions">
                  <span class="inv-item__qty">×{i.quantity}</span>
                  {sellable && (
                    <button class="d20 d20--small sell-btn" onClick={() => sell(i.id)} aria-label={`Vender ${i.name}`} title={`Vender por ${i.value}`}>
                      <Icon name="buy" />
                    </button>
                  )}
                  <button class="d20 d20--small" onClick={() => toggle(i.id)} aria-label={`Editar ${i.name}`}><Icon name="edit" /></button>
                </div>
              </div>
            ) : (
              <div class="card" key={i.id} style="margin-bottom:6px">
                <div class="edit-grid">
                  <label style="grid-column:span 2">
                    <span>Nombre · busca en la tienda</span>
                    <ItemAutocomplete
                      value={i.name}
                      placeholder="Empieza a escribir…"
                      onInput={v => patch(i.id, { name: v })}
                      onPick={it => applyShopMatch(i.id, it)}
                    />
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input type="number" value={i.quantity} inputMode="numeric" onInput={e => patch(i.id, { quantity: Number((e.currentTarget as HTMLInputElement).value) || 0 })} />
                  </label>
                  <label>
                    <span>Peso (kg)</span>
                    <input type="number" value={i.weight} inputMode="decimal" step="0.1" min="0"
                      onInput={e => patch(i.id, { weight: Number((e.currentTarget as HTMLInputElement).value.replace(",", ".")) || 0 })} />
                  </label>
                  <label>
                    <span>Valor</span>
                    <input value={i.value} placeholder="10 mo (vacío = no vendible)" onInput={e => patch(i.id, { value: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>Daño</span>
                    <input value={i.damage ?? ""} placeholder="1d8" onInput={e => patch(i.id, { damage: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                  <label>
                    <span>CA / bonus</span>
                    <input value={i.armorClass ?? ""} placeholder="5 [14] o -1 [11]" onInput={e => patch(i.id, { armorClass: (e.currentTarget as HTMLInputElement).value || undefined })} />
                  </label>
                  <label class="edit-check">
                    <input type="checkbox" checked={!!i.ranged} onChange={e => patch(i.id, { ranged: (e.currentTarget as HTMLInputElement).checked })} />
                    <span>A distancia</span>
                  </label>
                  <label class="edit-check">
                    <input
                      type="checkbox"
                      checked={i.equipped}
                      disabled={!i.equipped && isWeapon(i) && !canEquipItem(c, i.id)}
                      onChange={e => updateActive(cc => setEquipped(cc, i.id, (e.currentTarget as HTMLInputElement).checked))}
                    />
                    <span>Equipado</span>
                  </label>
                  <label style="grid-column:span 2">
                    <span>Notas</span>
                    <input value={i.notes} onInput={e => patch(i.id, { notes: (e.currentTarget as HTMLInputElement).value })} />
                  </label>
                </div>
                {canEnchant && (
                  <EnchantmentPicker
                    target={enchTarget}
                    value={i.enchantments ?? []}
                    onChange={next => patch(i.id, { enchantments: next })}
                  />
                )}
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap">
                  <button class="chip btn-with-icon" onClick={() => del(i.id)}><Icon name="trash" />Eliminar</button>
                  {sellable && <button class="chip btn-with-icon" style="background:#d9e4cf;border-color:#9abf85;color:#274a1a" onClick={() => sell(i.id)}><Icon name="buy" />Vender</button>}
                  <button class="buy-btn btn-with-icon" style="background:var(--success);box-shadow:0 2px 0 #244a2e" onClick={() => toggle(i.id)}><Icon name="save" />Guardar</button>
                </div>
              </div>
            )
          );
        })}

        <button class="dash-btn btn-with-icon" onClick={addItem}><Icon name="add" />Añadir objeto</button>
      </section>

      {detailItem && (
        <ItemDetail
          payload={{ source: "inventory", item: detailItem }}
          onClose={() => setDetailFor(null)}
          onAction={
            detailItem.locked && (detailItem.equipped || canEquipItem(c, detailItem.id))
              ? { label: (detailItem.equipped ? "Desequipar" : "Equipar"), variant: "primary",
                  onClick: () => { equipToggle(detailItem.id); } }
              : undefined
          }
          secondaryAction={
            parsePriceToCopper(detailItem.value) !== null
              ? { label: `Vender por ${detailItem.value}`, onClick: () => sell(detailItem.id) }
              : undefined
          }
        />
      )}

      <div style="height:80px"></div>
    </div>
  );
}
