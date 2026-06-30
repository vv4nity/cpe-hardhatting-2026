import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Download,
  LayoutDashboard,
  Map,
  QrCode,
  Send,
  User,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavTab {
  href: string;
  label: string;
  /** short label for the mobile bottom bar */
  short: string;
  icon: LucideIcon;
}

/** Landing route for a freshly authenticated user of each role. */
export function homeFor(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/overview";
    case "scanner":
      return "/scanner";
    default:
      return "/dashboard";
  }
}

/** Role-aware navigation (top tabs on desktop, bottom bar on mobile). */
export function navTabsFor(role: Role): NavTab[] {
  if (role === "admin") {
    return [
      { href: "/admin/overview", label: "Overview", short: "Overview", icon: LayoutDashboard },
      { href: "/admin/seating", label: "Seating Map", short: "Seating", icon: Map },
      { href: "/admin/invitations", label: "Invitations", short: "Invites", icon: Send },
      { href: "/admin/export", label: "Export", short: "Export", icon: Download },
    ];
  }
  if (role === "president") {
    return [
      { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
      { href: "/qr", label: "My QR", short: "QR", icon: QrCode },
      { href: "/seating", label: "Seating", short: "Seating", icon: Armchair },
      { href: "/oversight", label: "Block Oversight", short: "Block", icon: Users },
      { href: "/profile", label: "Profile", short: "Profile", icon: User },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
    { href: "/qr", label: "My QR", short: "QR", icon: QrCode },
    { href: "/seating", label: "Seating", short: "Seating", icon: Armchair },
    { href: "/profile", label: "Profile", short: "Profile", icon: User },
  ];
}
