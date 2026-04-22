// Classic OSR ability modifier table used by "Aventuras en la Marca del Este".
//   3       -> -3
//   4-5     -> -2
//   6-8     -> -1
//   9-12    ->  0
//   13-15   -> +1
//   16-17   -> +2
//   18+     -> +3

export function abilityModifier(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

export function formatModifier(mod: number): string {
  if (mod > 0) return `+${mod}`;
  if (mod < 0) return `${mod}`;
  return "+0";
}
