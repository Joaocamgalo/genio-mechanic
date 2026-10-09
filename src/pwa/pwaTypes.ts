export type ServiceWorkerUpdateState =
  | 'unsupported'
  | 'registering'
  | 'ready'
  | 'update-available'
  | 'error';

export interface ServiceWorkerRegistrationResult {
  state: ServiceWorkerUpdateState;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}
