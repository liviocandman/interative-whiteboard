export function getBackendUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  const currentHost = window.location.hostname;
  const isLocalHost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  if (isLocalHost) {
    return envUrl || 'http://localhost:4000';
  }

  let port = '4000';
  if (envUrl) {
    try {
      const url = new URL(envUrl);
      port = url.port || port;

      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname);
      if (!isIp && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return envUrl;
      }
    } catch {
    }
  }
  return `${window.location.protocol}//${currentHost}:${port}`;
}
