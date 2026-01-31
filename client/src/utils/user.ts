const USER_ID_KEY = 'whiteboard_user_id';

/**
 * Generate a UUID-like string using Math.random() as fallback
 * when crypto.randomUUID is not available (non-secure contexts)
 */
function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets or creates a persistent user ID stored in localStorage.
 * This ID survives page reloads and allows the server to recognize
 * the same user across different socket connections.
 */
export function getPersistentUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Use crypto.randomUUID if available (secure contexts), otherwise fallback
    userId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : generateFallbackUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Clears the persistent user ID.
 * Useful for "logout" or "start fresh" functionality.
 */
export function clearPersistentUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}
