"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { useApp } from "@/lib/store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildDatasetFromRows,
  loadDataset,
  timestampToMinutes,
  type RawSeatRow,
} from "@/lib/data/source";
import { initialsOf } from "@/lib/format";
import type { Role, SeatStatus, SessionUser } from "@/lib/types";

/**
 * Bridges the real Supabase session into the app store. When a user is signed
 * in, it loads their profile + the seat data (role-aware: staff see names,
 * attendees see an anonymized layout) and populates `user` + `data`. Leaves the
 * front-only demo untouched when there's no Supabase session.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const realRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    async function sync(session: Session | null) {
      if (!session?.user || !active) return;
      const uid = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      if (!profile || !active) return;

      const role = profile.role as Role;
      const isStaff = role === "admin" || role === "scanner";
      let rows: RawSeatRow[] = [];
      let myStatus: SeatStatus = (profile.status as SeatStatus) ?? "assigned";

      if (isStaff) {
        const { data } = await supabase
          .from("directory")
          .select("full_name, email, block, seat, status, checked_in_at, gate")
          .not("seat", "is", null);
        rows = (data ?? []).map((d) => ({
          seat: d.seat as string,
          block: d.block as string,
          status: d.status as string,
          name: d.full_name as string,
          email: d.email as string,
          checkIn: timestampToMinutes(d.checked_in_at as string),
          gate: d.gate as string,
        }));
      } else {
        const [{ data: layout }, { data: mine }] = await Promise.all([
          supabase.from("seat_layout").select("seat, block, status"),
          supabase
            .from("directory")
            .select("full_name, block, seat, status, checked_in_at, gate")
            .eq("claimed_by", uid)
            .maybeSingle(),
        ]);
        if (mine?.status) myStatus = mine.status as SeatStatus;
        rows = (layout ?? [])
          .filter((s) => s.seat)
          .map((s) => {
            const isMine = !!mine && s.seat === mine.seat;
            return {
              seat: s.seat as string,
              block: s.block as string,
              status: s.status as string,
              name: isMine ? (mine!.full_name as string) : "Attendee",
              email: isMine ? (profile.email as string) : "",
              checkIn: isMine
                ? timestampToMinutes(mine!.checked_in_at as string)
                : null,
              gate: isMine ? (mine!.gate as string) : null,
            };
          });
      }

      if (!active) return;
      const user: SessionUser = {
        id: uid,
        role,
        name: profile.full_name,
        email: profile.email ?? session.user.email ?? "",
        initials: initialsOf(profile.full_name),
        block: profile.block ?? undefined,
        seat: profile.seat ?? undefined,
        status: myStatus,
        presidentBlock: role === "president" ? profile.block : undefined,
      };
      realRef.current = true;
      useApp.setState({ user, data: buildDatasetFromRows(rows) });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        sync(data.session);
      } else if (useApp.getState().user) {
        // No real session, but a stale (e.g. expired) user is persisted — clear it.
        useApp.setState({ user: null, data: loadDataset() });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        sync(session);
      } else if (event === "SIGNED_OUT" && realRef.current) {
        realRef.current = false;
        useApp.setState({ user: null, data: loadDataset() });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
