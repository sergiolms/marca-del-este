import type { Spell } from "../../rules/types";
import { Icon } from "./Icon";

interface Props {
  spell: Spell;
  onClose: () => void;
  onToggleUsed: () => void;
  onTogglePrepared: () => void;
  canPrepare: boolean;
  onEdit: () => void;
}

export function SpellDetail({ spell, onClose, onToggleUsed, onTogglePrepared, canPrepare, onEdit }: Props) {
  const canTogglePrepared = spell.prepared || canPrepare;
  return (
    <div class="picker-backdrop" onClick={onClose}>
      <div class="picker item-detail" onClick={e => e.stopPropagation()} style="height:auto;max-height:85vh">
        <header class="picker__head">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <div class="item-detail__ico"><Icon name="magic" /></div>
            <div>
              <h3 style="margin:0;font-size:20px">{spell.name || "Conjuro"}</h3>
              <div style="color:var(--ink-muted);font-size:12px;margin-top:2px">
                Nivel {spell.level}{spell.duration ? ` · ${spell.duration}` : ""}
              </div>
            </div>
          </div>
          <button class="d20 d20--small" onClick={onClose} aria-label="Cerrar"><Icon name="cancel" /></button>
        </header>

        <div class="item-detail__badges">
          <span class={`chip ${spell.prepared ? "chip--holy" : ""}`}>{spell.prepared ? "Equipado" : "Aprendido"}</span>
          <span class={`chip ${spell.used ? "chip--fire" : "chip--cold"}`}>{spell.prepared ? spell.used ? "Usado hoy" : "Disponible" : "Sin preparar"}</span>
        </div>

        <div class="item-detail__body">
          <div class="item-detail__stats">
            <div class="item-detail__stat">
              <span class="item-detail__stat-label">Nivel</span>
              <span class="item-detail__stat-value">{String(spell.level)}</span>
            </div>
            <div class="item-detail__stat">
              <span class="item-detail__stat-label">Duración</span>
              <span class="item-detail__stat-value">{spell.duration || "—"}</span>
            </div>
          </div>

          {spell.notes && (
            <div class="item-detail__desc">
              {spell.notes}
            </div>
          )}
        </div>

        <footer class="picker__foot" style="display:flex;gap:8px;justify-content:flex-end;padding-top:10px">
          <button class="chip btn-with-icon" onClick={onEdit}><Icon name="edit" />Editar</button>
          <button
            class="chip btn-with-icon"
            disabled={!canTogglePrepared}
            title={canTogglePrepared ? undefined : "Sin espacios libres de este nivel"}
            onClick={onTogglePrepared}
          >
            <Icon name={spell.prepared ? "equip" : "open"} />
            {spell.prepared ? "Desequipar" : "Equipar"}
          </button>
          <button class="buy-btn btn-with-icon" disabled={!spell.prepared} onClick={onToggleUsed}>
            {spell.used ? <Icon name="rest" /> : <Icon name="magic" />}
            {spell.used ? "Restaurar" : "Marcar usado"}
          </button>
        </footer>
      </div>
    </div>
  );
}
