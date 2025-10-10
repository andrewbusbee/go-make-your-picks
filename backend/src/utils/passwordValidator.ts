/**
 * Password validation utility with industry-standard security requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Common weak passwords to block
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567890', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'admin',
  'administrator', 'user', 'welcome', 'login', 'root'
];

/**
 * Validates password strength according to OWASP guidelines
 * @param password The password to validate
 * @param minLength Minimum required length (default: 8)
 * @returns Validation result with errors if any
 */
export function validatePassword(password: string, minLength: number = 8): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  // Check maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>?/\\)');
  }

  // Check against common weak passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak))) {
    errors.push('Password is too common or weak. Please choose a more secure password.');
  }

  // Check for sequential characters (e.g., 123, abc)
  if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Password should not contain sequential characters');
  }

  // Check for repeated characters (e.g., aaa, 111)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates password for initial setup (slightly more lenient)
 * @param password The password to validate
 * @returns Validation result with errors if any
 */
export function validatePasswordBasic(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum 8 characters for basic validation
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Must contain lowercase, uppercase, and numbers
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check against common weak passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.some(weak => lowerPassword === weak || lowerPassword.includes(weak))) {
    errors.push('Password is too common or weak. Please choose a more secure password.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

