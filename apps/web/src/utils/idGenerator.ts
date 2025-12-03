/**
 * ID Generator Utility
 * Generates unique IDs for projects, assets, etc.
 */

/**
 * Generate a unique ID
 * Uses crypto.randomUUID if available, otherwise falls back to timestamp + random
 */
export function generateId(prefix?: string): string {
  let id: string;
  
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Use browser's crypto API (most secure)
    id = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  } else {
    // Fallback to timestamp + random
    id = Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
  }
  
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(prefix?: string): string {
  const id = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Nanoid-like generator (12 characters, URL-safe)
 */
export function nanoid(size: number = 12): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  
  // Use crypto.getRandomValues for better randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    // Fallback
    for (let i = 0; i < size; i++) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  
  return id;
}


