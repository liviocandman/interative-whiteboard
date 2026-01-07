const USER_ID_KEY = 'whiteboard_user_id';

/**
 * Gets or creates a persistent user ID stored in localStorage.
 * This ID survives page reloads and allows the server to recognize
 * the same user across different socket connections.
 */
export function getPersistentUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
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
