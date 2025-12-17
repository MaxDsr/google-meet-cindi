
const USER_ID_KEY = 'cindy_userId';
const USERNAME_KEY = 'cindy_username';

/**
 * Get userId from localStorage
 */
export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

/**
 * Get username from localStorage
 */
export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

/**
 * Set user data in localStorage
 */
export function setUser(userId: string, username: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USERNAME_KEY, username);
}

/**
 * Clear user data from localStorage
 */
export function clearUser(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return !!getUserId() && !!getUsername();
}

/**
 * Register or login user
 */
export async function registerOrLogin(username: string): Promise<{ userId: string; username: string }> {
  try {
    const response = await fetch(`/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error('Failed to register/login');
    }

    const data = await response.json();
    setUser(data.userId, data.username);
    
    return data;
  } catch (error) {
    console.error('Error registering/logging in:', error);
    throw error;
  }
}

