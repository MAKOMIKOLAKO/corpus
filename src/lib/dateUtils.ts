/**
 * Format a date for display in the user's timezone.
 * All functions accept either a Date object or an ISO string.
 */

// Relative time: "2 hours ago", "yesterday", "3 days ago", "Mar 15"
export function formatRelativeTime(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // For older dates: show formatted date in user's timezone
  return formatDate(d, timezone);
}

// Short date: "Mar 15, 2026"
export function formatDate(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Long date: "Monday, March 15, 2026"
export function formatLongDate(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// Date and time: "Mar 15, 2026 at 2:30 PM"
export function formatDateTime(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Time only: "2:30 PM"
export function formatTime(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Month and year only: "March 2026"
export function formatMonthYear(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    timeZone: timezone,
    month: 'long',
    year: 'numeric'
  });
}

// Date-only for journal club / alerts (no time component): "Monday, March 15, 2026"
// This replaces the existing formatJournalClubDate function
export function formatDateOnly(dateStr: string, timezone: string = 'UTC'): string {
  // dateStr is YYYY-MM-DD — parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day); // local date construction
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
    // No timezone needed — YYYY-MM-DD dates have no time component
  });
}

// For use in <time> datetime attribute (always UTC ISO)
export function toISOString(date: Date | string): string {
  return new Date(date).toISOString();
}

// Get the user's timezone abbreviation for display: "EST", "PST"
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}