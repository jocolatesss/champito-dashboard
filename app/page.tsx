import { parseTrackerCsv } from "@/lib/parseTracker";
import DashboardClient from "./DashboardClient";

export const revalidate = 300; // refresh every 5 minutes

async function getData() {
  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    throw new Error(
      "Missing SHEET_CSV_URL env var. Set it to your published-to-web CSV link from Google Sheets."
    );
  }
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`Failed to fetch tracker CSV: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  return parseTrackerCsv(csvText);
}

export default async function Page() {
  const { students, maxActiveWeek, generatedAt } = await getData();
  return (
    <DashboardClient students={students} maxActiveWeek={maxActiveWeek} generatedAt={generatedAt} />
  );
}
