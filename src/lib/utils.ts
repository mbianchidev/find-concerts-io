export function formatDate(
  value: string,
  short = false,
  includeYear = !short
): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'Date to be announced';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

export function formatTime(value: string, dateOnly = false): string {
  if (dateOnly || value.length === 10) return 'Time to be announced';
  return `${value.slice(11, 16)} / venue local time`;
}
export function localCalendarDate(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
