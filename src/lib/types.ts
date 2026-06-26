export type Role = "attendee" | "president" | "scanner" | "admin";

export type SeatStatus =
  | "available"
  | "assigned"
  | "present"
  | "no-show"
  | "flagged";

export type BlockSide = "L" | "R";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  /** section, e.g. "BSCPE 2-1" */
  block: string;
  /** seat label, e.g. "A1", "K21" */
  seat: string;
  status: SeatStatus;
  /** check-in time in minutes after midnight, or null */
  checkIn: number | null;
  scanner: string | null;
}

export interface Seat {
  index: number;
  /** L = columns A–J, R = columns K–T */
  side: BlockSide;
  /** 0–19 across the whole venue (A–T) */
  colIndex: number;
  /** "A"–"T" */
  colLetter: string;
  /** 0–9 within the seat's block */
  colWithinBlock: number;
  /** 1–21 */
  rowNum: number;
  /** seat label, e.g. "A1", "K21" */
  label: string;
  /** section, e.g. "BSCPE 2-1" */
  blockId: string;
  attendeeId: string | null;
}

export interface Dataset {
  seats: Seat[];
  attendees: Attendee[];
  attMap: Record<string, Attendee>;
  scanners: string[];
}

export interface SessionUser {
  id?: string;
  role: Role;
  name: string;
  email: string;
  initials: string;
  block?: string;
  seat?: string;
  status?: SeatStatus;
  scanner?: string;
  presidentBlock?: string;
  checkIn?: number | null;
}

export type ScanOutcome = "success" | "duplicate" | "invalid" | "wrong";

export interface ScanResult {
  tone: string;
  icon: string;
  title: string;
  name: string;
  seat: string;
  block: string;
  sub: string;
  outcome: ScanOutcome;
  /** attendee details, present for success/duplicate scans */
  id?: string;
  email?: string;
  initials?: string;
  status?: SeatStatus;
  checkIn?: number | null;
}

export type ToastTone = "ok" | "warn" | "err";
export interface ToastMessage {
  id: number;
  msg: string;
  tone: ToastTone;
}
