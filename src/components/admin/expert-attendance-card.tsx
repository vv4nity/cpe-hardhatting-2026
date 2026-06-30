"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SendResult {
  id: string;
  name: string;
  email: string;
  status: "sent" | "failed";
  reason?: string;
  account?: "primary" | "backup";
}

interface PresidentRow {
  id: string;
  name: string;
  email: string;
}

const BATCH = 6;

export function ExpertAttendanceCard() {
  const [presidents, setPresidents] = useState<PresidentRow[]>([]);
  const [presReady, setPresReady] = useState(true);
  const [presSending, setPresSending] = useState(false);
  const [presTotal, setPresTotal] = useState(0);
  const [presResults, setPresResults] = useState<SendResult[]>([]);
  const [presTest, setPresTest] = useState("");
  const [presTesting, setPresTesting] = useState(false);

  const loadPresidents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/president-email");
      if (res.ok) {
        const b = await res.json();
        setPresidents(b.presidents ?? []);
        setPresReady(b.emailReady);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadPresidents();
  }, [loadPresidents]);

  async function briefPresidents() {
    if (!presidents.length) return;
    setPresSending(true);
    setPresResults([]);
    setPresTotal(presidents.length);
    try {
      for (let i = 0; i < presidents.length; i += BATCH) {
        const ids = presidents.slice(i, i + BATCH).map((p) => p.id);
        const res = await fetch("/api/admin/president-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const b = await res.json().catch(() => ({}));
        if (!res.ok) break;
        setPresResults((prev) => [...prev, ...((b.results ?? []) as SendResult[])]);
      }
    } finally {
      setPresSending(false);
    }
  }

  async function sendPresTest() {
    const to = presTest.trim();
    if (!to) return;
    setPresTesting(true);
    try {
      const res = await fetch("/api/admin/president-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: to }),
      });
      await res.json().catch(() => ({}));
    } finally {
      setPresTesting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-4 text-brand-orange" />
            Brief block presidents · {presidents.length}
          </h2>
          <Button onClick={briefPresidents} disabled={presSending || presidents.length === 0 || !presReady}>
            {presSending ? <Loader2 className="size-4 animate-spin" /> : <Send />}
            Email all {presidents.length} presidents
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Sends every block president a branded briefing on their role — monitoring their block&apos;s attendance, following up with absent blockmates, and helping with activation/invite issues — with a button to their Block Oversight dashboard.
        </p>
        {!presReady && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-orange">
            <TriangleAlert className="size-4" />
            Email isn&apos;t configured yet (Gmail). Sending is disabled.
          </p>
        )}

        {(presSending || presResults.length > 0) && (
          <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>
                {presSending ? "Sending…" : "Send complete"} {presResults.length}/{presTotal}
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="text-brand-green">
                  {presResults.filter((r) => r.status === "sent").length} sent
                </span>
                {presResults.filter((r) => r.status === "failed").length > 0 && (
                  <span className="text-brand-red">
                    {" "}· {presResults.filter((r) => r.status === "failed").length} failed
                  </span>
                )}
                {presResults.filter((r) => r.account === "backup").length > 0 && (
                  <span className="text-brand-orange">
                    {" "}· {presResults.filter((r) => r.account === "backup").length} via backup
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand-orange transition-all duration-300"
                style={{
                  width: presTotal ? `${(presResults.length / presTotal) * 100}%` : "0%",
                }}
              />
            </div>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {presResults.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs">
                  {r.status === "sent" ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-brand-green" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-brand-red" />
                  )}
                  <span className="w-40 shrink-0 truncate font-medium">{r.name}</span>
                  <span className="flex-1 truncate text-muted-foreground">{r.email}</span>
                  {r.account === "backup" && r.status === "sent" && (
                    <span className="shrink-0 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                      backup
                    </span>
                  )}
                  {r.status === "failed" && (
                    <span className="shrink-0 truncate text-brand-red">{r.reason}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Preview — send a test to yourself
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={presTest}
              onChange={(e) => setPresTest(e.target.value)}
              placeholder="you@gmail.com"
              className="sm:flex-1"
            />
            <Button variant="outline" onClick={sendPresTest} disabled={presTesting || !presTest.trim() || !presReady} className="shrink-0">
              {presTesting ? <Loader2 className="size-4 animate-spin" /> : <Mail />}
              Send test
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}