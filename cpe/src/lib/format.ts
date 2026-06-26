/** minutes-after-midnight -> "7:05 AM" */
export function minutesToTime(m: number | null | undefined): string {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, "0")} ${ap}`;
}

/** hour (24h) -> "7AM" */
export function hourLabel(h: number): string {
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}${ap}`;
}

export function initialsOf(name: string): string {
  return (name || "  ")
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    attendee: "Attendee",
    president: "Block President",
    scanner: "Scanner",
    admin: "Admin",
  };
  return map[role] || role;
}
