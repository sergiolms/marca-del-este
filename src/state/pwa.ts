// PWA install-prompt & service-worker update helpers.

import { signal } from "@preact/signals";

// ---------- Install prompt ----------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

/** True when the browser offers the A2HS prompt and user hasn't dismissed it yet. */
export const canInstall = signal(false);

/** True when the app is already running as an installed PWA. */
export const isInstalled = signal(
  typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
);

export function listenInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e as BeforeInstallPromptEvent;
    canInstall.value = true;
  });

  window.addEventListener("appinstalled", () => {
    canInstall.value = false;
    isInstalled.value = true;
    deferredPrompt.value = null;
  });
}

export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt.value;
  if (!prompt) return false;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === "accepted") {
    canInstall.value = false;
    deferredPrompt.value = null;
  }
  return outcome === "accepted";
}

// ---------- SW update ----------

export const updateReady = signal(false);

export function listenSwUpdate(): void {
  if (!("serviceWorker" in navigator)) return;

  // With skipWaiting + clientsClaim, a new SW activates immediately and
  // takes control via controllerchange. We detect this to show the banner.
  // We skip the very first controllerchange (initial registration on first visit).
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return; // first install, nothing to update
    updateReady.value = true;
  });

  // Periodically check for new versions (every 60 min).
  navigator.serviceWorker.ready.then((reg) => {
    setInterval(() => {
      reg.update().catch(() => { /* offline, ignore */ });
    }, 60 * 60 * 1000);
  });
}

export function applyUpdate(): void {
  window.location.reload();
}
