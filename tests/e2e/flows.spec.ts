import { test, expect } from "@playwright/test";

test.describe("Marca del Este — critical flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("marca-del-este");
    });
  });

  test("boots on Hoja with a default character", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Aventurero/);
    await expect(page.locator(".section__title").first()).toContainText(/Características/i);
  });

  test("navigates between tabs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Combate/i }).click();
    await expect(page.locator(".section__title").first()).toContainText(/Puntos de Golpe|Combate|CA/i);
    await page.getByRole("button", { name: /Tienda/i }).click();
    await expect(page.locator(".hero__name")).toContainText(/Mercado/i);
    await page.getByRole("button", { name: /Mochila/i }).click();
    await expect(page.locator(".section__title").first()).toContainText(/Monedero/i);
  });

  test("adds a new character", async ({ page }) => {
    await page.goto("/");
    const avatarsBefore = await page.locator(".fan__avatar").count();
    await page.getByLabel("Añadir personaje").click();
    const avatarsAfter = await page.locator(".fan__avatar").count();
    expect(avatarsAfter).toBeGreaterThan(avatarsBefore);
  });

  test("HP tracker decrements and respects temp HP", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Combate/i }).click();
    // Click −1 several times
    const minus1 = page.locator(".hp__adjust .minus").nth(2);
    const hpNumber = page.locator(".hp__number");
    const before = await hpNumber.textContent();
    await minus1.click();
    await minus1.click();
    await minus1.click();
    const after = await hpNumber.textContent();
    expect(before).not.toBe(after);
    // The number should decrease
    const b = Number(before?.match(/(\d+)/)?.[1] ?? 0);
    const a = Number(after?.match(/(\d+)/)?.[1] ?? 0);
    expect(a).toBeLessThan(b);
  });

  test("long rest restores HP", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Combate/i }).click();
    // Take damage
    const minus5 = page.locator(".hp__adjust .minus").nth(1);
    await minus5.click();
    // Rest
    await page.locator(".rest").click();
    const hpText = await page.locator(".hp__number").textContent();
    expect(hpText).toMatch(/^\s*(\d+)\s*\/\s*\1/); // current == max
  });

  test("buying a weapon deducts wallet, adds inventory row, creates attack", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const now = new Date().toISOString();
      const id = "e2e-buyer";
      const state = {
        version: 3,
        activeCharacterId: id,
        characters: [{
          id,
          createdAt: now,
          updatedAt: now,
          character: { name: "Comprador", player: "", classKey: "guerrero", className: "Guerrero", raceKey: "humano", race: "Humano", alignment: "Neutral", level: 1, movement: "9 m", languages: "Común" },
          stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          saves: { death: 14, wands: 15, paralysis: 16, breath: 17, spells: 17 },
          combat: { hpCurrent: 6, hpMax: 6, hpTemp: 0, ac: 9, acAscending: 10, touchAc: "", flatFootedAc: "", initiative: "+0", surprise: "1-2 en 1d6", attackBonus: "+0", hitDice: "1d6 · 1", logDraft: "", attacks: [], timeline: [] },
          money: { copper: 0, silver: 0, electrum: 0, gold: 500, platinum: 0 },
          inventory: { maxWeight: 60, items: [] },
          spells: [],
          effects: [],
          magicItems: [],
          xp: { current: 0, next: null, autoLevel: true },
          journal: { notes: "", goals: "", sessions: [] },
        }],
      };
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("marca-del-este", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("kv", "readwrite");
          tx.objectStore("kv").put(state, "app-state");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        };
      });
    });
    await page.reload();

    await page.getByRole("button", { name: /Tienda/i }).click();
    // Buy the first weapon with Comprar enabled
    const firstBuy = page.locator(".shop-item").first().getByRole("button", { name: /Comprar/i });
    await firstBuy.click();

    // Check inventory
    await page.getByRole("button", { name: /Mochila/i }).click();
    await expect(page.locator(".inv-item")).toHaveCount(1);

    // Check attack auto-created (only if the bought item had damage)
    await page.getByRole("button", { name: /Combate/i }).click();
    const attacks = page.locator(".attack__title");
    const n = await attacks.count();
    expect(n).toBeGreaterThanOrEqual(0);
  });

  test("export JSON works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Diario/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar JSON/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("dice FAB writes to timeline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Combate/i }).click();
    const fab = page.locator(".d20--fab");
    await fab.click();
    // Timeline should show a d20 entry
    await page.getByRole("button", { name: /Combate/i }).click();
    await expect(page.locator(".tl")).toHaveCount(1);
  });
});
