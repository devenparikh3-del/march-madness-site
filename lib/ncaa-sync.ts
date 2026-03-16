import { buildBracket } from "@/lib/bracket";
import type { CompetitionSettings, Team, WinnerMap } from "@/lib/types";

type NcaaScoreboardResponse = {
  updated_at?: string;
  games?: Array<{
    game?: {
      away?: NcaaSide;
      home?: NcaaSide;
      bracketRound?: string;
      bracketRegion?: string;
      gameState?: string;
      startDate?: string;
      startTimeEpoch?: string;
    };
  }>;
};

type NcaaSide = {
  winner?: boolean;
  seed?: string;
  names?: {
    short?: string;
    full?: string;
    seo?: string;
  };
};

type TournamentResult = {
  round: "First Four" | "First Round" | "Second Round" | "Sweet 16" | "Elite Eight" | "FINAL FOUR" | "Championship";
  region: string;
  startDate: string;
  startTimeEpoch: number;
  away: NcaaSide;
  home: NcaaSide;
};

const TOURNAMENT_ROUNDS = new Set<TournamentResult["round"]>([
  "First Four",
  "First Round",
  "Second Round",
  "Sweet 16",
  "Elite Eight",
  "FINAL FOUR",
  "Championship"
]);

const ROUND_ORDER: Record<TournamentResult["round"], number> = {
  "First Four": 0,
  "First Round": 1,
  "Second Round": 2,
  "Sweet 16": 3,
  "Elite Eight": 4,
  "FINAL FOUR": 5,
  Championship: 6
};

const SCOREBOARD_REVALIDATE_SECONDS = 300;

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’.(),&/-]/g, "")
    .replace(/\s+/g, "")
    .replace(/university/g, "")
    .replace(/college/g, "")
    .replace(/state/g, "st")
    .replace(/saint/g, "st");
}

function teamNameVariants(value: string) {
  const trimmed = value.trim();
  const base = normalizeTeamName(trimmed);
  const variants = new Set<string>();

  if (base) {
    variants.add(base);
  }

  if (trimmed.includes("/")) {
    trimmed
      .split("/")
      .map((part) => normalizeTeamName(part))
      .filter(Boolean)
      .forEach((part) => variants.add(part));
  }

  return variants;
}

function ncaaSideVariants(side: NcaaSide) {
  const variants = new Set<string>();

  for (const candidate of [
    side.names?.short,
    side.names?.full,
    side.names?.seo?.replace(/-/g, " ")
  ]) {
    if (!candidate) {
      continue;
    }

    variants.add(normalizeTeamName(candidate));
  }

  return variants;
}

function teamMatchesSide(teamName: string, side: NcaaSide) {
  const teamVariants = teamNameVariants(teamName);
  const sideVariants = ncaaSideVariants(side);

  for (const variant of teamVariants) {
    if (sideVariants.has(variant)) {
      return true;
    }
  }

  return false;
}

function parseTournamentResult(
  payload: NcaaScoreboardResponse
): TournamentResult[] {
  return (payload.games ?? [])
    .map((entry) => entry.game)
    .filter((game): game is NonNullable<typeof game> => Boolean(game))
    .filter(
      (game) =>
        game.gameState === "final" &&
        Boolean(game.away) &&
        Boolean(game.home) &&
        TOURNAMENT_ROUNDS.has(game.bracketRound as TournamentResult["round"])
    )
    .map((game) => ({
      round: game.bracketRound as TournamentResult["round"],
      region: game.bracketRegion ?? "",
      startDate: game.startDate ?? "",
      startTimeEpoch: Number(game.startTimeEpoch ?? 0),
      away: game.away as NcaaSide,
      home: game.home as NcaaSide
    }));
}

function getSeasonYear() {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  return month >= 2 ? year : year - 1;
}

function getTournamentDates(seasonYear: number) {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(seasonYear, 2, 17));
  const end = new Date(Date.UTC(seasonYear, 3, 7));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cursor.getUTCDate()).padStart(2, "0");

    dates.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

async function fetchScoreboard(date: string) {
  const [year, month, day] = date.split("-");
  const response = await fetch(
    `https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/${year}/${month}/${day}/scoreboard.json`,
    {
      next: { revalidate: SCOREBOARD_REVALIDATE_SECONDS }
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as NcaaScoreboardResponse;
}

async function getTournamentResults() {
  const seasonYear = getSeasonYear();
  const dates = getTournamentDates(seasonYear);
  const payloads = await Promise.all(dates.map((date) => fetchScoreboard(date)));

  return payloads
    .flatMap((payload) => (payload ? parseTournamentResult(payload) : []))
    .sort((left, right) => {
      const roundDelta = ROUND_ORDER[left.round] - ROUND_ORDER[right.round];

      if (roundDelta !== 0) {
        return roundDelta;
      }

      const dateDelta = left.startDate.localeCompare(right.startDate);

      if (dateDelta !== 0) {
        return dateDelta;
      }

      return left.startTimeEpoch - right.startTimeEpoch;
    });
}

function getWinningSide(result: TournamentResult) {
  if (result.home.winner) {
    return result.home;
  }

  if (result.away.winner) {
    return result.away;
  }

  return null;
}

function maybeApplyFirstFourWinner(teams: Team[], result: TournamentResult) {
  const winner = getWinningSide(result);

  if (!winner) {
    return false;
  }

  const candidates = teams.filter((team) => {
    if (!team.name.includes("/")) {
      return false;
    }

    return teamMatchesSide(team.name, result.away) && teamMatchesSide(team.name, result.home);
  });

  if (candidates.length !== 1) {
    return false;
  }

  const winnerName = winner.names?.short?.trim();

  if (!winnerName || candidates[0].name === winnerName) {
    return false;
  }

  candidates[0].name = winnerName;
  return true;
}

function getRoundCandidates(
  settings: CompetitionSettings,
  teams: Team[],
  winners: WinnerMap,
  result: TournamentResult
) {
  const bracket = buildBracket(settings, teams, winners);

  switch (result.round) {
    case "First Round":
      return bracket.regions
        .find(
          (region) =>
            normalizeTeamName(region.regionName) === normalizeTeamName(result.region)
        )
        ?.rounds[0].games ?? [];
    case "Second Round":
      return bracket.regions
        .find(
          (region) =>
            normalizeTeamName(region.regionName) === normalizeTeamName(result.region)
        )
        ?.rounds[1].games ?? [];
    case "Sweet 16":
      return bracket.regions
        .find(
          (region) =>
            normalizeTeamName(region.regionName) === normalizeTeamName(result.region)
        )
        ?.rounds[2].games ?? [];
    case "Elite Eight":
      return bracket.regions
        .find(
          (region) =>
            normalizeTeamName(region.regionName) === normalizeTeamName(result.region)
        )
        ?.rounds[3].games ?? [];
    case "FINAL FOUR":
      return bracket.national.semifinals;
    case "Championship":
      return [bracket.national.final];
    default:
      return [];
  }
}

function gameMatchesResult(
  game: { teams: [Team | null, Team | null] },
  result: TournamentResult
) {
  const [teamA, teamB] = game.teams;

  if (!teamA || !teamB) {
    return false;
  }

  const directMatch =
    teamMatchesSide(teamA.name, result.away) && teamMatchesSide(teamB.name, result.home);
  const swappedMatch =
    teamMatchesSide(teamA.name, result.home) && teamMatchesSide(teamB.name, result.away);

  if (directMatch || swappedMatch) {
    return true;
  }

  const resultSeeds = [result.away.seed ?? "", result.home.seed ?? ""]
    .filter(Boolean)
    .sort()
    .join("-");
  const gameSeeds = [String(teamA.seed), String(teamB.seed)].sort().join("-");

  return Boolean(resultSeeds) && resultSeeds === gameSeeds;
}

function applyWinnerToGame(
  teams: Team[],
  winners: WinnerMap,
  settings: CompetitionSettings,
  result: TournamentResult
) {
  const winner = getWinningSide(result);

  if (!winner) {
    return false;
  }

  const candidates = getRoundCandidates(settings, teams, winners, result).filter((game) =>
    gameMatchesResult(game, result)
  );

  if (candidates.length !== 1) {
    return false;
  }

  const game = candidates[0];
  const winnerTeam = game.teams.find(
    (team) => team && teamMatchesSide(team.name, winner)
  );

  if (!winnerTeam || winners[game.id] === winnerTeam.slotNumber) {
    return false;
  }

  winners[game.id] = winnerTeam.slotNumber;
  return true;
}

export async function applyOfficialMensResults(input: {
  settings: CompetitionSettings;
  teams: Team[];
  winners: WinnerMap;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      teams: input.teams,
      winners: input.winners,
      changed: false
    };
  }

  const results = await getTournamentResults();
  const workingTeams = input.teams.map((team) => ({ ...team }));
  const workingWinners = { ...input.winners };
  let changed = false;

  for (const result of results) {
    if (result.round === "First Four") {
      changed = maybeApplyFirstFourWinner(workingTeams, result) || changed;
      continue;
    }

    changed =
      applyWinnerToGame(workingTeams, workingWinners, input.settings, result) || changed;
  }

  const cleanedWinners = buildBracket(
    input.settings,
    workingTeams,
    workingWinners
  ).winners;

  return {
    teams: workingTeams,
    winners: cleanedWinners,
    changed:
      changed ||
      JSON.stringify(input.teams) !== JSON.stringify(workingTeams) ||
      JSON.stringify(input.winners) !== JSON.stringify(cleanedWinners)
  };
}
