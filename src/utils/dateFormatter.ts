/**
 * Canonical date formatting utilities for notes and syntheses.
 */

const noteDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Formats a numeric epoch timestamp into human-readable format: "Oct 3, 2026"
 */
export function formatNoteDate(timestamp?: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  return noteDateFormatter.format(new Date(timestamp));
}
