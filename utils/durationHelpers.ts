export function stringDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  if (parts.length === 2) return parts[0] * 60 + parts[1];

  return parts[0] || 0;
}
