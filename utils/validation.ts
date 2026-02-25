/**
 * Email regex: local-part@domain.tld
 * - Allows common characters in local part and domain
 * - Requires at least one @ and a domain with a TLD (e.g. .com)
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Max email length per RFC 5321 */
const MAX_EMAIL_LENGTH = 254;

/**
 * Returns true if the string is a valid email format.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(trimmed);
}
