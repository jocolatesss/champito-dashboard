"use client";

import { useMemo, useState } from "react";
import type { StudentRow, Status } from "@/lib/parseTracker";

const STATUS_ORDER: Status[] = ["red", "yellow", "green", "gray"];
const STATUS_LABEL: Record<Status, string> = {
  red: "Needs attention",
  yellow: "Watch",
  green: "On track",
  gray: "No data",
};

export default function DashboardClient({
  students,
  maxActiveWeek,
  generatedAt,
}: {
  students: StudentRow[];
  maxActiveWeek: number;
  generatedAt: string;
}) {
  const [coachFilter, setCoachFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [hideNoData, setHideNoData] = useState(true);
  const [search, setSearch] = useState("");

  const coaches = useMemo(
    () => Array.from(new Set(students.map((s) => s.coach))).sort(),
    [students]
  );

  const counts = useMemo(() => {
    const c: Record<Status, number> = { green: 0, yellow: 0, red: 0, gray: 0 };
    for (const s of students) c[s.status]++;
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    return students
      .filter((s) => (coachFilter === "all" ? true : s.coach === coachFilter))
      .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter))
      .filter((s) => (hideNoData ? s.status !== "gray" : true))
      .filter((s) =>
        search.trim() === ""
          ? true
          : s.studentName.toLowerCase().includes(search.toLowerCase()) ||
            s.team.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [students, coachFilter, statusFilter, hideNoData, search]);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Champito Coaching — Quick Glance</h1>
          <div className="meta">
            Most recent active week across roster: W{maxActiveWeek} · refreshed{" "}
            {new Date(generatedAt).toLocaleString()}
          </div>
        </div>
      </header>

      <div className="summary-bar">
        {(["red", "yellow", "green", "gray"] as Status[]).map((s) => (
          <div key={s} className={`pill ${s}`}>
            {counts[s]} {STATUS_LABEL[s]}
          </div>
        ))}
      </div>

      <div className="controls">
        <input
          type="text"
          placeholder="Search student or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={coachFilter} onChange={(e) => setCoachFilter(e.target.value)}>
          <option value="all">All coaches</option>
          {coaches.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
        >
          <option value="all">All statuses</option>
          <option value="red">Needs attention</option>
          <option value="yellow">Watch</option>
          <option value="green">On track</option>
          <option value="gray">No data</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={hideNoData}
            onChange={(e) => setHideNoData(e.target.checked)}
          />
          Hide "no data" (broken/unused trackers)
        </label>
      </div>

      <div className="grid">
        {filtered.map((s) => (
          <div key={`${s.coach}-${s.userId}`} className={`card ${s.status}`}>
            {s.stale && <div className="stale-tag">STALE</div>}
            <div className="name">{s.studentName}</div>
            <div className="sub">
              {s.team || "No team"} · Coach: {s.coach}
              {s.lastWeek ? ` · Last logged: W${s.lastWeek}` : ""}
            </div>
            {s.snapshot && (
              <div className="metrics">
                {s.snapshot.habitsPct !== null && (
                  <span>
                    Habits <b>{s.snapshot.habitsPct}%</b>
                  </span>
                )}
                {s.snapshot.roc !== null && (
                  <span>
                    Weight ROC <b>{s.snapshot.roc > 0 ? "+" : ""}{s.snapshot.roc}%</b>
                  </span>
                )}
                {s.snapshot.calorieTarget !== null && s.snapshot.calorieActual !== null && (
                  <span>
                    Cal <b>{s.snapshot.calorieActual}</b>/{s.snapshot.calorieTarget}
                  </span>
                )}
                {s.snapshot.stepTarget !== null && s.snapshot.stepActual !== null && (
                  <span>
                    Steps <b>{s.snapshot.stepActual}</b>/{s.snapshot.stepTarget}
                  </span>
                )}
              </div>
            )}
            <div className="reasons">{s.reasons.join(" · ")}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="no-data-note">No students match the current filters.</div>
      )}
    </div>
  );
}
