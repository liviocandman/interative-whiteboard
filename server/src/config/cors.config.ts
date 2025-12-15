/**
 * CORS Configuration Helper
 * Provides secure CORS origin configuration from environment variables
 */

/**
 * Get CORS origin from environment variables
 * Supports single origin or multiple origins separated by comma
 * @returns CORS origin string or array of origins
 */
export function getCorsOrigin(): string | string[] {
  const origin = process.env.CORS_ORIGIN;

  if (!origin) {
    // Default to common development URLs in development
    console.warn('⚠️  CORS_ORIGIN not set. Using default development origins.');
    console.warn('⚠️  For production, set CORS_ORIGIN to your client URL for security.');
    return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://192.168.1.2:5173'];
  }

  // Support multiple origins separated by comma
  if (origin.includes(',')) {
    return origin.split(',').map(o => o.trim());
  }

  return origin;
}
