// ==============================================================================
// PRAJA SEVA - UNIVERSAL DATE FORMAT SSOT HELPER (DD-MM-YYYY)
// ==============================================================================

/**
 * Formats a Date object or ISO string strictly into DD-MM-YYYY format.
 * Example: 2026-11-22T12:00:00Z -> "22-11-2026"
 */
export function formatDDMMYYYY(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats a Date object or ISO string into human readable Indian format with 12-hour time.
 * Example: "22-11-2026, 04:30 PM"
 */
export function formatDateTime(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dateStr = formatDDMMYYYY(d);
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${dateStr}, ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Calculates turnaround duration between two timestamps in a human friendly string.
 * Example: "4 Hours 20 Mins"
 */
export function calculateTurnaround(start: Date | string, end: Date | string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return 'Immediate';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} Mins`;
  if (minutes === 0) return `${hours} Hours`;
  return `${hours} Hours ${minutes} Mins`;
}
