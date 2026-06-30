"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Attendee,
  Dataset,
  ScanResult,
  SeatStatus,
  SessionUser,
  ToastMessage,
  ToastTone,
} from "@/lib/types";
import { loadDataset } from "@/lib/data/source";
import { initialsOf, minutesToTime } from "@/lib/format";
import { STATUS } from "@/lib/status";

export interface ScanStats {
  total: number;
  success: number;
  dup: number;
}

interface AppState {
  data: Dataset;
  /** bumped whenever the dataset is mutated, to re-derive memoized views */
  dataVersion: number;
  user: SessionUser | null;

  // seating
  seatSearch: string;
  fBlock: string;
  fStatus: string;
  cellSize: number;
  selectedSeat: string | null;
  /** focus mode: dim every seat except the signed-in attendee's own seat */
  focusMine: boolean;
  /** how the seat map colors cells */
  seatColorMode: "status" | "section";

  // profile
  profileEdit: boolean;
  editName: string;
  editEmail: string;

  // scanner
  soundOn: boolean;
  offlineOn: boolean;
  manualVal: string;
  scanResult: ScanResult | null;
  scanStats: ScanStats;
  /** real connectivity for the scanner's offline queue */
  online: boolean;
  /** number of scans waiting to sync to the server */
  pendingCount: number;

  // import
  importActive: boolean;
  importStage: string;
  importPct: string;
  importDone: boolean;
  importValid: number;
  importErrors: number;
  importTotal: number;

  // toasts
  toasts: ToastMessage[];

  // actions
  logout: () => void;
  showToast: (msg: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;

  setSeatSearch: (v: string) => void;
  setFBlock: (v: string) => void;
  setFStatus: (v: string) => void;
  selectSeat: (label: string) => void;
  clearSelectedSeat: () => void;
  setFocusMine: (v: boolean) => void;
  setSeatColorMode: (m: "status" | "section") => void;
  zoom: (d: number) => void;
  refresh: () => void;

  startEdit: () => void;
  setEditName: (v: string) => void;
  setEditEmail: (v: string) => void;
  saveProfile: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;

  toggleSound: () => void;
  toggleOffline: () => void;
  setManualVal: (v: string) => void;
  processScan: (
    att: Attendee | null,
    force?: "override" | "invalid",
  ) => void;
  simulateScan: () => void;
  manualScan: () => void;
  scanNext: () => void;
  // real scanning
  setOnline: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  applyScanResult: (res: ScanResult) => void;
  markPresentLocal: (seat: string, when?: number) => void;
  // attendee "you're checked in" — bumped to trigger the celebration overlay
  checkinFlash: number;
  fireCheckinFlash: () => void;
  setMyCheckedIn: (whenMinutes: number) => void;

  runImport: () => void;
  exportData: () => void;
  sampleCsv: () => void;
}

function downloadFile(name: string, text: string, type = "text/csv") {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* no-op */
  }
}

let toastSeq = 1;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      data: loadDataset(),
      dataVersion: 0,
      user: null,

      seatSearch: "",
      fBlock: "all",
      fStatus: "all",
      cellSize: 24,
      selectedSeat: null,
      focusMine: false,
      seatColorMode: "section",

      profileEdit: false,
      editName: "",
      editEmail: "",

      soundOn: true,
      offlineOn: false,
      manualVal: "",
      scanResult: null,
      scanStats: { total: 0, success: 0, dup: 0 },
      online: true,
      pendingCount: 0,
      checkinFlash: 0,

      importActive: false,
      importStage: "",
      importPct: "0%",
      importDone: false,
      importValid: 0,
      importErrors: 0,
      importTotal: 0,

      toasts: [],

      logout: () =>
        set({
          user: null,
          selectedSeat: null,
          scanResult: null,
          profileEdit: false,
        }),

      showToast: (msg, tone = "ok") => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
        setTimeout(() => get().dismissToast(id), 2800);
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setSeatSearch: (v) => set({ seatSearch: v }),
      setFBlock: (v) => set({ fBlock: v }),
      setFStatus: (v) => set({ fStatus: v }),
      selectSeat: (label) =>
        set((s) => ({ selectedSeat: s.selectedSeat === label ? null : label })),
      clearSelectedSeat: () => set({ selectedSeat: null }),
      setFocusMine: (v) => set({ focusMine: v }),
      setSeatColorMode: (m) => set({ seatColorMode: m }),
      zoom: (d) =>
        set((s) => ({ cellSize: Math.max(14, Math.min(42, s.cellSize + d)) })),

      refresh: () => {
        void import("@/lib/supabase/refresh")
          .then(({ refreshSupabaseData }) => refreshSupabaseData())
          .catch(() => {});
      },

      startEdit: () => set({ profileEdit: true }),
      setEditName: (v) => set({ editName: v }),
      setEditEmail: (v) => set({ editEmail: v }),
      saveProfile: () => {
        const { user, editName, editEmail } = get();
        if (!user) return;
        set({
          profileEdit: false,
          user: {
            ...user,
            name: editName,
            email: editEmail,
            initials: initialsOf(editName),
          },
        });
        get().showToast("Profile updated", "ok");
      },
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),

      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleOffline: () => set((s) => ({ offlineOn: !s.offlineOn })),
      setManualVal: (v) => set({ manualVal: v }),

      processScan: (att, force) => {
        const data = get().data;
        const rand = () =>
          data.attendees[Math.floor(Math.random() * data.attendees.length)];
        let outcome: ScanResult["outcome"];
        if (force === "override") outcome = "success";
        else if (force === "invalid") outcome = "invalid";
        else {
          const r = Math.random();
          outcome =
            r < 0.7 ? "success" : r < 0.85 ? "duplicate" : r < 0.95 ? "invalid" : "wrong";
        }

        const details = (a: Attendee) => ({
          id: a.id,
          email: a.email,
          initials: initialsOf(a.name),
          status: a.status,
          checkIn: a.checkIn,
        });

        let res: ScanResult;
        if (outcome === "success") {
          const a = att || rand();
          res = {
            tone: STATUS.present.c, icon: "check", title: "CHECKED IN",
            name: a.name, seat: a.seat, block: a.block,
            ...details(a),
            sub: force === "override"
              ? "Manual override accepted. Attendance recorded."
              : "Welcome! Attendance recorded successfully.",
            outcome,
          };
        } else if (outcome === "duplicate") {
          const a = att || rand();
          res = {
            tone: "#d99514", icon: "alert", title: "DUPLICATE",
            name: a.name, seat: a.seat, block: a.block,
            ...details(a),
            sub: "This attendee has already been checked in.",
            outcome,
          };
        } else if (outcome === "invalid") {
          res = {
            tone: STATUS["no-show"].c, icon: "x", title: "INVALID CODE",
            name: "Unrecognized QR", seat: "—", block: "—",
            sub: "This code is not a valid attendee pass.",
            outcome,
          };
        } else {
          res = {
            tone: STATUS["no-show"].c, icon: "ban", title: "WRONG EVENT",
            name: "Different event pass", seat: "—", block: "—",
            sub: "This pass belongs to another event.",
            outcome,
          };
        }

        set((s) => ({
          scanResult: res,
          scanStats: {
            total: s.scanStats.total + 1,
            success: s.scanStats.success + (outcome === "success" ? 1 : 0),
            dup: s.scanStats.dup + (outcome === "duplicate" ? 1 : 0),
          },
        }));
      },

      simulateScan: () => {
        const data = get().data;
        get().processScan(
          data.attendees[Math.floor(Math.random() * data.attendees.length)],
        );
      },

      manualScan: () => {
        const v = (get().manualVal || "").trim().toUpperCase();
        if (!v) {
          get().showToast("Enter a seat or ID", "warn");
          return;
        }
        const att = get().data.attendees.find(
          (a) => a.seat === v || a.id === v,
        );
        set({ manualVal: "" });
        if (att) get().processScan(att, "override");
        else get().processScan(null, "invalid");
      },

      scanNext: () => set({ scanResult: null }),

      setOnline: (v) => set({ online: v }),
      setPendingCount: (n) => set({ pendingCount: n }),
      applyScanResult: (res) =>
        set((s) => ({
          scanResult: res,
          scanStats: {
            total: s.scanStats.total + 1,
            success: s.scanStats.success + (res.outcome === "success" ? 1 : 0),
            dup: s.scanStats.dup + (res.outcome === "duplicate" ? 1 : 0),
          },
        })),
      fireCheckinFlash: () => set((s) => ({ checkinFlash: s.checkinFlash + 1 })),
      setMyCheckedIn: (whenMinutes) =>
        set((s) =>
          s.user
            ? { user: { ...s.user, status: "present", checkIn: whenMinutes } }
            : {},
        ),
      markPresentLocal: (seat, when) =>
        set((s) => {
          const key = seat.toUpperCase();
          const now =
            when ?? new Date().getHours() * 60 + new Date().getMinutes();
          const attendees = s.data.attendees.map((a) =>
            a.seat.toUpperCase() === key
              ? { ...a, status: "present" as SeatStatus, checkIn: now }
              : a,
          );
          const attMap = Object.fromEntries(attendees.map((a) => [a.id, a]));
          return {
            data: { ...s.data, attendees, attMap },
            dataVersion: s.dataVersion + 1,
          };
        }),

      runImport: () => {
        set({
          importActive: true,
          importDone: false,
          importStage: "Uploading file…",
          importPct: "0%",
        });
        const steps: [string, string][] = [
          ["Uploading file…", "18%"],
          ["Parsing rows…", "46%"],
          ["Validating data…", "74%"],
          ["Finalizing…", "92%"],
          ["Complete", "100%"],
        ];
        let i = 0;
        const tick = () => {
          const [stage, pct] = steps[i];
          set({ importStage: stage, importPct: pct });
          i++;
          if (i < steps.length) {
            setTimeout(tick, 520);
          } else {
            set({
              importDone: true,
              importValid: 498,
              importErrors: 2,
              importTotal: 500,
            });
            get().showToast("Import complete · 498 added", "ok");
          }
        };
        tick();
      },

      exportData: () => {
        const { data, showToast } = get();
        let csv =
          "attendee_id,name,email,block,seat,status,check_in,scanner\n";
        data.attendees.forEach((a) => {
          csv +=
            [
              a.id,
              `"${a.name}"`,
              a.email,
              a.block,
              a.seat,
              a.status,
              minutesToTime(a.checkIn),
              `"${a.scanner || ""}"`,
            ].join(",") + "\n";
        });
        downloadFile("hardhatting2026_attendance.csv", csv);
        showToast("Attendance exported", "ok");
      },

      sampleCsv: () => {
        const csv =
          "attendee_id,name,email,block,seat\n" +
          "A0001,Juan Santos,juan.santos@iskolarngbayan.pup.edu.ph,Block A,A1\n" +
          "A0002,Maria Cruz,maria.cruz@iskolarngbayan.pup.edu.ph,Block A,A2\n";
        downloadFile("hardhatting2026_sample.csv", csv);
        get().showToast("Sample CSV downloaded", "ok");
      },
    }),
    {
      name: "hhc2026-session",
      storage: createJSONStorage(() => localStorage),
      // persist only the session identity; everything else is ephemeral / derived
      partialize: (s) => ({ user: s.user }),
      skipHydration: true,
    },
  ),
);
