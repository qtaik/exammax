/**
 * Parse a datetime-local string (YYYY-MM-DDTHH:MM, no timezone)
 * as a UTC Date in the given IANA timezone.
 */
export function parseDatetimeInTimezone(
  dateStr: string,
  timezone: string,
): Date {
  const [datePart, timePart] = dateStr.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)

  // Construct the local timestamp as UTC to get offset for that instant
  const tempUtc = Date.UTC(year, month - 1, day, hour, minute)

  // Get the UTC offset for the target timezone at this instant
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).format(new Date(tempUtc))

  const match = formatted.match(/GMT([+-]\d{2}):(\d{2})/)
  const offsetHours = match ? parseInt(match[1]) : 0
  const offsetMinutes = match ? parseInt(match[2]) : 0
  const offsetMs = (offsetHours * 60 + offsetMinutes) * 60 * 1000

  // UTC = local time - offset
  return new Date(tempUtc - offsetMs)
}
