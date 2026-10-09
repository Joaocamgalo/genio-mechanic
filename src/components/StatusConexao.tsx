import { useConnectivity } from '../offline/connectivity/useConnectivity';

export function StatusConexao() {
  const online = useConnectivity();

  return (
    <div
      className={`cm-online-pill cm-online-pill--${online ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
      aria-label={online ? 'Sistema online' : 'Sistema offline'}
    >
      <span className="cm-online-pill__dot" aria-hidden="true" />
      {online ? 'Sistema online' : 'Sistema offline'}
    </div>
  );
}
