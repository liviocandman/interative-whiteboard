export function getCorsOrigin(): string | string[] {

  const origin = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;

  if (!origin) {
    return [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/
    ] as any; // Socket.io supports regex in origins
  }

  const origins = origin.split(',').map(o => o.trim().replace(/\/$/, ''));

  return origins.length === 1 ? origins[0] : origins;
}
