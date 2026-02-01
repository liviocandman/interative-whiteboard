export function getCorsOrigin(): string | string[] {

  const origin = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;

  if (!origin) {
    if (process.env.NODE_ENV !== 'production') {
      return [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/
      ] as any; // Socket.io supports regex in origins
    }

    return [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ];
  }

  const origins = origin.split(',').map(o => o.trim().replace(/\/$/, ''));

  return origins.length === 1 ? origins[0] : origins;
}
