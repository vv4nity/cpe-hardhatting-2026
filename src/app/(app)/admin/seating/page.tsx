"use client";

import { Minus, Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { refreshSupabaseData } from "@/lib/supabase/refresh";
import { BLOCK_OPTIONS, STATUS_OPTIONS } from "@/lib/views";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeatMap, SeatLegend } from "@/components/seating/seat-map";
import { SelectedSeatPanel } from "@/components/seating/selected-seat";

export default function AdminSeatingPage() {
  const [refreshing, setRefreshing] = useState(false);
  const seatSearch = useApp((s) => s.seatSearch);
  const setSeatSearch = useApp((s) => s.setSeatSearch);
  const fBlock = useApp((s) => s.fBlock);
  const setFBlock = useApp((s) => s.setFBlock);
  const fStatus = useApp((s) => s.fStatus);
  const setFStatus = useApp((s) => s.setFStatus);
  const cellSize = useApp((s) => s.cellSize);
  const zoom = useApp((s) => s.zoom);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await refreshSupabaseData();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="VENUE SEATING MAP"
        subtitle="500 seats across Blocks A–E. Search, filter and inspect any seat."
        actions={
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={seatSearch}
              onChange={(e) => setSeatSearch(e.target.value)}
              placeholder="Search seat (e.g. C12), name or email…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={fBlock} onValueChange={setFBlock}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SeatLegend />
              <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card p-1 lg:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => zoom(-3)}
                  aria-label="Zoom out"
                >
                  <Minus />
                </Button>
                <span className="w-12 text-center text-xs font-semibold tabular-nums">
                  {cellSize}px
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => zoom(3)}
                  aria-label="Zoom in"
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <SeatMap />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SelectedSeatPanel />
        </div>
      </div>
    </div>
  );
}
