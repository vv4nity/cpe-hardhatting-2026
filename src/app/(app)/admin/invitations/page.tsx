"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  Mail,
  Send,
  TriangleAlert,
  Unlock,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Stats {
  total: number;
  registered: number;
  invited: number;
  pending: number;
}
interface SendResult {
  sent: number;
  failed: number;
  failures: { email: string; reason: string }[];
}

export default function InvitationsPage() {
  const exportData = useApp((s) => s.exportData);
  const showToast = useApp((s) => s.showToast);

  const [stats, setStats] = useState<Stats | null>(null);
  const [emailReady, setEmailReady] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [activationOpen, setActivationOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadActivation = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activation");
      if (res.ok) setActivationOpen((await res.json()).open);
    } catch {
      /* ignore */
    }
  }, []);

  async function toggleActivation() {
    if (activationOpen === null) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: !activationOpen }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setActivationOpen(body.open);
        showToast(
          body.open ? "Activation reopened" : "Activation paused",
          "ok",
        );
      } else {
        showToast("Couldn't update activation.", "warn");
      }
    } catch {
      showToast("Couldn't update activation.", "warn");
    } finally {
      setToggling(false);
    }
  }

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invite");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLoadErr(
          body.error === "not_configured"
            ? "Server invite key (SUPABASE_SECRET_KEY) isn't set yet."
            : "Couldn't load invitation stats.",
        );
        return;
      }
      const body = await res.json();
      setStats(body.stats);
      setEmailReady(body.emailReady);
      setLoadErr(null);
    } catch {
      setLoadErr("Couldn't reach the server.");
    }
  }, []);

  useEffect(() => {
    // on-mount data fetch; setState only fires after the awaited response
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    loadActivation();
  }, [loadStats, loadActivation]);

  async function sendInvites() {
    if (!stats || stats.pending === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/invite", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          body.error === "email_not_configured"
            ? "Email isn't configured (Gmail)."
            : body.error === "activation_paused"
              ? "Activation is paused — reopen it before sending."
              : "Sending failed.",
          "warn",
        );
        return;
      }
      setResult({ sent: body.sent, failed: body.failed, failures: body.failures ?? [] });
      if (body.stats) setStats(body.stats);
      showToast(`Sent ${body.sent} invitation${body.sent === 1 ? "" : "s"}`, "ok");
    } catch {
      showToast("Sending failed.", "warn");
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    const to = testEmail.trim();
    if (!to) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: to }),
      });
      const body = await res.json().catch(() => ({}));
      showToast(
        res.ok ? `Test invite sent to ${to}` : `Test failed: ${body.detail || body.error || "error"}`,
        res.ok ? "ok" : "warn",
      );
    } catch {
      showToast("Test send failed.", "warn");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="INVITATIONS"
        subtitle="Email every not-yet-registered attendee a personal link to activate their seat."
      />

      {/* activation switch */}
      {activationOpen !== null && (
        <div
          className={
            "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 " +
            (activationOpen
              ? "border-brand-green/30 bg-brand-green/5"
              : "border-brand-orange/40 bg-brand-orange/10")
          }
        >
          <div className="flex items-center gap-2.5">
            {activationOpen ? (
              <Unlock className="size-5 text-brand-green" />
            ) : (
              <Lock className="size-5 text-brand-orange" />
            )}
            <div>
              <div className="text-sm font-bold">
                Activation is {activationOpen ? "OPEN" : "PAUSED"}
              </div>
              <div className="text-xs text-muted-foreground">
                {activationOpen
                  ? "Invited students can activate their accounts."
                  : "Students see a “temporarily closed” message; sending is disabled."}
              </div>
            </div>
          </div>
          <Button
            variant={activationOpen ? "outline" : "default"}
            onClick={toggleActivation}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : activationOpen ? (
              <Lock />
            ) : (
              <Unlock />
            )}
            {activationOpen ? "Pause activation" : "Reopen activation"}
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard
          icon={<Users className="size-4 text-brand-orange" />}
          value={stats?.total}
          label="With email"
        />
        <CountCard
          icon={<CheckCircle2 className="size-4 text-brand-green" />}
          value={stats?.registered}
          label="Registered"
        />
        <CountCard
          icon={<Mail className="size-4 text-brand-orange" />}
          value={stats?.pending}
          label="Pending"
          highlight
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* invite */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Send invitations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each pending attendee gets a one-time activation link at the email
              on their directory record. Already-registered students are skipped,
              so it&apos;s safe to send again to chase stragglers.
            </p>

            {loadErr && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-red">
                <TriangleAlert className="size-4" />
                {loadErr}
              </p>
            )}
            {!emailReady && !loadErr && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-orange">
                <TriangleAlert className="size-4" />
                Email isn&apos;t configured yet (Gmail). Sending is disabled.
              </p>
            )}

            <Button
              size="lg"
              className="mt-5"
              onClick={sendInvites}
              disabled={sending || !stats || stats.pending === 0 || !emailReady || !!loadErr || activationOpen === false}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send />}
              {stats && stats.pending > 0
                ? `Send to ${stats.pending} pending`
                : "No pending invitations"}
            </Button>

            {result && (
              <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <Stat
                    icon={<CheckCircle2 className="size-4 text-brand-green" />}
                    value={result.sent}
                    label="Sent"
                  />
                  <Stat
                    icon={<TriangleAlert className="size-4 text-brand-red" />}
                    value={result.failed}
                    label="Failed"
                  />
                </div>
                {result.failures.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {result.failures.map((f) => (
                      <li key={f.email} className="truncate">
                        <span className="font-medium text-foreground">{f.email}</span> — {f.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* preview test */}
            <div className="mt-6 border-t border-border pt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Preview — send a test to yourself
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Sends one sample invite to any address. Changes nothing in the database.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="sm:flex-1"
                />
                <Button
                  variant="outline"
                  onClick={sendTest}
                  disabled={testing || !testEmail.trim() || !emailReady}
                  className="shrink-0"
                >
                  {testing ? <Loader2 className="size-4 animate-spin" /> : <Mail />}
                  Send test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* export */}
        <Card>
          <CardContent className="flex h-full flex-col p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Export attendance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Download the current attendance snapshot — including check-in times
              and gate — as a CSV for reporting or archiving.
            </p>
            <Button className="mt-auto" size="lg" onClick={exportData}>
              <Download />
              Export attendance CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CountCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value?: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-card p-4 shadow-sm " +
        (highlight ? "border-brand-orange/40" : "border-border")
      }
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-3xl leading-none">
        {value ?? "—"}
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card py-3">
      <div className="flex items-center justify-center gap-1.5 font-display text-2xl">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
