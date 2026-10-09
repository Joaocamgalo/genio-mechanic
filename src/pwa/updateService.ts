export function activateWaitingServiceWorker(
  registration: ServiceWorkerRegistration
): boolean {
  if (!registration.waiting) return false;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
