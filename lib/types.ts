export type CompetitionSlug = "mens" | "womens";
export type SustainabilityTeamCode = "SO" | "RA" | "CPI";

export type CompetitionTheme = {
  accent: string;
  accentSoft: string;
  ink: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  glow: string;
  backgroundA: string;
  backgroundB: string;
  ribbon: string;
};

export type CompetitionSettings = {
  slug: CompetitionSlug;
  label: string;
  title: string;
  subtitle: string;
  signupUrl: string;
  venmoHandle: string;
  buyInAmount: number;
  updateNote: string;
  sheetUrl: string;
  disclaimer: string;
  regionNames: string[];
  theme: CompetitionTheme;
};

export type Team = {
  competitionSlug: CompetitionSlug;
  slotNumber: number;
  regionIndex: number;
  seed: number;
  name: string;
  logoUrl: string;
};

export type WinnerMap = Record<string, number>;

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  points: number;
  potentialPoints: number;
  bracketUrl: string;
  paid: boolean;
  teamCode: SustainabilityTeamCode | null;
};

export type BracketGame = {
  id: string;
  round: number;
  label: string;
  regionIndex: number | null;
  teams: [Team | null, Team | null];
  winnerSlot: number | null;
};

export type RegionBracket = {
  regionIndex: number;
  regionName: string;
  rounds: Array<{
    round: number;
    label: string;
    games: BracketGame[];
  }>;
};

export type NationalBracket = {
  semifinals: BracketGame[];
  final: BracketGame;
};

export type DerivedBracket = {
  regions: RegionBracket[];
  national: NationalBracket;
  winners: WinnerMap;
  champion: Team | null;
};

export type CompetitionState = {
  settings: CompetitionSettings;
  teams: Team[];
  winners: WinnerMap;
  bracket: DerivedBracket;
  leaderboard: LeaderboardEntry[];
  leaderboardUpdatedAt: string | null;
  dataMode: "demo" | "supabase";
  adminEnabled: boolean;
};
