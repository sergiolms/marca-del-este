// Modal sheet that shows the full info of an inventory item, shop item or
// magic item. Pure presentation — the parent decides when to open/close.

import type { InventoryItem, MagicItemInstance } from "../../rules/types";
import type { ShopItem, MagicItem } from "../../data/catalog/types";
import { Icon } from "./Icon";
import { enchantmentLabels } from "../../rules/attackMath";

type Payload =
  | { source: "inventory"; item: InventoryItem }
  | { source: "shop-mundane"; item: ShopItem }
  | { source: "shop-magic"; item: MagicItem }
  | { source: "magic-instance"; item: MagicItemInstance };

interface Props {
  payload: Payload;
  onClose: () => void;
  onAction?: { label: string; onClick: () => void; variant?: "success" | "danger" | "primary" };
  secondaryAction?: { label: string; onClick: () => void };
}

export function ItemDetail({ payload, onClose, onAction, secondaryAction }: Props) {
  const info = describe(payload);
  return (
    <div class="picker-backdrop" onClick={onClose}>
      <div class="picker item-detail" onClick={e => e.stopPropagation()} style="height:auto;max-height:85vh">
        <header class="picker__head">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <div class="item-detail__ico">{info.icon}</div>
            <div>
              <h3 style="margin:0;font-size:20px">{info.title}</h3>
              {info.subtitle && <div style="color:var(--ink-muted);font-size:12px;margin-top:2px">{info.subtitle}</div>}
            </div>
          </div>
          <button class="d20 d20--small" onClick={onClose} aria-label="Cerrar"><Icon name="cancel" /></button>
        </header>

        {info.badges.length > 0 && (
          <div class="item-detail__badges">
            {info.badges.map(b => (
              <span class={`chip ${b.variant ?? ""}`}>{b.icon && <Icon name={b.icon} />}{b.text}</span>
            ))}
          </div>
        )}

        <div class="item-detail__body">
          {info.stats.length > 0 && (
            <div class="item-detail__stats">
              {info.stats.map(s => (
                <div class="item-detail__stat">
                  <span class="item-detail__stat-label">{s.label}</span>
                  <span class="item-detail__stat-value">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {info.description && (
            <div class="item-detail__desc">
              {info.description}
            </div>
          )}

          {info.notes && (
            <div class="item-detail__notes">
              <b>Notas:</b> {info.notes}
            </div>
          )}
        </div>

        <footer class="picker__foot" style="display:flex;gap:8px;justify-content:flex-end;padding-top:10px">
          {secondaryAction && (
            <button class="chip btn-with-icon" onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
          )}
          {onAction && (
            <button
              class="buy-btn btn-with-icon"
              style={actionStyle(onAction.variant)}
              onClick={onAction.onClick}
            >
              {onAction.label}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function actionStyle(v: "success" | "danger" | "primary" | undefined): string {
  if (v === "success") return "background:var(--success);box-shadow:0 2px 0 #244a2e";
  if (v === "danger") return "background:var(--fail);box-shadow:0 2px 0 #661f16";
  return "";
}

// ----- describe: produce a presentation-ready view model -----

interface Info {
  icon: string;
  title: string;
  subtitle?: string;
  badges: Array<{ text: string; variant?: string; icon?: import("./Icon").IconName }>;
  stats: Array<{ label: string; value: string }>;
  description?: string;
  notes?: string;
}

function describe(p: Payload): Info {
  if (p.source === "inventory") {
    const i = p.item;
    const enchNames = enchantmentLabels(i.enchantments);
    return {
      icon: i.damage ? "⚔" : "🎒",
      title: i.name || "Sin nombre",
      subtitle: enchNames.length > 0 ? enchNames.join(" · ") : undefined,
      badges: [
        ...(i.equipped ? [{ text: "Equipado", variant: "chip--magic" }] : []),
        ...(i.damage ? [{ text: `Daño ${i.damage}`, variant: "chip--fire" }] : []),
        ...(i.armorClass ? [{ text: `CA ${i.armorClass}`, variant: "chip--cold" }] : []),
        ...(i.ranged ? [{ text: "Distancia", variant: "chip--cold" }] : []),
      ],
      stats: [
        { label: "Cantidad", value: `×${i.quantity}` },
        { label: "Peso (unidad)", value: `${i.weight} kg` },
        { label: "Peso total", value: `${(i.weight * i.quantity).toFixed(2)} kg` },
        ...(i.value ? [{ label: "Valor", value: i.value }] : []),
      ],
      notes: i.notes || undefined,
    };
  }
  if (p.source === "shop-mundane") {
    const it = p.item;
    return {
      icon: categoryIcon(it.category, it.ranged),
      title: it.name,
      subtitle: it.category,
      badges: [
        ...(it.damage ? [{ text: `Daño ${it.damage}`, variant: "chip--fire" }] : []),
        ...(it.armorClass ? [{ text: `CA ${it.armorClass}`, variant: "chip--cold" }] : []),
        ...(it.twoHanded ? [{ text: "A dos manos" }] : []),
        ...(it.ranged ? [{ text: "Distancia", variant: "chip--cold" }] : []),
      ],
      stats: [
        { label: "Precio", value: it.cost },
        ...(it.weight !== null ? [{ label: "Peso", value: `${it.weight} kg` }] : []),
        ...(it.range ? [{ label: "Alcance", value: it.range }] : []),
      ],
      notes: it.notes || undefined,
    };
  }
  if (p.source === "shop-magic") {
    const m = p.item;
    return {
      icon: magicKindIcon(m.kind),
      title: m.name,
      subtitle: kindLabel(m.kind),
      badges: [
        ...(m.consumable ? [{ text: "Consumible", variant: "chip--fire" }] : []),
        ...(m.charges !== undefined ? [{ text: `${m.charges}${m.maxCharges ? `/${m.maxCharges}` : ""} cargas`, variant: "chip--holy" }] : []),
        ...(m.usesPerDay ? [{ text: `${m.usesPerDay}/día`, variant: "chip--cold" }] : []),
      ],
      stats: [
        { label: "Precio", value: m.cost },
        { label: "Tipo", value: kindLabel(m.kind) },
      ],
      description: m.effect,
      notes: m.notes || undefined,
    };
  }
  // magic-instance
  const mi = p.item;
  return {
    icon: magicKindIcon(mi.kind),
    title: mi.name,
    subtitle: kindLabel(mi.kind),
    badges: [
      ...(mi.consumable ? [{ text: "Consumible", variant: "chip--fire" }] : []),
      ...(mi.charges !== undefined ? [{ text: `${mi.charges}${mi.maxCharges ? `/${mi.maxCharges}` : ""} cargas`, variant: "chip--holy" }] : []),
      ...(mi.usesPerDay ? [{ text: `${mi.usesToday ?? 0}/${mi.usesPerDay} hoy`, variant: "chip--cold" }] : []),
    ],
    stats: [],
    description: mi.notes || undefined,
  };
}

function kindLabel(k: MagicItem["kind"]): string {
  switch (k) {
    case "ring": return "Anillo";
    case "staff": return "Bastón";
    case "rod": return "Cetro";
    case "wand": return "Varita";
    case "scroll": return "Pergamino";
    case "potion": return "Poción";
    case "wondrous": return "Objeto maravilloso";
  }
}
function magicKindIcon(k: MagicItem["kind"]): string {
  switch (k) {
    case "ring": return "💍";
    case "staff": return "🕯";
    case "rod": return "⚡";
    case "wand": return "🪄";
    case "scroll": return "📜";
    case "potion": return "🧪";
    case "wondrous": return "✦";
  }
}
function categoryIcon(cat: string, ranged?: boolean): string {
  if (cat === "Armas") return ranged ? "🏹" : "🗡";
  if (cat === "Armaduras") return "🛡";
  if (cat === "Escudos") return "🛡";
  if (cat === "Municiones") return "🪶";
  if (cat === "Monturas") return "🐴";
  if (cat === "Transporte") return "🛶";
  return "🎒";
}
