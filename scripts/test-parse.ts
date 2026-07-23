import fs from "fs";
import path from "path";
import { parseTrackerCsv } from "../lib/parseTracker";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/test-parse.ts <path-to-csv>");
  process.exit(1);
}
const csvText = fs.readFileSync(path.resolve(csvPath), "utf-8");
const result = parseTrackerCsv(csvText);

console.log("Total students parsed:", result.students.length);
console.log("Max active week across roster:", result.maxActiveWeek);

const byStatus: Record<string, number> = {};
for (const s of result.students) {
  byStatus[s.status] = (byStatus[s.status] || 0) + 1;
}
console.log("Status breakdown:", byStatus);

const staleCount = result.students.filter((s) => s.stale).length;
console.log("Stale (behind the pack):", staleCount);

console.log("\nSample active students:");
for (const s of result.students.filter((s) => s.status !== "gray").slice(0, 5)) {
  console.log(
    `- ${s.studentName} (${s.coach} / ${s.team}) — W${s.lastWeek} — ${s.status.toUpperCase()} — ${s.reasons.join("; ")}`
  );
}

console.log("\nRed flags:");
for (const s of result.students.filter((s) => s.status === "red").slice(0, 8)) {
  console.log(`- ${s.studentName}: ${s.reasons.join("; ")}`);
}
