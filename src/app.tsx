import { useEffect } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import { loadFromStorage, startAutoPersist, activeCharacter, addCharacter } from "./state/store";
import { newCharacter } from "./state/character";
import { TopBar } from "./components/ui/TopBar";
import { Dock, type TabKey } from "./components/ui/Dock";
import { FxLayer } from "./components/ui/FxLayer";
import { PwaBanner } from "./components/ui/PwaBanner";
import { SheetScreen } from "./screens/Sheet";
import { CombatScreen } from "./screens/Combat";
import { InventoryScreen } from "./screens/Inventory";
import { ShopScreen } from "./screens/Shop";
import { MagicScreen } from "./screens/Magic";
import { JournalScreen } from "./screens/Journal";

const tab = signal<TabKey>("sheet");

const tabLabel = computed<string>(() => {
  switch (tab.value) {
    case "sheet": return "Hoja";
    case "combat": return "Combate";
    case "inventory": return "Mochila";
    case "shop": return "Tienda";
    case "magic": return "Magia";
    case "journal": return "Diario";
  }
});

export function App() {
  useEffect(() => {
    let disposed = false;
    let disposePersist: (() => void) | undefined;

    void loadFromStorage().then(() => {
      if (disposed) return;
      disposePersist = startAutoPersist();
      // Ensure there's at least one character after storage has loaded.
      if (!activeCharacter.value) {
        const c = newCharacter({ name: "Aventurero", classKey: "guerrero", className: "Guerrero", raceKey: "humano", race: "Humano", alignment: "Neutral" });
        addCharacter(c);
      }
    });

    return () => {
      disposed = true;
      disposePersist?.();
    };
  }, []);

  return (
    <div class="app">
      <PwaBanner />
      <TopBar label={tabLabel.value} />
      <main class="app__main">
        {tab.value === "sheet"     && <SheetScreen />}
        {tab.value === "combat"    && <CombatScreen />}
        {tab.value === "inventory" && <InventoryScreen />}
        {tab.value === "shop"      && <ShopScreen />}
        {tab.value === "magic"     && <MagicScreen />}
        {tab.value === "journal"   && <JournalScreen />}
      </main>
      <Dock active={tab.value} onChange={k => (tab.value = k)} />
      <FxLayer />
    </div>
  );
}
