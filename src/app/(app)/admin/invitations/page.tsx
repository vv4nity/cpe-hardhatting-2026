"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Pencil,
  RotateCw,
  Search,
  Send,
  TriangleAlert,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/app/page-header";
import { ExpertAttendanceCard } from "@/components/admin/expert-attendance-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Stats {
  total: number;
  registered: number;
  invited: number;
  pending: number;
  toSend: number;
}
interface Recipient {
  id: string;
  name: string;
  email: string;
  block: string;
  seat: string;
  registered: boolean;
  invited: boolean;
}
interface SendResult {
  id: string;
  name: string;
  email: string;
  status: "sent" | "failed";
  reason?: string;
  account?: "primary" | "backup";
}
interface EmailRequest {
  id: string;
  name: string;
  block: string;
  seat: string;
  currentEmail: string;
  requestedEmail: string;
  registered: boolean;
}

const BATCH = 6;

export default function InvitationsPage() {
  const showToast = useApp((s) => s.showToast);

  const [stats, setStats] = useState<Stats | null>(null);
  const [emailReady, setEmailReady] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [activationOpen, setActivationOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  const [requests, setRequests] = useState<EmailRequest[]>([]);
  const [reqBusy, setReqBusy] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  // sending
  const [sending, setSending] = useState(false);
  const [sendTotal, setSendTotal] = useState(0);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [resultSearch, setResultSearch] = useState("");

  // drill-down
  const [drill, setDrill] = useState<null | "registered" | "pending">(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  // fix-email form
  const [fixQuery, setFixQuery] = useState("");
  const [fixSel, setFixSel] = useState<Recipient | null>(null);
  const [fixEmail, setFixEmail] = useState("");
  const [fixSaving, setFixSaving] = useState(false);

  // preview test
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  const [reminderLabel, setReminderLabel] = useState<string | null>(null);
  const [reminderSentLabel, setReminderSentLabel] = useState<string | null>(null);
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invite");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setLoadErr(
          b.error === "not_configured"
            ? "Server invite key (SUPABASE_SECRET_KEY) isn't set yet."
            : "Couldn't load invitation stats.",
        );
        return;
      }
      const b = await res.json();
      setStats(b.stats);
      setEmailReady(b.emailReady);
      setLoadErr(null);
    } catch {
      setLoadErr("Couldn't reach the server.");
    }
  }, []);

  const loadRecipients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/recipients");
      if (res.ok) setRecipients((await res.json()).recipients ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadActivation = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activation");
      if (res.ok) setActivationOpen((await res.json()).open);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-requests");
      if (res.ok) setRequests((await res.json()).requests ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadReminder = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activation-reminder");
      if (res.ok) {
        const b = await res.json();
        setReminderLabel(b.scheduledLabel ?? null);
        setReminderSentLabel(b.sentLabel ?? null);
        setReminderScheduled(Boolean(b.scheduledLabel));
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function approveAll() {
    if (!requests.length) return;
    setApprovingAll(true);
    try {
      const res = await fetch("/api/admin/email-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all" }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("Couldn't approve all requests.", "warn");
        return;
      }
      showToast(
        `Approved ${b.approved} · ${b.sent} invite${b.sent === 1 ? "" : "s"} sent`,
        "ok",
      );
      loadRequests();
      loadStats();
      loadRecipients();
    } finally {
      setApprovingAll(false);
    }
  }

  async function handleRequest(id: string, action: "approve" | "reject") {
    setReqBusy(id);
    try {
      const res = await fetch("/api/admin/email-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("Couldn't update the request.", "warn");
        return;
      }
      showToast(
        action === "approve"
          ? b.sent
            ? "Approved · fresh invite sent"
            : "Approved (email updated)"
          : "Request rejected",
        "ok",
      );
      loadRequests();
      loadStats();
      loadRecipients();
    } finally {
      setReqBusy(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    loadRecipients();
    loadActivation();
    loadRequests();
    loadReminder();
  }, [loadStats, loadRecipients, loadActivation, loadRequests, loadReminder]);

  async function scheduleReminder() {
    if (reminderScheduled) return;
    setReminderBusy(true);
    setReminderScheduled(true);
    try {
      const res = await fetch("/api/admin/activation-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_tomorrow" }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReminderScheduled(false);
        showToast("Couldn't schedule the reminder.", "warn");
        return;
      }
      setReminderLabel(b.scheduledLabel ?? null);
      setReminderSentLabel(null);
      setReminderScheduled(Boolean(b.scheduledLabel));
      showToast(`Reminder scheduled for ${b.scheduledLabel}`, "ok");
    } catch {
      setReminderScheduled(false);
      showToast("Couldn't schedule the reminder.", "warn");
    } finally {
      setReminderBusy(false);
    }
  }

  async function toggleActivation() {
    if (activationOpen === null) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: !activationOpen }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) {
        setActivationOpen(b.open);
        showToast(b.open ? "Activation reopened" : "Activation paused", "ok");
      } else showToast("Couldn't update activation.", "warn");
    } catch {
      showToast("Couldn't update activation.", "warn");
    } finally {
      setToggling(false);
    }
  }

  // bulk "Send" targets only those never emailed yet — already-invited students
  // are skipped (resend them individually from the Pending list).
  const toSendList = useMemo(
    () => recipients.filter((r) => !r.registered && !r.invited && r.email),
    [recipients],
  );

  // shared batched sender used by both "Send invitations" and "Resend to all"
  async function runSend(list: Recipient[]) {
    if (!list.length) {
      showToast("Nobody to send to right now.", "warn");
      return;
    }
    if (activationOpen === false) {
      showToast("Activation is paused — reopen it first.", "warn");
      return;
    }
    setSending(true);
    setSendResults([]);
    setResultSearch("");
    setSendTotal(list.length);
    try {
      for (let i = 0; i < list.length; i += BATCH) {
        const ids = list.slice(i, i + BATCH).map((r) => r.id);
        const res = await fetch("/api/admin/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const b = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(
            b.error === "activation_paused"
              ? "Activation is paused."
              : b.error === "email_not_configured"
                ? "Email isn't configured (Gmail)."
                : "Sending stopped (server error).",
            "warn",
          );
          break;
        }
        setSendResults((prev) => [...prev, ...((b.results ?? []) as SendResult[])]);
      }
    } finally {
      setSending(false);
      loadStats();
      loadRecipients();
    }
  }

  function sendInvites() {
    if (!toSendList.length) {
      showToast("No new invitations — everyone pending was already emailed.", "warn");
      return;
    }
    runSend(toSendList);
  }

  // every not-yet-registered attendee with an email (invited or not)
  const pendingAll = useMemo(
    () => recipients.filter((r) => !r.registered && r.email),
    [recipients],
  );

  function resendAll() {
    if (!pendingAll.length) return;
    if (
      !window.confirm(
        `Resend the invitation to all ${pendingAll.length} attendees who haven't registered yet? Already-registered students are skipped.`,
      )
    )
      return;
    setDrill(null);
    runSend(pendingAll);
  }

  async function resendOne(id: string) {
    setRowBusy(id);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          b.error === "activation_paused" ? "Activation is paused." : "Resend failed.",
          "warn",
        );
        return;
      }
      const r = b.results?.[0] as SendResult | undefined;
      showToast(
        r?.status === "sent" ? `Re-sent to ${r.email}` : `Failed: ${r?.reason ?? "error"}`,
        r?.status === "sent" ? "ok" : "warn",
      );
      loadStats();
      loadRecipients();
    } finally {
      setRowBusy(null);
    }
  }

  async function saveEmail(id: string, email: string): Promise<boolean> {
    const res = await fetch("/api/admin/fix-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email: email.trim() }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(b.error === "invalid" ? "That email looks invalid." : "Couldn't update email.", "warn");
      return false;
    }
    showToast(
      b.sent
        ? `Email updated · fresh invite sent to ${email.trim()}`
        : b.reason === "paused"
          ? "Email updated (will send when activation reopens)"
          : b.reason === "registered"
            ? "Email updated (already registered)"
            : "Email updated",
      "ok",
    );
    loadStats();
    loadRecipients();
    return true;
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
      const b = await res.json().catch(() => ({}));
      showToast(
        res.ok ? `Test invite sent to ${to}` : `Test failed: ${b.detail || b.error || "error"}`,
        res.ok ? "ok" : "warn",
      );
    } catch {
      showToast("Test send failed.", "warn");
    } finally {
      setTesting(false);
    }
  }

  const sentCount = sendResults.filter((r) => r.status === "sent").length;
  const failCount = sendResults.filter((r) => r.status === "failed").length;
  const backupCount = sendResults.filter((r) => r.account === "backup").length;
  const done = sendResults.length;
  const visibleResults = sendResults.filter(
    (r) =>
      !resultSearch ||
      r.name.toLowerCase().includes(resultSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(resultSearch.toLowerCase()),
  );

  const drillList = useMemo(() => {
    if (drill === null) return [];
    const q = drillSearch.trim().toLowerCase();
    return recipients
      .filter((r) => (drill === "registered" ? r.registered : !r.registered))
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.seat.toLowerCase().includes(q),
      );
  }, [recipients, drill, drillSearch]);

  const fixMatches = useMemo(() => {
    const q = fixQuery.trim().toLowerCase();
    if (!q) return [];
    return recipients
      .filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [fixQuery, recipients]);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="INVITATIONS"
        subtitle="Send activation links, track who's registered, and fix bad emails."
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

      {/* count cards — clickable */}
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
          onClick={() => {
            setDrill("registered");
            setDrillSearch("");
          }}
        />
        <CountCard
          icon={<Mail className="size-4 text-brand-orange" />}
          value={stats?.pending}
          label="Pending"
          highlight
          onClick={() => {
            setDrill("pending");
            setDrillSearch("");
          }}
        />
      </div>

      {/* email-change requests (from the public "didn't get my invite" form) */}
      <Card className={requests.length > 0 ? "border-brand-orange/40" : ""}>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-orange">
              <Mail className="size-4" />
              Email change requests · {requests.length}
            </h2>
            {requests.length > 1 && (
              <Button
                size="sm"
                onClick={approveAll}
                disabled={approvingAll || reqBusy !== null}
              >
                {approvingAll ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve all ({requests.length})
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Students who said they didn&apos;t get their invite. Approve to
            update their email and send a fresh invite.
          </p>
          {requests.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/30 py-6 text-center text-sm text-muted-foreground">
              No pending requests right now.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {r.name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {r.block} {r.seat}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      <span className="line-through">{r.currentEmail || "—"}</span>{" "}
                      →{" "}
                      <span className="font-medium text-foreground">
                        {r.requestedEmail}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequest(r.id, "approve")}
                      disabled={reqBusy === r.id}
                    >
                      {reqBusy === r.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequest(r.id, "reject")}
                      disabled={reqBusy === r.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* send */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Send invitations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Emails a one-time activation link to students who haven&apos;t been
              invited yet, in small batches with a live status below.
              Already-invited and already-registered students are skipped — so
              it&apos;s safe to run again, and each run only sends to new people.
            </p>
            {stats && stats.pending - stats.toSend > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.pending - stats.toSend} already invited and awaiting
                registration — resend those individually from the{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDrill("pending");
                    setDrillSearch("");
                  }}
                  className="font-semibold text-brand-orange underline-offset-2 hover:underline"
                >
                  Pending list
                </button>
                .
              </p>
            )}

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
              disabled={
                sending ||
                !stats ||
                stats.toSend === 0 ||
                !emailReady ||
                !!loadErr ||
                activationOpen === false
              }
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send />}
              {stats && stats.toSend > 0
                ? `Send to ${stats.toSend} not yet invited`
                : "No new invitations to send"}
            </Button>

            {/* live results */}
            {(sending || sendResults.length > 0) && (
              <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>
                    {sending ? "Sending…" : "Send complete"} {done}/{sendTotal}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="text-brand-green">{sentCount} sent</span>
                    {failCount > 0 && (
                      <span className="text-brand-red"> · {failCount} failed</span>
                    )}
                    {backupCount > 0 && (
                      <span className="text-brand-orange">
                        {" "}
                        · {backupCount} via backup
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand-orange transition-all duration-300"
                    style={{ width: sendTotal ? `${(done / sendTotal) * 100}%` : "0%" }}
                  />
                </div>

                {sendResults.length > 6 && (
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                      placeholder="Search results…"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                )}

                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
                  {visibleResults.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs"
                    >
                      {r.status === "sent" ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-brand-green" />
                      ) : (
                        <X className="size-3.5 shrink-0 text-brand-red" />
                      )}
                      <span className="w-40 shrink-0 truncate font-medium">
                        {r.name}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {r.email}
                      </span>
                      {r.account === "backup" && r.status === "sent" && (
                        <span className="shrink-0 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                          backup
                        </span>
                      )}
                      {r.status === "failed" && (
                        <span className="shrink-0 truncate text-brand-red">
                          {r.reason}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* preview test */}
            <div className="mt-6 border-t border-border pt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Preview — send a test to yourself
              </div>
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

        {/* fix-email card */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Fix a wrong email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              For a student who didn&apos;t get their invite (typo, etc.).
              Search them, set the correct email — it saves and re-sends.
            </p>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={fixQuery}
                onChange={(e) => {
                  setFixQuery(e.target.value);
                  setFixSel(null);
                }}
                placeholder="Search a student by name…"
                className="pl-8"
              />
              {!fixSel && fixMatches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {fixMatches.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setFixSel(r);
                        setFixEmail(r.email);
                        setFixQuery(r.name);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/60"
                    >
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.registered ? "registered" : r.seat}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {fixSel && (
              <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="text-sm font-semibold">{fixSel.name}</div>
                <div className="text-xs text-muted-foreground">
                  Current: {fixSel.email || "—"}
                  {fixSel.registered && " · already registered"}
                </div>
                <Input
                  type="email"
                  value={fixEmail}
                  onChange={(e) => setFixEmail(e.target.value)}
                  placeholder="correct@email.com"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={fixSaving || !fixEmail.trim() || fixEmail.trim() === fixSel.email}
                    onClick={async () => {
                      setFixSaving(true);
                      const ok = await saveEmail(fixSel.id, fixEmail);
                      setFixSaving(false);
                      if (ok) {
                        setFixSel(null);
                        setFixQuery("");
                      }
                    }}
                  >
                    {fixSaving ? <Loader2 className="size-4 animate-spin" /> : <Send />}
                    Save &amp; re-invite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFixSel(null);
                      setFixQuery("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* right column: expert attendance */}
        <div className="space-y-4">
          <ExpertAttendanceCard />

          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Activation reminder
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Schedules a one-time branded reminder for attendees who already got
                an invite but still haven&apos;t activated their account.
              </p>
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <div>
                  Target: <span className="font-medium text-foreground">tomorrow 9:30 AM</span> ({"Asia/Manila"})
                </div>
                <div className="mt-1">Scheduled: {reminderLabel ?? "not yet"}</div>
                <div className="mt-1">Sent: {reminderSentLabel ?? "not yet"}</div>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={scheduleReminder}
                disabled={reminderBusy || reminderScheduled}
              >
                {reminderBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : reminderScheduled ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Mail />
                )}
                {reminderBusy ? "Scheduling…" : reminderScheduled ? "Scheduled" : "Schedule tomorrow&apos;s reminder"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Uses the same activation-link flow as the invite emails, then sends automatically when the cron job runs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* drill-down dialog */}
      <Dialog open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="font-display text-3xl font-normal leading-tight tracking-wide">
              {drill === "registered" ? "REGISTERED" : "NOT YET REGISTERED"}
            </DialogTitle>
            <DialogDescription>
              {drill === "registered"
                ? "Students who have activated their account."
                : "Students still to register — resend or fix their email."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="Search name, email or seat…"
                className="pl-8"
              />
            </div>
            {drill === "pending" && pendingAll.length > 0 && (
              <Button
                onClick={resendAll}
                disabled={sending || activationOpen === false}
                className="shrink-0"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCw className="size-4" />
                )}
                Resend to all {pendingAll.length}
              </Button>
            )}
          </div>

          <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
            {drillList.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 py-10 text-center text-sm text-muted-foreground">
                {drill === "registered"
                  ? "No students have registered yet."
                  : drillSearch
                    ? "No matches."
                    : "Everyone has registered. 🎉"}
              </div>
            )}
            {drillList.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.email || "no email"} · {r.block} {r.seat}
                      </div>
                    </div>
                    {drill === "pending" && editId !== r.id && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendOne(r.id)}
                          disabled={rowBusy === r.id || activationOpen === false}
                        >
                          {rowBusy === r.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="size-3.5" />
                          )}
                          {r.invited ? "Resend" : "Send"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditId(r.id);
                            setEditVal(r.email);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    {drill === "registered" && (
                      <span className="shrink-0 rounded-full bg-brand-green/15 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-green">
                        Registered
                      </span>
                    )}
                  </div>

                  {editId === r.id && (
                    <div className="mt-2.5 flex gap-2">
                      <Input
                        type="email"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        placeholder="correct@email.com"
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        disabled={rowBusy === r.id || !editVal.trim()}
                        onClick={async () => {
                          setRowBusy(r.id);
                          const ok = await saveEmail(r.id, editVal);
                          setRowBusy(null);
                          if (ok) setEditId(null);
                        }}
                      >
                        {rowBusy === r.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountCard({
  icon,
  value,
  label,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  value?: number;
  label: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={
        "rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors " +
        (highlight ? "border-brand-orange/40 " : "border-border ") +
        (onClick ? "hover:bg-secondary/50" : "")
      }
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
        {onClick && <span className="ml-auto text-muted-foreground">view →</span>}
      </div>
      <div className="mt-1 font-display text-3xl leading-none">
        {value ?? "—"}
      </div>
    </Tag>
  );
}
