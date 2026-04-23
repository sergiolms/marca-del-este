import { describe, expect, it } from "vitest";
import { findAutocompleteMatches } from "../../src/components/ui/ItemAutocomplete";

describe("inventory item autocomplete", () => {
  it("keeps suggesting the rulebook mace when the user adds extra words", () => {
    const matches = findAutocompleteMatches("maza de dos manos", 3);

    expect(matches[0]?.name).toBe("Maza");
    expect(matches[0]?.damage).toBe("1d6");
    expect(matches[0]?.weight).toBe(2);
  });

  it("prefers the exact two-handed sword over other swords", () => {
    const matches = findAutocompleteMatches("espada de dos manos", 3);

    expect(matches[0]?.name).toBe("Espada de dos manos");
    expect(matches[0]?.twoHanded).toBe(true);
  });

  it("matches catalog names without requiring accents", () => {
    const matches = findAutocompleteMatches("baston", 3);

    expect(matches[0]?.name).toBe("Bastón");
  });
});
