import { buildBracket } from "@/lib/bracket";
import type { CompetitionSettings, Team, WinnerMap } from "@/lib/types";

type OfficialChampionship = {
  regions: Array<{
    sectionId: number;
    title: string;
  }>;
  games: OfficialGame[];
};

type OfficialGame = {
  bracketPositionId: number;
  victorBracketPositionId: number | null;
  sectionId: number;
  gameState: string;
  teams: OfficialTeam[];
};

type OfficialTeam = {
  isWinner: boolean;
  logoUrl: string | null;
  seed: number;
  nameShort: string;
};

const BRACKET_PAGE_REVALIDATE_SECONDS = 300;
const REGION_SECTION_ORDER = [2, 4, 3, 5];
const FIRST_ROUND_SEED_PAIRS: Array<[number, number]> = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15]
];

function getSeasonYear() {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  return month >= 2 ? year : year - 1;
}

function toAbsoluteLogoUrl(url: string | null) {
  if (!url) {
    return "";
  }

  return url.startsWith("http") ? url : `https://www.ncaa.com${url}`;
}

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’.(),&/-]/g, "")
    .replace(/\s+/g, "")
    .replace(/university/g, "")
    .replace(/college/g, "");
}

function buildPlaceholderName(game: OfficialGame) {
  return game.teams.map((team) => team.nameShort).join(" / ");
}

function extractNuxtPayload(html: string) {
  const match = html.match(
    /<script type="application\/json" data-nuxt-data="nuxt-app"[^>]*id="__NUXT_DATA__">([\s\S]*?)<\/script>/
  );

  if (!match) {
    throw new Error("Unable to locate NCAA women's bracket data.");
  }

  return JSON.parse(match[1]) as unknown[];
}

function decodeNuxtPayload(payload: unknown[]) {
  const seen = new Map<number, unknown>();

  function resolveReference(value: unknown): unknown {
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
      return resolveObject(value as Record<string, unknown>);
    }

    return value;
  }

  function resolveIndex(index: number): unknown {
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
  }

  function resolveObject(
    value: Record<string, unknown>,
    target: Record<string, unknown> = {}
  ) {
    for (const [key, entry] of Object.entries(value)) {
      target[key] = resolveReference(entry);
    }

    return target;
  }

  function resolveValue(value: unknown, target?: unknown) {
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

      const output = (target as unknown[]) ?? [];

      for (const entry of value) {
        output.push(resolveReference(entry));
      }

      return output;
    }

    return resolveObject(value as Record<string, unknown>, target as Record<string, unknown>);
  }

  return resolveIndex(0) as {
    pinia: {
      main: {
        championship: OfficialChampionship;
      };
    };
  };
}

async function fetchOfficialChampionship() {
  const seasonYear = getSeasonYear();
  const response = await fetch(
    `https://www.ncaa.com/brackets/basketball-women/d1/${seasonYear}`,
    {
      next: { revalidate: BRACKET_PAGE_REVALIDATE_SECONDS }
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load NCAA women's bracket page.");
  }

  const html = await response.text();
  const payload = extractNuxtPayload(html);
  const decoded = decodeNuxtPayload(payload);

  return decoded.pinia.main.championship;
}

function buildOfficialWomensState() {
  return fetchOfficialChampionship().then((championship) => {
    const regionNames = REGION_SECTION_ORDER.map((sectionId) => {
      const region = championship.regions.find((entry) => entry.sectionId === sectionId);

      if (!region) {
        throw new Error(`Missing region metadata for women's section ${sectionId}.`);
      }

      return region.title;
    });

    const firstFourByTarget = new Map(
      championship.games
        .filter((game) => game.sectionId === 1)
        .map((game) => [game.victorBracketPositionId, game] as const)
    );

    const teams: Team[] = [];
    const placeholderSlotByTarget = new Map<number, number>();

    REGION_SECTION_ORDER.forEach((sectionId, regionIndex) => {
      const games = championship.games
        .filter((game) => game.sectionId === sectionId && game.bracketPositionId >= 201 && game.bracketPositionId <= 232)
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
          const slotNumber = regionIndex * 16 + teams.length % 16 + 1;
          const team = teamBySeed.get(seed);

          if (!team) {
            throw new Error(
              `Missing women's team for section ${sectionId}, game ${game.bracketPositionId}, seed ${seed}.`
            );
          }

          teams.push({
            competitionSlug: "womens",
            slotNumber,
            regionIndex,
            seed,
            name: team.name,
            logoUrl: team.logoUrl
          });

          if (playInGame && !team.logoUrl) {
            placeholderSlotByTarget.set(game.bracketPositionId, slotNumber);
          }
        }
      });
    });

    return {
      championship,
      regionNames,
      teams,
      placeholderSlotByTarget
    };
  });
}

function buildWinnerMaps(
  championship: OfficialChampionship,
  settings: CompetitionSettings,
  teams: Team[],
  winners: WinnerMap
) {
  const regionIndexBySectionId = new Map(
    REGION_SECTION_ORDER.map((sectionId, index) => [sectionId, index])
  );
  const gameIdByOfficialPosition = new Map<number, string>();

  for (const sectionId of REGION_SECTION_ORDER) {
    const regionIndex = regionIndexBySectionId.get(sectionId)!;

    const roundOne = championship.games
      .filter((game) => game.sectionId === sectionId && game.bracketPositionId >= 201 && game.bracketPositionId <= 232)
      .sort((left, right) => left.bracketPositionId - right.bracketPositionId);
    roundOne.forEach((game, gameIndex) => {
      gameIdByOfficialPosition.set(game.bracketPositionId, `r1-${regionIndex}-${gameIndex}`);
    });

    const roundTwo = championship.games
      .filter((game) => game.sectionId === sectionId && game.bracketPositionId >= 301 && game.bracketPositionId <= 399)
      .sort((left, right) => left.bracketPositionId - right.bracketPositionId);
    roundTwo.forEach((game, gameIndex) => {
      gameIdByOfficialPosition.set(game.bracketPositionId, `r2-${regionIndex}-${gameIndex}`);
    });

    const roundThree = championship.games
      .filter((game) => game.sectionId === sectionId && game.bracketPositionId >= 401 && game.bracketPositionId <= 499)
      .sort((left, right) => left.bracketPositionId - right.bracketPositionId);
    roundThree.forEach((game, gameIndex) => {
      gameIdByOfficialPosition.set(game.bracketPositionId, `r3-${regionIndex}-${gameIndex}`);
    });

    const roundFour = championship.games
      .filter((game) => game.sectionId === sectionId && game.bracketPositionId >= 501 && game.bracketPositionId <= 599)
      .sort((left, right) => left.bracketPositionId - right.bracketPositionId);
    roundFour.forEach((game) => {
      gameIdByOfficialPosition.set(game.bracketPositionId, `r4-${regionIndex}-0`);
    });
  }

  gameIdByOfficialPosition.set(601, "r5-0");
  gameIdByOfficialPosition.set(602, "r5-1");
  gameIdByOfficialPosition.set(701, "r6-0");

  const workingWinners = { ...winners };
  const finalGames = championship.games
    .filter((game) => game.gameState === "final" && game.sectionId !== 1)
    .sort((left, right) => left.bracketPositionId - right.bracketPositionId);

  for (const officialGame of finalGames) {
    const localGameId = gameIdByOfficialPosition.get(officialGame.bracketPositionId);

    if (!localGameId) {
      continue;
    }

    const bracket = buildBracket(settings, teams, workingWinners);
    const localGame =
      localGameId === "r6-0"
        ? bracket.national.final
        : localGameId.startsWith("r5-")
          ? bracket.national.semifinals[Number(localGameId.slice(3))]
          : bracket.regions
              .flatMap((region) => region.rounds.flatMap((round) => round.games))
              .find((game) => game.id === localGameId);

    if (!localGame) {
      continue;
    }

    const winningTeam = officialGame.teams.find((team) => team.isWinner);

    if (!winningTeam) {
      continue;
    }

    const localWinner = localGame.teams.find(
      (team) =>
        team &&
        normalizeTeamName(team.name) === normalizeTeamName(winningTeam.nameShort)
    );

    if (localWinner) {
      workingWinners[localGameId] = localWinner.slotNumber;
    }
  }

  return buildBracket(settings, teams, workingWinners).winners;
}

export async function applyOfficialWomensBracketAndResults(input: {
  settings: CompetitionSettings;
  teams: Team[];
  winners: WinnerMap;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      settings: input.settings,
      teams: input.teams,
      winners: input.winners,
      changed: false
    };
  }

  const { championship, regionNames, teams: importedTeams, placeholderSlotByTarget } =
    await buildOfficialWomensState();
  const workingTeams = importedTeams.map((team) => ({ ...team }));
  const workingSettings: CompetitionSettings = {
    ...input.settings,
    regionNames
  };

  for (const playInGame of championship.games.filter(
    (game) => game.sectionId === 1 && game.gameState === "final"
  )) {
    const winner = playInGame.teams.find((team) => team.isWinner);
    const slotNumber = placeholderSlotByTarget.get(playInGame.victorBracketPositionId ?? -1);

    if (!winner || !slotNumber) {
      continue;
    }

    const targetTeam = workingTeams.find((team) => team.slotNumber === slotNumber);

    if (targetTeam) {
      targetTeam.name = winner.nameShort;
      targetTeam.logoUrl = toAbsoluteLogoUrl(winner.logoUrl);
    }
  }

  const cleanedWinners = buildWinnerMaps(
    championship,
    workingSettings,
    workingTeams,
    input.winners
  );
  const changed =
    JSON.stringify(input.settings.regionNames) !== JSON.stringify(regionNames) ||
    JSON.stringify(input.teams) !== JSON.stringify(workingTeams) ||
    JSON.stringify(input.winners) !== JSON.stringify(cleanedWinners);

  return {
    settings: workingSettings,
    teams: workingTeams,
    winners: cleanedWinners,
    changed
  };
}
