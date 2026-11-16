// ---------------------------------------------------------------------------
// lib/game-scan.ts
// Security scan shared by the upload route and the AI game generator.
// ---------------------------------------------------------------------------

// Dangerous patterns scanned in HTML/JS content
export const DANGEROUS_PATTERNS = [
  /\beval\s*\(/gi,
  /\bnew\s+Function\s*\(/gi,
  /\bdocument\.cookie\b/gi,
  /\bfetch\s*\(\s*['"`]https?:\/\//gi,
  /\bXMLHttpRequest\b/gi,
  /\bimport\s*\(\s*['"`]https?:\/\//gi,
  /\bnavigator\.sendBeacon\s*\(\s*['"`]https?:\/\//gi,
];

/**
 * Return the source of every dangerous pattern found in the content.
 * An empty array means the content passed the scan.
 */
export function scanGameHtml(content: string): string[] {
  const violations: string[] = [];
  for (const pattern of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      violations.push(pattern.source);
    }
  }
  return violations;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
