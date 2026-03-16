import type {
  BracketGame,
  CompetitionSettings,
  DerivedBracket,
  Team,
  WinnerMap
} from "@/lib/types";

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship"
};

function buildGame(
  id: string,
  round: number,
  regionIndex: number | null,
  teams: [Team | null, Team | null],
  rawWinners: WinnerMap,
  cleanedWinners: WinnerMap
) {
  const storedWinner = rawWinners[id];
  const winnerTeam =
    teams.find((team) => team?.slotNumber === storedWinner) ?? null;
  const winnerSlot = winnerTeam?.slotNumber ?? null;

  if (winnerSlot) {
    cleanedWinners[id] = winnerSlot;
  }

  const game: BracketGame = {
    id,
    round,
    label: ROUND_LABELS[round],
    regionIndex,
    teams,
    winnerSlot
  };

  return {
    game,
    winnerTeam
  };
}

function pairWinners(games: BracketGame[], teamsBySlot: Map<number, Team>) {
  const winners = games.map((game) => {
    if (!game.winnerSlot) {
      return null;
    }

    return teamsBySlot.get(game.winnerSlot) ?? null;
  });

  const pairs: Array<[Team | null, Team | null]> = [];

  for (let index = 0; index < winners.length; index += 2) {
    pairs.push([winners[index] ?? null, winners[index + 1] ?? null]);
  }

  return pairs;
}

export function buildBracket(
  settings: CompetitionSettings,
  teams: Team[],
  winners: WinnerMap
): DerivedBracket {
  const cleanedWinners: WinnerMap = {};
  const teamsBySlot = new Map(teams.map((team) => [team.slotNumber, team]));

  const regions = settings.regionNames.map((regionName, regionIndex) => {
    const regionTeams = teams
      .filter((team) => team.regionIndex === regionIndex)
      .sort((left, right) => left.slotNumber - right.slotNumber);

    const roundOneGames = Array.from({ length: 8 }, (_, gameIndex) => {
      const teamA = regionTeams[gameIndex * 2] ?? null;
      const teamB = regionTeams[gameIndex * 2 + 1] ?? null;

      return buildGame(
        `r1-${regionIndex}-${gameIndex}`,
        1,
        regionIndex,
        [teamA, teamB],
        winners,
        cleanedWinners
      ).game;
    });

    const roundTwoGames = pairWinners(roundOneGames, teamsBySlot).map(
      (pair, gameIndex) =>
        buildGame(
          `r2-${regionIndex}-${gameIndex}`,
          2,
          regionIndex,
          pair,
          winners,
          cleanedWinners
        ).game
    );

    const roundThreeGames = pairWinners(roundTwoGames, teamsBySlot).map(
      (pair, gameIndex) =>
        buildGame(
          `r3-${regionIndex}-${gameIndex}`,
          3,
          regionIndex,
          pair,
          winners,
          cleanedWinners
        ).game
    );

    const roundFourGames = pairWinners(roundThreeGames, teamsBySlot).map(
      (pair, gameIndex) =>
        buildGame(
          `r4-${regionIndex}-${gameIndex}`,
          4,
          regionIndex,
          pair,
          winners,
          cleanedWinners
        ).game
    );

    return {
      regionIndex,
      regionName,
      rounds: [
        { round: 1, label: ROUND_LABELS[1], games: roundOneGames },
        { round: 2, label: ROUND_LABELS[2], games: roundTwoGames },
        { round: 3, label: ROUND_LABELS[3], games: roundThreeGames },
        { round: 4, label: ROUND_LABELS[4], games: roundFourGames }
      ]
    };
  });

  const regionChampions = regions.map((region) =>
    region.rounds[3].games[0]?.winnerSlot
      ? teamsBySlot.get(region.rounds[3].games[0].winnerSlot ?? -1) ?? null
      : null
  );

  const semifinalOne = buildGame(
    "r5-0",
    5,
    null,
    [regionChampions[0] ?? null, regionChampions[1] ?? null],
    winners,
    cleanedWinners
  ).game;
  const semifinalTwo = buildGame(
    "r5-1",
    5,
    null,
    [regionChampions[2] ?? null, regionChampions[3] ?? null],
    winners,
    cleanedWinners
  ).game;
  const final = buildGame(
    "r6-0",
    6,
    null,
    [
      semifinalOne.winnerSlot
        ? teamsBySlot.get(semifinalOne.winnerSlot) ?? null
        : null,
      semifinalTwo.winnerSlot
        ? teamsBySlot.get(semifinalTwo.winnerSlot) ?? null
        : null
    ],
    winners,
    cleanedWinners
  ).game;

  return {
    regions,
    national: {
      semifinals: [semifinalOne, semifinalTwo],
      final
    },
    winners: cleanedWinners,
    champion: final.winnerSlot ? teamsBySlot.get(final.winnerSlot) ?? null : null
  };
}
