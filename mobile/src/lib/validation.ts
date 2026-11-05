/** Simple, friendly form checks. The server checks again; these just help the user. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export const PASSWORD_MIN = 8;
/** Passwords longer than 72 bytes are silently cut by the hashing used by Supabase. */
export const PASSWORD_MAX = 72;

/** Returns a message describing what's wrong with the password, or null if it's fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return 'That password is too long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least one letter and one number.';
  }
  return null;
}

/** Email codes from Supabase are 6–10 digits depending on project settings. */
export function isValidCode(code: string): boolean {
  return /^\d{6,10}$/.test(code.trim());
}

export const NAME_MAX = 60;

/** Trims a display name; empty means "no name" (null). */
export function cleanName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed : null;
}

export function nameProblem(name: string): string | null {
  const cleaned = cleanName(name);
  if (cleaned && cleaned.length > NAME_MAX) return `Keep it under ${NAME_MAX} characters.`;
  return null;
}
