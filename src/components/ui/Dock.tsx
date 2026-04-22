import { Icon, type IconName } from "./Icon";

export type TabKey = "sheet" | "combat" | "inventory" | "shop" | "magic" | "journal";

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

const TABS: Array<{ key: TabKey; ico: IconName; label: string }> = [
  { key: "sheet",     ico: "shield", label: "Hoja" },
  { key: "combat",    ico: "sword", label: "Combate" },
  { key: "inventory", ico: "bag", label: "Mochila" },
  { key: "shop",      ico: "shop", label: "Tienda" },
  { key: "magic",     ico: "magic", label: "Magia" },
  { key: "journal",   ico: "book", label: "Diario" },
];

export function Dock({ active, onChange }: Props) {
  return (
    <nav class="dock" aria-label="Secciones">
      {TABS.map(t => (
        <button
          key={t.key}
          class={`dock__item ${active === t.key ? "active" : ""}`}
          onClick={() => onChange(t.key)}
          aria-current={active === t.key}
        >
          <span class="dock__ico" aria-hidden="true"><Icon name={t.ico} /></span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
