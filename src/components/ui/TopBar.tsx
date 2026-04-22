import { useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { appState, activeCharacter, switchCharacter, addCharacter, removeCharacter } from "../../state/store";
import { newCharacter } from "../../state/character";
import { haptic } from "../../state/dice";
import { Icon } from "./Icon";

interface Props { label: string; }

const FAN_MAX = 5;

export function TopBar({ label }: Props) {
  const chars = appState.value.characters;
  const active = activeCharacter.value;
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  // Always keep the active avatar visible in the fan by bubbling it to the front.
  const activeIdx = chars.findIndex(c => c.id === active?.id);
  const fan = chars.slice();
  if (activeIdx > FAN_MAX - 1) {
    const [act] = fan.splice(activeIdx, 1);
    fan.unshift(act);
  }
  const visibleFan = fan.slice(0, FAN_MAX);
  const hiddenChars = fan.slice(FAN_MAX);

  const startPress = (id: string) => () => {
    longPressed.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      haptic("heavy");
      longPressed.current = true;
      setMenuFor(id);
    }, 500);
  };
  const endPress = (id: string) => () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (longPressed.current) return;
    // Tap: switch OR, if tapping the already-active, open the menu
    if (id === active?.id) setMenuFor(id);
    else switchCharacter(id);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const rightClick = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setMenuFor(id);
  };

  const confirmRemove = (id: string) => {
    const c = chars.find(x => x.id === id);
    const name = c?.character.name || "este personaje";
    if (confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) {
      removeCharacter(id);
    }
    setMenuFor(null);
  };

  return (
    <header class="topbar">
      <span class="topbar__label">{label}</span>
      <div class="fan" role="tablist" aria-label="Personajes">
        {visibleFan.map((c, i, arr) => {
          const n = arr.length;
          const offset = i - (n - 1) / 2;
          const rotate = offset * 7;
          const isActive = c.id === active?.id;
          return (
            <button
              key={c.id}
              class={`fan__avatar ${isActive ? "active" : ""}`}
              style={{ transform: isActive ? "scale(1.12)" : `rotate(${rotate}deg)` }}
              onMouseDown={startPress(c.id)} onMouseUp={endPress(c.id)} onMouseLeave={cancelPress}
              onTouchStart={startPress(c.id) as unknown as (e: TouchEvent) => void}
              onTouchEnd={endPress(c.id) as unknown as (e: TouchEvent) => void}
              onContextMenu={rightClick(c.id)}
              aria-label={c.character.name || "Sin nombre"}
              title={isActive ? "Tócalo otra vez, haz clic derecho o mantén pulsado para opciones" : c.character.name || "Sin nombre"}
              role="tab"
              aria-selected={isActive}
            >
              {(c.character.name || "?").slice(0, 1).toUpperCase()}
            </button>
          );
        })}
        {hiddenChars.length > 0 && (
          <button class="fan__avatar fan__more" aria-label={`Ver ${hiddenChars.length} personajes más`} onClick={() => setOverflow(true)}>
            +{hiddenChars.length}
          </button>
        )}
      </div>
      <button
        class="fan__add"
        aria-label="Añadir personaje"
        onClick={() => addCharacter(newCharacter({ name: "Nuevo aventurero" }))}
      >
        <Icon name="userAdd" />
      </button>

      {overflow && createPortal(
        <div class="char-menu-backdrop" onClick={() => setOverflow(false)}>
          <div class="char-menu" onClick={e => e.stopPropagation()}>
            <h3 style="margin:0 0 8px;font-family:var(--font-display);font-size:18px">Todos los personajes</h3>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow-y:auto">
              {chars.map(c => (
                <button
                  key={c.id}
                  class={`chip btn-with-icon char-row ${c.id === active?.id ? "is-active" : ""}`}
                  style="justify-content:flex-start;padding:10px 12px;font-size:13px"
                  onClick={() => { switchCharacter(c.id); setOverflow(false); }}
                >
                  <span class="fan__avatar" style="width:28px;height:28px;margin:0;font-size:14px">
                    {(c.character.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span style="flex:1;text-align:left">{c.character.name || "Sin nombre"}</span>
                  <span style="color:var(--ink-muted);font-size:11px">{c.character.className || "—"} · Nv {c.character.level}</span>
                </button>
              ))}
            </div>
            <button class="chip btn-with-icon" style="margin-top:10px;padding:8px 12px;justify-content:center;width:100%" onClick={() => setOverflow(false)}><Icon name="cancel" />Cerrar</button>
          </div>
        </div>
      , document.body)}

      {menuFor && createPortal(
        <div class="char-menu-backdrop" onClick={() => setMenuFor(null)}>
          <div class="char-menu" onClick={e => e.stopPropagation()}>
            <h3 style="margin:0 0 8px;font-family:var(--font-display);font-size:18px">
              {chars.find(c => c.id === menuFor)?.character.name || "Sin nombre"}
            </h3>
            <p style="margin:0 0 12px;color:var(--ink-muted);font-size:13px">
              ¿Qué quieres hacer con este personaje?
            </p>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="buy-btn btn-with-icon" style="background:var(--class-mago);box-shadow:0 2px 0 #143861" onClick={() => { switchCharacter(menuFor); setMenuFor(null); }}><Icon name="open" />Abrir</button>
              {chars.length > 1 && (
                <button class="buy-btn btn-with-icon" style="background:var(--fail);box-shadow:0 2px 0 #661f16" onClick={() => confirmRemove(menuFor)}><Icon name="trash" />Eliminar</button>
              )}
              <button class="chip btn-with-icon" style="padding:8px 12px;justify-content:center" onClick={() => setMenuFor(null)}><Icon name="cancel" />Cancelar</button>
            </div>
            <p style="margin:10px 0 0;color:var(--ink-muted);font-size:11px;text-align:center">
              Consejo: toca tu avatar activo o mantén pulsado otro avatar para abrir este menú.
            </p>
          </div>
        </div>
      , document.body)}
    </header>
  );
}
