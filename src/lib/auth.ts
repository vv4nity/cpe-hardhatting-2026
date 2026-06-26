import type { Dataset, Role, SessionUser } from "@/lib/types";
import { initialsOf } from "@/lib/format";
import { PRESIDENT_SECTION } from "@/lib/sections";

/**
 * Mock auth.
 *
 * The real product will use passwordless magic-link sign-in; until that backend
 * exists, `resolveDemoUser` fabricates a believable session for a chosen role so
 * every screen is explorable. Replace with the Supabase/magic-link session when
 * ready — the rest of the app only depends on the returned `SessionUser`.
 */
export function resolveDemoUser(
  role: Role,
  data: Dataset,
  email?: string,
): SessionUser {
  if (role === "admin") {
    return {
      role: "admin",
      name: "Admin Console",
      email: email || "admin@hardhatting2026.org",
      initials: "AD",
    };
  }
  if (role === "scanner") {
    return {
      role: "scanner",
      name: "Scanner Station",
      email: email || "scanner@hardhatting2026.org",
      scanner: "Gate A · Reyes",
      initials: "SC",
    };
  }

  const base =
    data.attendees.find(
      (a) => a.block === PRESIDENT_SECTION && a.status === "present",
    ) || data.attendees[0];

  const user: SessionUser = {
    id: base.id,
    role,
    name: base.name,
    email: email || base.email,
    block: base.block,
    seat: base.seat,
    status: base.status,
    checkIn: base.checkIn,
    initials: initialsOf(base.name),
  };
  if (role === "president") user.presidentBlock = PRESIDENT_SECTION;
  return user;
}

export const DEMO_ROLES: { id: Role; label: string }[] = [
  { id: "attendee", label: "Attendee" },
  { id: "president", label: "Block President" },
  { id: "scanner", label: "Scanner" },
  { id: "admin", label: "Admin" },
];
