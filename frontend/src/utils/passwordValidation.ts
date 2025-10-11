/**
 * Centralized password validation utilities
 * Matches backend validation rules for consistency
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Common weak passwords to block (matches backend)
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567890', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'admin',
  'administrator', 'user', 'welcome', 'login', 'root'
];

/**
 * Validates password strength (matches backend validatePasswordBasic)
 * Used for: Admin creation, admin password reset
 */
export function validatePasswordBasic(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum 8 characters
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

/**
 * Validates password strength (matches backend validatePassword - strict)
 * Used for: Initial setup, password changes
 */
export function validatePasswordStrict(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length
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
 * Validates password confirmation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): PasswordValidationResult {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      errors: ['Passwords do not match']
    };
  }
  
  return {
    isValid: true,
    errors: []
  };
}

/**
 * Gets password requirements text for UI display
 */
export function getPasswordRequirements(level: 'basic' | 'strict' = 'basic'): string[] {
  if (level === 'strict') {
    return [
      'At least 8 characters',
      'One lowercase letter (a-z)',
      'One uppercase letter (A-Z)', 
      'One number (0-9)',
      'One special character (!@#$%^&*...)',
      'No common passwords',
      'No sequential characters (123, abc)',
      'No repeated characters (aaa, 111)'
    ];
  } else {
    return [
      'At least 8 characters',
      'One lowercase letter (a-z)',
      'One uppercase letter (A-Z)',
      'One number (0-9)',
      'No common passwords'
    ];
  }
}
