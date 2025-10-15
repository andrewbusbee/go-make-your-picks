/**
 * Plain text sanitizer for user/admin inputs that should be stored/rendered as text.
 *
 * Goals:
 * - Do NOT HTML-encode normal characters like '/'
 * - Strip HTML tags to avoid injection
 * - Trim whitespace
 */
export function sanitizePlainText(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove any HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  // Normalize whitespace
  return withoutTags.trim();
}

export function sanitizePlainTextArray(values: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(v => sanitizePlainText(v)).filter(v => v.length > 0);
}


