"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { refreshSupabaseData } from "@/lib/supabase/refresh";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeatMap, SeatLegend } from "@/components/seating/seat-map";
import { SelectedSeatPanel } from "@/components/seating/selected-seat";
import { MySeatCard } from "@/components/seating/my-seat-card";

export default function SeatingPage() {
  const user = useApp((s) => s.user)!;
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await refreshSupabaseData();
    setRefreshing(false);
  }

  const presScope =
    user.role === "president" ? user.presidentBlock || null : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={presScope ? `SEATING · ${presScope}` : "VENUE SEATING MAP"}
        subtitle={
          presScope
            ? "Filtered to your supervised block. Your seat is ringed in orange."
            : "View-only. Your seat is highlighted — refresh to simulate live check-ins."
        }
        actions={
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-5">
            <SeatLegend className="mb-4" />
            <SeatMap presScope={presScope} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <MySeatCard />
          <SelectedSeatPanel />
        </div>
      </div>
    </div>
  );
}
