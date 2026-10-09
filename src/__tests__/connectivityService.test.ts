import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeConnectivity } from '../offline/connectivity/connectivityService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('connectivityService', () => {
  it('registra e remove listeners de conectividade', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal('window', { addEventListener, removeEventListener });

    const unsubscribe = subscribeConnectivity(() => undefined);

    expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
