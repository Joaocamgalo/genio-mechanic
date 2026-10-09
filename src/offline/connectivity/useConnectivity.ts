import { useSyncExternalStore } from 'react';
import {
  getConnectivitySnapshot,
  subscribeConnectivity,
} from './connectivityService';

export function useConnectivity(): boolean {
  return useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    () => true
  );
}
