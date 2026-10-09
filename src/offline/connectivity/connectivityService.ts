export type ConnectivityListener = (online: boolean) => void;

export function getConnectivitySnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function subscribeConnectivity(listener: ConnectivityListener): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
