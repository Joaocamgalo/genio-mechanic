import type { ServiceWorkerRegistrationResult } from './pwaTypes';

export async function registerControlMaqServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (!('serviceWorker' in navigator)) {
    return { state: 'unsupported', registration: null, error: null };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    await registration.update();

    return {
      state: registration.waiting ? 'update-available' : 'ready',
      registration,
      error: null,
    };
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    console.error('Falha ao registrar o Service Worker do ControlMaq:', error);
    return { state: 'error', registration: null, error };
  }
}
