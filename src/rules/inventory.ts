import type { InventoryItem } from "./types";

export type InventoryLocation = NonNullable<InventoryItem["location"]>;

export interface ContainerLoad {
  item: InventoryItem;
  location: InventoryLocation;
  capacity: number | null;
  load: number;
  exceeded: boolean;
}

export interface InventoryLoadSummary {
  hand: number;
  stored: number;
  containers: ContainerLoad[];
}

export function itemTotalWeight(item: InventoryItem): number {
  const q = Math.max(0, Number(item.quantity) || 0);
  const w = Math.max(0, Number(item.weight) || 0);
  return Math.round(q * w * 100) / 100;
}

export function itemLocation(item: InventoryItem): InventoryLocation {
  return item.location ?? "stored";
}

export function containerLocation(itemId: string): InventoryLocation {
  return `container:${itemId}`;
}

export function containerIdFromLocation(location: InventoryLocation): string | null {
  return location.startsWith("container:") ? location.slice("container:".length) : null;
}

export function isContainerItem(item: InventoryItem): boolean {
  return containerCapacity(item) !== null;
}

export function containerCapacity(item: InventoryItem): number | null {
  const explicit = Number(item.containerCapacity);
  if (Number.isFinite(explicit) && explicit > 0) return roundWeight(explicit);

  const text = `${item.name} ${item.notes}`.toLocaleLowerCase("es");
  const capMatch = text.match(/capacidad:\s*hasta\s*(\d+(?:[,.]\d+)?)\s*kg/i);
  if (capMatch) return roundWeight(Number(capMatch[1].replace(",", ".")));

  if (/\bmochila\b/.test(text)) return 20;
  if (/\bsaco\s+grande\b/.test(text)) return 30;
  if (/\bsaco\s+pequeñ?o\b/.test(text)) return 10;
  if (/\balforjas?\b/.test(text)) return 30;
  return null;
}

export function inventoryLoadSummary(items: readonly InventoryItem[]): InventoryLoadSummary {
  const containers = items
    .filter(isContainerItem)
    .map(item => {
      const location = containerLocation(item.id);
      const capacity = containerCapacity(item);
      const load = locationWeight(items, location, item.id);
      return {
        item,
        location,
        capacity,
        load,
        exceeded: capacity !== null && load > capacity,
      };
    });

  return {
    hand: locationWeight(items, "hand"),
    stored: locationWeight(items, "stored"),
    containers,
  };
}

export function locationWeight(items: readonly InventoryItem[], location: InventoryLocation, ownerId?: string): number {
  let sum = 0;
  for (const item of items) {
    if (item.id === ownerId) continue;
    if (item.equipped) continue;
    if (itemLocation(item) !== location) continue;
    sum += itemTotalWeight(item);
  }
  return roundWeight(sum);
}

export function locationLabel(location: InventoryLocation, items: readonly InventoryItem[]): string {
  if (location === "hand") return "A mano";
  if (location === "stored") return "Guardado";
  const id = containerIdFromLocation(location);
  const container = id ? items.find(item => item.id === id) : null;
  return container?.name || "Contenedor";
}

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}
