export function getBackendUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;

  const currentHost = window.location.hostname;
  const isLocalHost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  if (envUrl && !isLocalHost) {
    try {
      const url = new URL(envUrl);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return envUrl;
      }
    } catch {
      // invalid URL in env, proceed to fallback
    }
  }

  if (!isLocalHost) {
    let port = '4000';
    if (envUrl) {
      try {
        const url = new URL(envUrl);
        port = url.port || port;
      } catch { }
    }
    return `${window.location.protocol}//${currentHost}:${port}`;
  }

  return envUrl || 'http://localhost:4000';
}
