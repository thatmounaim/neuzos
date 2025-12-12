/**
 * Format number with spaces for better readability (Penya format)
 * Examples: 1 000, 10 000, 1 000 000, 1 000 000 000
 * @param value - The number to format
 * @returns Formatted string with spaces as thousand separators
 */
export function formatPenya(value: number): string {
  if (isNaN(value) || value === 0) return '0';
  return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Parse formatted number string (with spaces) to number
 * @param value - The formatted string to parse
 * @returns The numeric value
 */
export function parsePenya(value: string): number {
  const cleaned = value.replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format a string input in real-time as the user types
 * Maintains cursor position while formatting
 * @param input - The input element
 * @param value - The current value
 * @returns The formatted value
 */
export function formatPenyaInput(input: HTMLInputElement, value: string): string {
  const cursorPosition = input.selectionStart || 0;
  const oldValue = input.value;

  // Remove all spaces
  const cleaned = value.replace(/\s/g, '');

  // Only allow digits
  if (!/^\d*$/.test(cleaned)) {
    return oldValue;
  }

  // Format with spaces
  const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Calculate new cursor position
  const spacesBefore = (oldValue.substring(0, cursorPosition).match(/\s/g) || []).length;
  const spacesAfter = (formatted.substring(0, cursorPosition).match(/\s/g) || []).length;
  const newCursorPosition = cursorPosition + (spacesAfter - spacesBefore);

  // Set cursor position after the DOM updates
  setTimeout(() => {
    input.setSelectionRange(newCursorPosition, newCursorPosition);
  }, 0);

  return formatted || '0';
}

