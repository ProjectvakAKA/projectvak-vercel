/**
 * Input validation utilities
 * Prevents security issues and crashes from invalid input
 */

/**
 * Validates a filename to prevent path traversal and other security issues
 */
export function validateFilename(filename: string): { valid: boolean; error?: string } {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename must be a non-empty string' };
  }

  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  // Prevent null bytes
  if (filename.includes('\0')) {
    return { valid: false, error: 'Filename contains null bytes' };
  }

  // Only allow alphanumeric, dots, dashes, underscores, and spaces
  const validPattern = /^[a-zA-Z0-9._\s-]+$/;
  if (!validPattern.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._\s-]/g, '') // Remove invalid characters
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '_') // Replace slashes with underscores
    .trim()
    .substring(0, 255); // Limit length
}

/**
 * Validates email format (basic)
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for ContractFile
 */
export function isContractFile(obj: unknown): obj is {
  name: string;
  path: string;
  size?: number;
  modified?: string;
  pand_adres?: string | null;
  pand_type?: string | null;
  verhuurder_naam?: string | null;
  huurprijs?: number | null;
  confidence?: number | null;
  processed?: string;
} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as any).name === 'string' &&
    'path' in obj &&
    typeof (obj as any).path === 'string'
  );
}
