import type { Attendee, BlockSide, Dataset, Seat, SeatStatus } from "@/lib/types";
import { SECTIONS } from "@/lib/sections";

/**
 * Deterministic dataset generator for the real Bulwagang Balagtas seat plan.
 *
 * Layout (from the official seat plan):
 *   - Two blocks split by a center aisle.
 *       LEFT  block = columns A–J, rows 1–20            (200 seats)
 *       RIGHT block = columns K–T, rows 1–20 + a short  (204 seats)
 *                     row 21 of 4 seats (columns Q–T)
 *   - Seat label = column letter + row number, e.g. "A1", "K21".
 *
 * Sections (a "block" in the UI === a class section). Each section is a
 * contiguous run of seats in row-major order within its block, anchored by the
 * section's FIRST seat (the unambiguous corner from the seat plan):
 *   LEFT : 2-1 @ A1 · 2-2 @ G5 · 2-3 @ D11 · 2-4 @ C16
 *   RIGHT: 2-5 @ K1 · 2-6 @ N6 · 2-7 @ M11 · 1-1P @ P16
 *
 * Names are demo data (the seat plan's real surnames are not transcribed yet),
 * but each seat lands in its correct physical section.
 */

const FIRST = [
  "Juan", "Maria", "Jose", "Andrea", "Mark", "Patricia", "John", "Angel",
  "Paolo", "Camille", "Miguel", "Sofia", "Gabriel", "Bea", "Rafael", "Nicole",
  "Carlo", "Hannah", "Daniel", "Kyla", "Vincent", "Trisha", "Joshua", "Erika",
  "Christian", "Mae", "Aaron", "Jasmine", "Kevin", "Liza", "Bryan", "Denise",
  "Adrian", "Cassandra", "Ralph", "Yna", "Diego", "Ella", "Lance", "Faith",
  "Neil", "Pia", "Owen", "Mika", "Seth",
];

const LAST = [
  "Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres",
  "Flores", "Ramos", "Aquino", "Castillo", "Gonzales", "Villanueva", "De Leon",
  "Fernandez", "Domingo", "Rivera", "Salazar", "Navarro", "Pascual", "Tan",
  "Lim", "Ocampo", "Manalo", "Soriano", "Dela Rosa", "Marquez", "Velasco",
  "Aguilar", "Padilla",
];

const SCANNERS = ["Gate A · Reyes", "Gate B · Santos", "Lobby · Cruz"];

/** row-major start index (within the block) of each section */
const LEFT_STARTS: [number, number, number, number] = [0, 46, 103, 152];
const RIGHT_STARTS: [number, number, number, number] = [0, 53, 102, 155];

function sectionFor(side: BlockSide, colWithinBlock: number, rowNum: number) {
  const idx = (rowNum - 1) * 10 + colWithinBlock;
  if (side === "L") {
    const [, s2, s3, s4] = LEFT_STARTS;
    if (idx < s2) return SECTIONS[0];
    if (idx < s3) return SECTIONS[1];
    if (idx < s4) return SECTIONS[2];
    return SECTIONS[3];
  }
  const [, s6, s7, s8] = RIGHT_STARTS;
  if (idx < s6) return SECTIONS[4];
  if (idx < s7) return SECTIONS[5];
  if (idx < s8) return SECTIONS[6];
  return SECTIONS[7];
}

/** mulberry32 — tiny deterministic PRNG */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** every (colIndex, rowNum) coordinate that has a physical seat */
function seatCoords(): { colIndex: number; rowNum: number }[] {
  const coords: { colIndex: number; rowNum: number }[] = [];
  // LEFT: columns A–J (0–9), rows 1–20
  for (let row = 1; row <= 20; row++)
    for (let c = 0; c < 10; c++) coords.push({ colIndex: c, rowNum: row });
  // RIGHT: columns K–T (10–19), rows 1–20
  for (let row = 1; row <= 20; row++)
    for (let c = 10; c < 20; c++) coords.push({ colIndex: c, rowNum: row });
  // RIGHT: short row 21, columns Q–T (16–19)
  for (let c = 16; c < 20; c++) coords.push({ colIndex: c, rowNum: 21 });
  return coords;
}

export function buildDataset(seed = 20260701): Dataset {
  const rng = makeRng(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const seats: Seat[] = [];
  const attendees: Attendee[] = [];
  const attMap: Record<string, Attendee> = {};
  let aid = 1;

  seatCoords().forEach(({ colIndex, rowNum }, index) => {
    const side: BlockSide = colIndex < 10 ? "L" : "R";
    const colWithinBlock = side === "L" ? colIndex : colIndex - 10;
    const colLetter = String.fromCharCode(65 + colIndex);
    const label = `${colLetter}${rowNum}`;
    const blockId = sectionFor(side, colWithinBlock, rowNum);

    const seat: Seat = {
      index, side, colIndex, colLetter, colWithinBlock, rowNum,
      label, blockId, attendeeId: null,
    };

    // ~4% of seats sit empty (no-show before assignment / unfilled)
    if (rng() < 0.04) {
      seats.push(seat);
      return;
    }

    let status: SeatStatus;
    let checkIn: number | null = null;
    let scanner: string | null = null;
    const s = rng();
    if (s < 0.64) {
      status = "present";
      checkIn = 420 + Math.floor(rng() * 285);
      scanner = pick(SCANNERS);
    } else if (s < 0.84) {
      status = "assigned";
    } else if (s < 0.955) {
      status = "no-show";
    } else {
      status = "flagged";
      if (rng() < 0.6) {
        checkIn = 420 + Math.floor(rng() * 285);
        scanner = pick(SCANNERS);
      }
    }

    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const id = "A" + String(aid++).padStart(4, "0");
    const email =
      name.toLowerCase().replace(/[^a-z]+/g, ".") +
      "@iskolarngbayan.pup.edu.ph";
    const att: Attendee = {
      id, name, email, block: blockId, seat: label, status, checkIn, scanner,
    };
    seat.attendeeId = id;
    attendees.push(att);
    attMap[id] = att;
    seats.push(seat);
  });

  return { seats, attendees, attMap, scanners: SCANNERS };
}
