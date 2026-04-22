interface Props {
  label: string;
  total: number;
  used?: number;
  items?: Array<{ id: string; label: string }>;
  onItemClick?: (id: string) => void;
}

export function SlotPips({ label, total, used = 0, items, onItemClick }: Props) {
  if (total <= 0) return null;
  const occupied = items ?? Array.from({ length: used }).map((_, i) => ({ id: `${label}-${i}`, label: "Ocupado" }));
  return (
    <div class="slots">
      <span class="slots__label">{label}</span>
      <div class="slots__row">
        {Array.from({ length: total }).map((_, i) => {
          const item = occupied[i];
          return item ? (
            <button
              type="button"
              class="pip pip--occupied"
              title={item.label}
              aria-label={`Ver conjuro preparado: ${item.label}`}
              onClick={() => onItemClick?.(item.id)}
            >
              <span class="pip__label">{item.label}</span>
            </button>
          ) : (
            <span class="pip pip--empty" title="Espacio libre" aria-label="Espacio libre" />
          );
        })}
      </div>
    </div>
  );
}
