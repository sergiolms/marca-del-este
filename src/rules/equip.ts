// Equip ↔ attack linkage. When a weapon is equipped, an attack derived from it
// appears in combat automatically. Unequipping (or deleting the item) removes
// the derived attack.
//
// Derived attacks carry `sourceItemId`. Manual attacks (no sourceItemId) are
// unaffected by sync.

import type { Character, InventoryItem, Attack } from "./types";
import { uid } from "../state/character";
import { inferAttackStats } from "./attackMath";

export const MAX_EQUIPPED_WEAPONS_PER_KIND = 2;
export type WeaponEquipKind = "melee" | "ranged";

export function isDerivedAttack(a: Attack): boolean {
  return !!a.sourceItemId;
}

/** Does this inventory item produce an attack when equipped? */
export function isWeapon(item: InventoryItem): boolean {
  return !!item.damage && item.damage.trim().length > 0;
}

export function weaponEquipKind(item: InventoryItem): WeaponEquipKind {
  return item.ranged ? "ranged" : "melee";
}

export function equippedWeaponCount(c: Character, kind: WeaponEquipKind): number {
  return c.inventory.items.filter(it => it.equipped && isWeapon(it) && weaponEquipKind(it) === kind).length;
}

export function canEquipItem(c: Character, itemId: string): boolean {
  const item = c.inventory.items.find(i => i.id === itemId);
  if (!item) return false;
  if (item.equipped || !isWeapon(item)) return true;
  return equippedWeaponCount(c, weaponEquipKind(item)) < MAX_EQUIPPED_WEAPONS_PER_KIND;
}

export function equipLimitReason(item: InventoryItem): string {
  return item.ranged
    ? "Límite: 2 armas a distancia equipadas"
    : "Límite: 2 armas cuerpo a cuerpo equipadas";
}

function limitEquippedWeapons(items: InventoryItem[]): InventoryItem[] {
  let melee = 0;
  let ranged = 0;
  return items.map(it => {
    if (!it.equipped || !isWeapon(it)) return it;
    if (it.ranged) {
      if (ranged >= MAX_EQUIPPED_WEAPONS_PER_KIND) return { ...it, equipped: false };
      ranged += 1;
      return it;
    }
    if (melee >= MAX_EQUIPPED_WEAPONS_PER_KIND) return { ...it, equipped: false };
    melee += 1;
    return it;
  });
}

/** Create a fresh derived attack from an inventory item. */
function deriveAttack(item: InventoryItem, baseBonus: string): Attack {
  const ranged = !!item.ranged;
  const inferred = inferAttackStats(ranged ? "distancia" : "cuerpo");
  return {
    id: uid(),
    locked: true,
    name: item.name,
    bonus: baseBonus || "+0",
    damage: item.damage ?? "1d6",
    range: ranged ? "distancia" : "cuerpo",
    notes: "",
    enchantments: item.enchantments?.slice(),
    attackStat: inferred.attackStat,
    damageStat: inferred.damageStat,
    sourceItemId: item.id,
  };
}

/** Rebuild the attack list so it matches equipped weapons.
 *  Preserves manual attacks and any derived attack whose source item is still equipped.
 *  For existing derived attacks, refreshes `name`, `damage`, `range`, `ranged` defaults,
 *  and `enchantments` from the source item so edits in Mochila propagate. */
export function syncEquippedAttacks(c: Character): Character {
  const items = limitEquippedWeapons(c.inventory.items);
  const itemsById = new Map(items.map(it => [it.id, it]));
  const equippedWeaponIds = new Set(
    items.filter(it => it.equipped && isWeapon(it)).map(it => it.id)
  );

  // 1. Drop derived attacks whose item is no longer equipped (or no longer exists).
  let attacks = c.combat.attacks.filter(a => {
    if (!a.sourceItemId) return true; // manual attack, keep
    return equippedWeaponIds.has(a.sourceItemId);
  });

  // 2. Refresh the existing derived attacks so name/damage/range/enchantments mirror the item.
  attacks = attacks.map(a => {
    if (!a.sourceItemId) return a;
    const it = itemsById.get(a.sourceItemId);
    if (!it) return a;
    const ranged = !!it.ranged;
    const mirroredRange = ranged ? "distancia" : "cuerpo";
    return {
      ...a,
      name: it.name,
      damage: it.damage ?? a.damage,
      range: a.range && a.range !== "cuerpo" && a.range !== "distancia" ? a.range : mirroredRange,
      enchantments: it.enchantments ? it.enchantments.slice() : undefined,
    };
  });

  // 3. Add missing derived attacks for newly equipped weapons.
  const haveSource = new Set(attacks.filter(a => a.sourceItemId).map(a => a.sourceItemId!));
  const missing = items.filter(it => equippedWeaponIds.has(it.id) && !haveSource.has(it.id));
  for (const it of missing) {
    attacks = [...attacks, deriveAttack(it, c.combat.attackBonus)];
  }

  return { ...c, inventory: { ...c.inventory, items }, combat: { ...c.combat, attacks } };
}

/** Set equipped flag on an inventory item and re-sync attacks in one go. */
export function setEquipped(c: Character, itemId: string, equipped: boolean): Character {
  if (equipped && !canEquipItem(c, itemId)) return c;
  const nextItems = c.inventory.items.map(i =>
    i.id === itemId ? { ...i, equipped } : i
  );
  return syncEquippedAttacks({ ...c, inventory: { ...c.inventory, items: nextItems } });
}

/** Toggle equipped flag on an inventory item and re-sync attacks in one go. */
export function toggleEquipped(c: Character, itemId: string): Character {
  const item = c.inventory.items.find(i => i.id === itemId);
  if (!item) return c;
  return setEquipped(c, itemId, !item.equipped);
}

/** Unequip the inventory item that backs an attack; returns unchanged character for manual attacks. */
export function unequipFromAttack(c: Character, attackId: string): Character {
  const atk = c.combat.attacks.find(a => a.id === attackId);
  if (!atk?.sourceItemId) return c;
  return toggleEquipped(c, atk.sourceItemId); // flips equipped → false, syncs
}
