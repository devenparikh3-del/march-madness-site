import Papa from "papaparse";

import type { LeaderboardEntry, SustainabilityTeamCode } from "@/lib/types";

type SheetLeaderboardResult = {
  entries: LeaderboardEntry[];
  lastUpdated: string | null;
};

function toCsvUrl(sheetUrl: string) {
  const trimmed = sheetUrl.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("output=csv") || trimmed.includes("format=csv")) {
    return trimmed;
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);

  if (!match) {
    return trimmed;
  }

  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? "0";

  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
}

function isPaid(value: string) {
  return ["yes", "y", "true", "paid", "1"].includes(value.trim().toLowerCase());
}

function toTeamCode(value: string): SustainabilityTeamCode | null {
  const normalized = value.trim().toUpperCase();

  if (normalized === "SO" || normalized === "RA" || normalized === "CPI") {
    return normalized;
  }

  return null;
}

function sortLeaderboard(entries: Omit<LeaderboardEntry, "rank">[]) {
  return entries
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.potentialPoints !== left.potentialPoints) {
        return right.potentialPoints - left.potentialPoints;
      }

      return left.nickname.localeCompare(right.nickname);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export async function getLeaderboardFromSheet(
  sheetUrl: string
): Promise<SheetLeaderboardResult> {
  const csvUrl = toCsvUrl(sheetUrl);

  if (!csvUrl) {
    return { entries: [], lastUpdated: null };
  }

  try {
    const response = await fetch(csvUrl, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return { entries: [], lastUpdated: null };
    }

    const csv = await response.text();
    const parsed = Papa.parse<string[]>(csv, {
      skipEmptyLines: true
    });

    const rows = parsed.data;
    const lastUpdated = rows[0]?.[8]?.trim() || null;
    const entries = rows
      .map((row) => ({
        nickname: row[0]?.trim() ?? "",
        points: Number.parseFloat(row[1] ?? ""),
        potentialPoints: Number.parseFloat(row[2] ?? ""),
        paid: isPaid(row[3] ?? ""),
        bracketUrl: row[4]?.trim() ?? "",
        teamCode: toTeamCode(row[5] ?? "")
      }))
      .filter((entry) => entry.nickname)
      .filter(
        (entry) =>
          Number.isFinite(entry.points) && Number.isFinite(entry.potentialPoints)
      )
      .filter((entry) => entry.paid);

    return {
      entries: sortLeaderboard(entries),
      lastUpdated
    };
  } catch {
    return { entries: [], lastUpdated: null };
  }
}
