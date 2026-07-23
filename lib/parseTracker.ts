import Papa from "papaparse";

export type Status = "green" | "yellow" | "red" | "gray";

export interface WeekSnapshot {
  week: number;
  habitsPct: number | null; // e.g. 105 for "105%"
  roc: number | null; // weekly weight rate-of-change %, e.g. -0.78
  calorieTarget: number | null;
  calorieActual: number | null;
  stepTarget: number | null;
  stepActual: number | null;
}

export interface StudentRow {
  coach: string;
  userId: string;
  studentName: string;
  team: string;
  trackerLink: string;
  lastWeek: number | null; // null = no data at all
  snapshot: WeekSnapshot | null;
  startingWeight: number | null;
  trendWeightLatest: number | null;
  weightLossMTD: number | null;
  status: Status;
  reasons: string[]; // why it's flagged that color, human-readable
  stale: boolean; // behind the pack's most recent active week
}

// column indices, 0-based, verified against the published CSV export
const WEEK1_HABITS_COL = 8;
const WEEK_BLOCK_START: Record<number, number> = {};
{
  let idx = 9;
  for (let w = 2; w <= 15; w++) {
    WEEK_BLOCK_START[w] = idx;
    idx += 6;
  }
}
const STARTING_WEIGHT_COL = 94;
const TREND_WEIGHT_START = 95; // W1..W15 -> 95..109
const WEIGHT_LOSS_MTD_COL = 110;

function num(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[%,]/g, "").trim();
  if (cleaned === "" || cleaned === "#REF!") return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function pct(raw: string | undefined): number | null {
  return num(raw);
}

function isRealValue(raw: string | undefined): boolean {
  return !!raw && raw.trim() !== "" && raw.trim() !== "#REF!";
}

function getWeekSnapshot(row: string[], week: number): WeekSnapshot {
  if (week === 1) {
    return {
      week: 1,
      habitsPct: pct(row[WEEK1_HABITS_COL]),
      roc: null,
      calorieTarget: null,
      calorieActual: null,
      stepTarget: null,
      stepActual: null,
    };
  }
  const start = WEEK_BLOCK_START[week];
  return {
    week,
    habitsPct: pct(row[start]),
    roc: num(row[start + 1]),
    calorieTarget: num(row[start + 2]),
    calorieActual: num(row[start + 3]),
    stepTarget: num(row[start + 4]),
    stepActual: num(row[start + 5]),
  };
}

function findLastActiveWeek(row: string[]): number | null {
  for (let w = 15; w >= 1; w--) {
    const col = w === 1 ? WEEK1_HABITS_COL : WEEK_BLOCK_START[w];
    if (isRealValue(row[col])) return w;
  }
  return null;
}

function computeStatus(snap: WeekSnapshot | null): { status: Status; reasons: string[] } {
  if (!snap) return { status: "gray", reasons: ["No data logged for any week"] };

  const reasons: string[] = [];
  let worst: Status = "green";

  const escalate = (s: Status) => {
    const order: Status[] = ["green", "yellow", "red"];
    if (order.indexOf(s) > order.indexOf(worst)) worst = s;
  };

  // Habits adherence
  if (snap.habitsPct !== null) {
    if (snap.habitsPct < 85) {
      escalate("red");
      reasons.push(`Habits at ${snap.habitsPct}% (below 85%)`);
    } else if (snap.habitsPct < 100) {
      escalate("yellow");
      reasons.push(`Habits at ${snap.habitsPct}% (below 100%)`);
    }
  }

  // Calorie adherence
  if (snap.calorieTarget !== null && snap.calorieActual !== null && snap.calorieTarget !== 0) {
    const dev = Math.abs(snap.calorieActual / snap.calorieTarget - 1) * 100;
    if (dev > 20) {
      escalate("red");
      reasons.push(`Calories off target by ${dev.toFixed(0)}%`);
    } else if (dev > 10) {
      escalate("yellow");
      reasons.push(`Calories off target by ${dev.toFixed(0)}%`);
    }
  }

  // Step adherence
  if (snap.stepTarget !== null && snap.stepActual !== null && snap.stepTarget !== 0) {
    const ratio = (snap.stepActual / snap.stepTarget) * 100;
    if (ratio < 70) {
      escalate("red");
      reasons.push(`Steps at ${ratio.toFixed(0)}% of target`);
    } else if (ratio < 90) {
      escalate("yellow");
      reasons.push(`Steps at ${ratio.toFixed(0)}% of target`);
    }
  }

  if (reasons.length === 0) reasons.push("On track across habits, calories, and steps");

  return { status: worst, reasons };
}

export interface ParsedTracker {
  students: StudentRow[];
  maxActiveWeek: number; // most recent week anyone in the whole roster has logged
  generatedAt: string;
}

export function parseTrackerCsv(csvText: string): ParsedTracker {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
  const rows = parsed.data as string[][];
  const dataRows = rows.slice(4); // first 4 rows are the merged header block

  const students: StudentRow[] = [];
  let maxActiveWeek = 0;

  for (const row of dataRows) {
    if (!row || row.length < 93) continue;
    const studentName = (row[2] || "").trim();
    if (!studentName) continue;

    const lastWeek = findLastActiveWeek(row);
    if (lastWeek && lastWeek > maxActiveWeek) maxActiveWeek = lastWeek;

    const snapshot = lastWeek ? getWeekSnapshot(row, lastWeek) : null;
    const { status, reasons } = computeStatus(snapshot);

    students.push({
      coach: (row[0] || "").trim(),
      userId: (row[1] || "").trim(),
      studentName, // leave any leading/trailing * markers as-is — meaning in the sheet is unconfirmed, don't silently hide them
      team: (row[3] || "").trim(),
      trackerLink: (row[7] || "").trim(),
      lastWeek,
      snapshot,
      startingWeight: num(row[STARTING_WEIGHT_COL]),
      trendWeightLatest: lastWeek ? num(row[TREND_WEIGHT_START + lastWeek - 1]) : null,
      weightLossMTD: num(row[WEIGHT_LOSS_MTD_COL]),
      status,
      reasons,
      stale: false, // filled in below once we know maxActiveWeek
    });
  }

  for (const s of students) {
    if (s.lastWeek !== null && maxActiveWeek - s.lastWeek >= 2) {
      s.stale = true;
    }
  }

  return { students, maxActiveWeek, generatedAt: new Date().toISOString() };
}
