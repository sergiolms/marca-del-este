import { updateReady, applyUpdate, canInstall, promptInstall } from "../../state/pwa";

export function PwaBanner() {
  if (updateReady.value) {
    return (
      <div class="pwa-banner pwa-banner--update" role="alert">
        <span>Nueva versión disponible</span>
        <button class="pwa-banner__btn" onClick={applyUpdate}>Actualizar</button>
      </div>
    );
  }

  if (canInstall.value) {
    return (
      <div class="pwa-banner pwa-banner--install">
        <span>Instala la app en tu dispositivo</span>
        <button class="pwa-banner__btn" onClick={promptInstall}>Instalar</button>
        <button class="pwa-banner__dismiss" onClick={() => (canInstall.value = false)} aria-label="Cerrar">×</button>
      </div>
    );
  }

  return null;
}
