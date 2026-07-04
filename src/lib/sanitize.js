/**
 * Input Sanitization Utility
 * Strips XSS payloads, SQL injection patterns, and malicious content from user input.
 */

// Patterns that indicate potential XSS or injection attacks
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<script[^>]*>/gi,
  /<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*"[^"]*"/gi,  // on* event handlers like onclick="..."
  /on\w+\s*=\s*'[^']*'/gi,  // on* event handlers like onclick='...'
  /on\w+\s*=\s*[^\s>]+/gi,  // on* event handlers unquoted
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>[\s\S]*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<svg[^>]*on\w+[\s\S]*?<\/svg>/gi,
  /<img[^>]+on\w+[^>]*>/gi,
  /<a[^>]+on\w+[^>]*>/gi,
  /<body[^>]+on\w+[^>]*>/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

const SQL_PATTERNS = [
  /'\s*OR\s*'?1'?\s*=\s*'?1/gi,
  /'\s*OR\s*'?1'?\s*=\s*'?1'?--/gi,
  /;\s*DROP\s+TABLE/gi,
  /;\s*DELETE\s+FROM/gi,
  /;\s*INSERT\s+INTO/gi,
  /;\s*UPDATE\s+.*SET/gi,
  /UNION\s+SELECT/gi,
  /--\s*$/gi,
  /\/\*[\s\S]*?\*\//gi,
];

/**
 * Sanitize a single string value.
 * Strips HTML/script tags and dangerous patterns.
 * @param {string} value
 * @returns {string}
 */
export function sanitizeString(value) {
  if (!value || typeof value !== 'string') return value;

  let cleaned = value;

  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove SQL injection patterns
  for (const pattern of SQL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Collapse multiple spaces that may result from removals
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Check if input contains suspicious patterns without modifying it.
 * Returns true if potentially malicious content is detected.
 * @param {string} value
 * @returns {boolean}
 */
export function isSuspicious(value) {
  if (!value || typeof value !== 'string') return false;
  for (const pattern of [...XSS_PATTERNS, ...SQL_PATTERNS]) {
    if (pattern.test(value)) return true;
  }
  return false;
}

/**
 * Recursively sanitize an object's string fields.
 * Skips keys that likely contain URLs or structured data.
 * @param {object} obj
 * @param {string[]} skipKeys — keys to skip (e.g. media_urls)
 * @returns {object} — sanitized copy
 */
export function sanitizeObject(obj, skipKeys = []) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.includes(key)) {
      result[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, skipKeys);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Keys that typically hold URLs or file references — don't sanitize these
export const DEFAULT_SKIP_KEYS = [
  'media_urls', 'access_media_urls', 'photo_url', 'photo_urls',
  'evidence_photo_url', 'driver_evidence_photo_url', 'signature_url',
  'license_doc_url', 'insurance_doc_url', 'registration_doc_url',
  'inspection_doc_url', 'profile_photo_url', 'exterior_photo_url',
  'interior_photo_url', 'background_check_report_url', 'items_pdf_url',
  'onsite_photo_url', 'target_url', 'image_url', 'stripe_session_id',
  'id', 'assigned_driver_id', 'driver_profile_id', 'move_request_id',
  'business_account_id', 'lead_id', 'recurring_delivery_id',
  'proof_of_delivery_id', 'converted_move_id', 'matched_driver_id',
  'matched_vehicle_rental_id', 'declined_driver_ids', 'url',
];