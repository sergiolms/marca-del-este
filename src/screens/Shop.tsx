import { useState, useMemo } from "preact/hooks";
import { activeCharacter, updateActive } from "../state/store";
import type { ShopItem, MagicItem } from "../data/catalog/types";
import shopCatalog from "../data/catalog/shopItems.json";
import magicCatalog from "../data/catalog/magicItems.json";
import { parsePriceToCopper, walletToCopper, copperToWallet, walletToGold } from "../rules/wallet";
import { uid } from "../state/character";
import { entry } from "../state/timeline";
import type { InventoryItem, MagicItemInstance } from "../rules/types";
import { Icon } from "../components/ui/Icon";
import { syncEquippedAttacks } from "../rules/equip";
import { ItemDetail } from "../components/ui/ItemDetail";

const mundane = shopCatalog as ShopItem[];
const magic = magicCatalog as MagicItem[];

type Category = "Todo" | "Mágico" | ShopItem["category"];

const MUNDANE_CATEGORIES = Array.from(new Set(mundane.map(i => i.category)));
const CATEGORIES: Category[] = ["Todo", "Mágico", ...MUNDANE_CATEGORIES];

type UnifiedItem =
  | { kind: "mundane"; data: ShopItem }
  | { kind: "magic"; data: MagicItem };

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

function magicIcon(k: MagicItem["kind"]): string {
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

function mundaneIcon(it: ShopItem): string {
  if (it.category === "Armas") return it.ranged ? "🏹" : "🗡";
  if (it.category === "Armaduras") return "🛡";
  if (it.category === "Escudos") return "🛡";
  if (it.category === "Municiones") return "🪶";
  if (it.category === "Monturas") return "🐴";
  if (it.category === "Transporte") return "🛶";
  return "🎒";
}

export function ShopScreen() {
  const c = activeCharacter.value;
  const [cat, setCat] = useState<Category>("Todo");
  const [q, setQ] = useState("");
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const [detail, setDetail] = useState<UnifiedItem | null>(null);
  const walletCopper = c ? walletToCopper(c.money) : 0;

  const unified = useMemo<UnifiedItem[]>(() => {
    return [
      ...mundane.map(d => ({ kind: "mundane" as const, data: d })),
      ...magic.map(d => ({ kind: "magic" as const, data: d })),
    ];
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return unified.filter(u => {
      if (cat === "Mágico" && u.kind !== "magic") return false;
      if (cat !== "Todo" && cat !== "Mágico" && u.kind === "magic") return false;
      if (cat !== "Todo" && cat !== "Mágico" && u.kind === "mundane" && u.data.category !== cat) return false;
      if (needle) {
        const hay = u.kind === "mundane"
          ? [u.data.name, u.data.category, u.data.damage, u.data.notes]
          : [u.data.name, kindLabel(u.data.kind), u.data.effect, u.data.notes];
        if (!hay.some(s => s?.toLowerCase().includes(needle))) return false;
      }
      if (onlyAffordable) {
        const price = parsePriceToCopper(u.data.cost);
        if (price === null || walletCopper < price) return false;
      }
      return true;
    });
  }, [cat, q, onlyAffordable, walletCopper, unified]);

  if (!c) return <div class="empty">Crea un personaje para empezar.</div>;

  const buyMundane = (it: ShopItem, btn: HTMLElement) => {
    const priceCopper = parsePriceToCopper(it.cost);
    if (priceCopper === null || walletCopper < priceCopper) return;
    const card = btn.closest(".shop-item") as HTMLElement | null;
    card?.classList.add("is-bought");
    window.setTimeout(() => card?.classList.remove("is-bought"), 600);
    updateActive(cc => {
      const money = copperToWallet(walletToCopper(cc.money) - priceCopper);
      const exists = cc.inventory.items.find(x => x.name === it.name && x.value === it.cost);
      const items: InventoryItem[] = exists
        ? cc.inventory.items.map(x => x.id === exists.id ? { ...x, quantity: x.quantity + 1 } : x)
        : [...cc.inventory.items, {
            id: uid(), locked: true,
            equipped: !!it.damage,
            name: it.name, quantity: 1, weight: it.weight ?? 0, value: it.cost,
            notes: it.notes ?? "",
            damage: it.damage,
            ranged: it.ranged,
            armorClass: it.armorClass,
          }];
      const next = {
        ...cc,
        money,
        inventory: { ...cc.inventory, items },
        combat: {
          ...cc.combat,
          timeline: [
            entry(`🏪 Comprado: <b>${it.name}</b> por ${it.cost}`),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      };
      return syncEquippedAttacks(next);
    });
  };

  const buyMagic = (it: MagicItem, btn: HTMLElement) => {
    const priceCopper = parsePriceToCopper(it.cost);
    if (priceCopper === null || walletCopper < priceCopper) return;
    const card = btn.closest(".shop-item") as HTMLElement | null;
    card?.classList.add("is-bought");
    window.setTimeout(() => card?.classList.remove("is-bought"), 600);
    updateActive(cc => {
      const money = copperToWallet(walletToCopper(cc.money) - priceCopper);
      const instance: MagicItemInstance = {
        id: uid(),
        catalogId: it.id,
        name: it.name,
        kind: it.kind,
        charges: it.charges,
        maxCharges: it.maxCharges,
        consumable: it.consumable,
        usesPerDay: it.usesPerDay,
        usesToday: 0,
        notes: it.effect,
      };
      return {
        ...cc,
        money,
        magicItems: [...cc.magicItems, instance],
        combat: {
          ...cc.combat,
          timeline: [
            entry(`✨ Comprado objeto mágico: <b>${it.name}</b> por ${it.cost}`),
            ...cc.combat.timeline,
          ].slice(0, 30),
        },
      };
    });
  };

  return (
    <div class="scroll">
      <header class="hero" style="padding-bottom:12px">
        <h1 class="hero__name" style="font-size:24px">El Mercado</h1>
        <div class="hero__meta">
          <span>{visible.length} artículos</span>
          <span style="flex:1"></span>
          <span class="wallet-chip"><span class="gold-dot"></span>{walletToGold(c.money).toFixed(2)} mo</span>
        </div>
      </header>

      <div class="shop-toggle-row">
        <label class="afford-toggle" title="Oculta los artículos que no puedas pagar ahora mismo">
          <input
            type="checkbox"
            checked={onlyAffordable}
            onChange={e => setOnlyAffordable((e.currentTarget as HTMLInputElement).checked)}
          />
          <span class="afford-toggle__track" aria-hidden="true"><span class="afford-toggle__thumb" /></span>
          <span class="afford-toggle__label">💰 Solo lo que puedo pagar</span>
        </label>
      </div>

      <div class="filter-chips">
        {CATEGORIES.map(k => (
          <span class={`filter-chip ${cat === k ? "on" : ""}`} onClick={() => setCat(k)}>{k}</span>
        ))}
      </div>

      <div style="padding:0 12px 10px">
        <input
          type="search"
          placeholder="Buscar…"
          value={q}
          onInput={e => setQ((e.currentTarget as HTMLInputElement).value)}
          style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--aged-line);background:var(--parchment-deep);color:var(--ink);font-size:14px"
        />
      </div>

      {visible.length === 0 && (
        <div class="card" style="margin:0 12px;padding:18px;text-align:center;color:var(--ink-muted);font-size:13px">
          {onlyAffordable
            ? "No hay artículos dentro de tu presupuesto. Vende algo desde la mochila o desactiva el filtro."
            : "Nada coincide con tu búsqueda."}
        </div>
      )}

      {groupVisible(visible).map(([groupLabel, rows]) => (
        <section class="section" style="margin-top:0" key={groupLabel}>
          <h2 class="section__title">{groupLabel}</h2>
          {rows.map(u => {
            const priceCopper = parsePriceToCopper(u.data.cost);
            const affordable = priceCopper !== null && walletCopper >= priceCopper;
            if (u.kind === "mundane") {
              const it = u.data;
              return (
                <div class="card shop-item" style={affordable ? undefined : "opacity:.55"} key={`m-${it.id}`} onClick={() => setDetail(u)}>
                  <div class="shop-item__ico">{mundaneIcon(it)}</div>
                  <div>
                    <div class="shop-item__name">{it.name}</div>
                    <div class="shop-item__desc">
                      {it.damage && <>{it.damage} · </>}
                      {it.armorClass && <>CA {it.armorClass} · </>}
                      {it.weight !== null && <>{it.weight} kg{it.ranged ? " · distancia" : ""}{it.twoHanded ? " · a dos manos" : ""}</>}
                    </div>
                    {it.notes && <div class="shop-item__effect clamp-3">{it.notes}</div>}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <div class="shop-item__price">{it.cost}</div>
                    <button class="buy-btn btn-with-icon" disabled={!affordable} onClick={e => buyMundane(it, e.currentTarget as HTMLElement)}>
                      <Icon name={affordable ? "buy" : "cancel"} />{affordable ? "Comprar" : "Sin fondos"}
                    </button>
                  </div>
                </div>
              );
            }
            const mi = u.data;
            return (
              <div class="card shop-item shop-item--magic" style={affordable ? undefined : "opacity:.55"} key={`g-${mi.id}`} onClick={() => setDetail(u)}>
                <div class="shop-item__ico shop-item__ico--magic">{magicIcon(mi.kind)}</div>
                <div>
                  <div class="shop-item__name">{mi.name}</div>
                  <div class="shop-item__desc">
                    <span class="chip chip--magic" style="padding:1px 6px;font-size:10px">{kindLabel(mi.kind)}</span>
                    {mi.charges !== undefined && <> · {mi.charges}{mi.maxCharges ? `/${mi.maxCharges}` : ""} cargas</>}
                    {mi.consumable && <> · consumible</>}
                    {mi.usesPerDay && <> · {mi.usesPerDay}/día</>}
                  </div>
                  <div class="shop-item__effect clamp-3">{mi.effect}</div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <div class="shop-item__price">{mi.cost}</div>
                  <button class="buy-btn btn-with-icon" disabled={!affordable} onClick={e => buyMagic(mi, e.currentTarget as HTMLElement)}>
                    <Icon name={affordable ? "buy" : "cancel"} />{affordable ? "Comprar" : "Sin fondos"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {detail && (() => {
        const price = parsePriceToCopper(detail.data.cost);
        const afford = price !== null && walletCopper >= price;
        const payload = detail.kind === "mundane"
          ? { source: "shop-mundane" as const, item: detail.data }
          : { source: "shop-magic" as const, item: detail.data };
        return (
          <ItemDetail
            payload={payload}
            onClose={() => setDetail(null)}
            onAction={afford ? {
              label: `Comprar · ${detail.data.cost}`, variant: "primary",
              onClick: () => {
                // Simulate a click on the hidden buy flow
                const btn = document.createElement("button");
                if (detail.kind === "mundane") buyMundane(detail.data, btn);
                else buyMagic(detail.data, btn);
                setDetail(null);
              },
            } : undefined}
            secondaryAction={!afford ? { label: "Sin fondos", onClick: () => {} } : undefined}
          />
        );
      })()}

      <div style="height:80px"></div>
    </div>
  );
}

function groupVisible(list: UnifiedItem[]): Array<[string, UnifiedItem[]]> {
  const map = new Map<string, UnifiedItem[]>();
  for (const u of list) {
    const key = u.kind === "mundane" ? u.data.category : `Mágico · ${kindLabel(u.data.kind)}`;
    const arr = map.get(key) ?? [];
    arr.push(u);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}
