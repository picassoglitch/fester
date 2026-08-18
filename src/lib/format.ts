const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "America/Mexico_City";

export function formatTime(value: Date | string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** "1h 12m" / "8m" / "45s" */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function relativeTime(value: Date | string): string {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60000) return "hace un momento";
  return `hace ${formatDuration(diff)}`;
}
