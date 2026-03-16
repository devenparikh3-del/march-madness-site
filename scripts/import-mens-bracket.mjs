import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const envPath = resolve(projectRoot, ".env.local");

function loadEnvFile() {
  const file = readFileSync(envPath, "utf8");
  const values = {};

  for (const rawLine of file.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }

  return values;
}

const env = loadEnvFile();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const bracketOrder = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];

const regions = [
  {
    regionIndex: 0,
    teamsBySeed: {
      1: "Duke",
      2: "UConn",
      3: "Michigan State",
      4: "Kansas",
      5: "St. John's",
      6: "Louisville",
      7: "UCLA",
      8: "Ohio State",
      9: "TCU",
      10: "UCF",
      11: "South Florida",
      12: "Northern Iowa",
      13: "Cal Baptist",
      14: "North Dakota State",
      15: "Furman",
      16: "Siena"
    }
  },
  {
    regionIndex: 1,
    teamsBySeed: {
      1: "Arizona",
      2: "Purdue",
      3: "Gonzaga",
      4: "Arkansas",
      5: "Wisconsin",
      6: "BYU",
      7: "Miami (FL)",
      8: "Villanova",
      9: "Utah State",
      10: "Missouri",
      11: "Texas / NC State",
      12: "High Point",
      13: "Hawai'i",
      14: "Kennesaw State",
      15: "Queens",
      16: "LIU"
    }
  },
  {
    regionIndex: 2,
    teamsBySeed: {
      1: "Florida",
      2: "Houston",
      3: "Illinois",
      4: "Nebraska",
      5: "Vanderbilt",
      6: "North Carolina",
      7: "Saint Mary's",
      8: "Clemson",
      9: "Iowa",
      10: "Texas A&M",
      11: "VCU",
      12: "McNeese",
      13: "Troy",
      14: "Penn",
      15: "Idaho",
      16: "Prairie View A&M / Lehigh"
    }
  },
  {
    regionIndex: 3,
    teamsBySeed: {
      1: "Michigan",
      2: "Iowa State",
      3: "Virginia",
      4: "Alabama",
      5: "Texas Tech",
      6: "Tennessee",
      7: "Kentucky",
      8: "Georgia",
      9: "Saint Louis",
      10: "Santa Clara",
      11: "Miami (OH) / SMU",
      12: "Akron",
      13: "Hofstra",
      14: "Wright State",
      15: "Tennessee State",
      16: "UMBC / Howard"
    }
  }
];

const teams = regions.flatMap(({ regionIndex, teamsBySeed }) =>
  bracketOrder.map((seed, indexWithinRegion) => ({
    competition_slug: "mens",
    slot_number: regionIndex * 16 + indexWithinRegion + 1,
    region_index: regionIndex,
    seed,
    name: teamsBySeed[seed],
    logo_url: ""
  }))
);

async function request(path, init = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

async function main() {
  await request("/rest/v1/teams?on_conflict=competition_slug,slot_number", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(teams)
  });

  await request("/rest/v1/match_winners?competition_slug=eq.mens", {
    method: "DELETE"
  });

  const savedTeams = await request(
    "/rest/v1/teams?competition_slug=eq.mens&select=slot_number,seed,name&order=slot_number.asc"
  );

  console.log("Imported men's bracket teams:", savedTeams.length);
  console.log(savedTeams.slice(0, 8));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
