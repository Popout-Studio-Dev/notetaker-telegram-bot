import { format, formatInTimeZone } from 'date-fns-tz';

// Default to local timezone, but can be configured per user in the future
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatDateTime(
    date: Date,
    includeTime: boolean = false,
): string {
    try {
        if (!date) return '';

        // Format date in user's timezone
        const dateFormat = includeTime
            ? 'MMM d, yyyy h:mm aa zzz'
            : 'MMM d, yyyy';
        return format(date, dateFormat, { timeZone: DEFAULT_TIMEZONE });
    } catch (error) {
        console.error('Error formatting date:', error);
        return date.toLocaleDateString();
    }
}

// Get the user's timezone from their system
export function getCurrentTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Format a date for display, optionally including time if present
export function formatDateTimeForDisplay(
    date: Date,
    timezone: string = getCurrentTimezone(),
): string {
    // Check if the date has a time component (not midnight UTC)
    const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;

    if (hasTime) {
        // Format with date and time
        return formatInTimeZone(date, timezone, "M/d/yyyy 'at' h:mm a");
    } else {
        // Format date only
        return formatInTimeZone(date, timezone, 'M/d/yyyy');
    }
}
