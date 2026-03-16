import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const BRACKET_PAGE_URL = "https://www.ncaa.com/brackets/basketball-women/d1/2026";
const REGION_SECTION_ORDER = [2, 4, 3, 5];
const FIRST_ROUND_SEED_PAIRS = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15]
];

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

function extractNuxtPayload(html) {
  const match = html.match(
    /<script type="application\/json" data-nuxt-data="nuxt-app"[^>]*id="__NUXT_DATA__">([\s\S]*?)<\/script>/
  );

  if (!match) {
    throw new Error("Unable to locate NCAA women's bracket payload.");
  }

  return JSON.parse(match[1]);
}

function decodeNuxtPayload(payload) {
  const seen = new Map();

  const resolveReference = (value) => {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "number") {
      return resolveIndex(value);
    }

    if (Array.isArray(value)) {
      return resolveValue(value);
    }

    if (typeof value === "object") {
      return resolveObject(value);
    }

    return value;
  };

  const resolveIndex = (index) => {
    if (seen.has(index)) {
      return seen.get(index);
    }

    const value = payload[index];
    const placeholder = Array.isArray(value)
      ? []
      : value && typeof value === "object"
        ? {}
        : undefined;

    if (placeholder) {
      seen.set(index, placeholder);
    }

    const resolved = resolveValue(value, placeholder);

    if (placeholder && resolved !== placeholder) {
      seen.set(index, resolved);
    }

    return resolved;
  };

  const resolveObject = (value, target = {}) => {
    for (const [key, entry] of Object.entries(value)) {
      target[key] = resolveReference(entry);
    }

    return target;
  };

  const resolveValue = (value, target) => {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      const [head, ...rest] = value;

      if (
        head === "Ref" ||
        head === "Reactive" ||
        head === "ShallowReactive"
      ) {
        return resolveReference(rest[0]);
      }

      if (head === "Set") {
        return rest.map((entry) => resolveReference(entry));
      }

      const output = target ?? [];

      for (const entry of value) {
        output.push(resolveReference(entry));
      }

      return output;
    }

    return resolveObject(value, target ?? {});
  };

  return resolveIndex(0);
}

function toAbsoluteLogoUrl(url) {
  if (!url) {
    return "";
  }

  return url.startsWith("http") ? url : `https://www.ncaa.com${url}`;
}

function buildPlaceholderName(game) {
  return game.teams.map((team) => team.nameShort).join(" / ");
}

async function request(path, init = {}) {
  const env = loadEnvFile();
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
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
  return text ? JSON.parse(text) : null;
}

async function main() {
  const html = await fetch(BRACKET_PAGE_URL).then((response) => response.text());
  const payload = extractNuxtPayload(html);
  const championship = decodeNuxtPayload(payload).pinia.main.championship;
  const firstFourByTarget = new Map(
    championship.games
      .filter((game) => game.sectionId === 1)
      .map((game) => [game.victorBracketPositionId, game])
  );

  const regionNames = REGION_SECTION_ORDER.map((sectionId) => {
    const region = championship.regions.find((entry) => entry.sectionId === sectionId);
    return region.title;
  });

  const teams = [];

  REGION_SECTION_ORDER.forEach((sectionId, regionIndex) => {
    const games = championship.games
      .filter(
        (game) =>
          game.sectionId === sectionId &&
          game.bracketPositionId >= 201 &&
          game.bracketPositionId <= 232
      )
      .sort((left, right) => left.bracketPositionId - right.bracketPositionId);

    games.forEach((game, gameIndex) => {
      const [seedA, seedB] = FIRST_ROUND_SEED_PAIRS[gameIndex];
      const teamBySeed = new Map(
        game.teams.map((team) => [
          team.seed,
          {
            seed: team.seed,
            name: team.nameShort,
            logoUrl: toAbsoluteLogoUrl(team.logoUrl)
          }
        ])
      );
      const playInGame = firstFourByTarget.get(game.bracketPositionId);

      if (playInGame) {
        const placeholderSeed = teamBySeed.has(seedA) ? seedB : seedA;
        teamBySeed.set(placeholderSeed, {
          seed: placeholderSeed,
          name: buildPlaceholderName(playInGame),
          logoUrl: ""
        });
      }

      for (const seed of [seedA, seedB]) {
        const localIndex = teams.length % 16;
        teams.push({
          competition_slug: "womens",
          slot_number: regionIndex * 16 + localIndex + 1,
          region_index: regionIndex,
          seed,
          name: teamBySeed.get(seed).name,
          logo_url: teamBySeed.get(seed).logoUrl
        });
      }
    });
  });

  await request("/rest/v1/teams?on_conflict=competition_slug,slot_number", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(teams)
  });

  await request("/rest/v1/competitions?slug=eq.womens", {
    method: "PATCH",
    body: JSON.stringify({
      region_names: regionNames
    })
  });

  const savedTeams = await request(
    "/rest/v1/teams?competition_slug=eq.womens&select=slot_number,seed,name&order=slot_number.asc"
  );

  console.log("Imported women's bracket teams:", savedTeams.length);
  console.log(savedTeams.slice(0, 8));
  console.log("Region names:", regionNames);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
