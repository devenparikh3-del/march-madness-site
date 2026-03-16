import { createClient } from "@supabase/supabase-js";

import { isAdminConfigured } from "@/lib/admin-auth";
import { buildBracket } from "@/lib/bracket";
import {
  COMPETITION_SLUGS,
  getDefaultCompetitionSettings,
  getDefaultTeams
} from "@/lib/demo-data";
import { getLeaderboardFromSheet } from "@/lib/google-sheet";
import { applyOfficialMensResults } from "@/lib/ncaa-sync";
import { applyOfficialWomensBracketAndResults } from "@/lib/ncaa-womens-sync";
import type {
  CompetitionSettings,
  CompetitionSlug,
  CompetitionState,
  Team,
  WinnerMap
} from "@/lib/types";

type CompetitionRow = {
  slug: CompetitionSlug;
  label: string;
  title: string;
  subtitle: string;
  signup_url: string;
  venmo_handle: string;
  buy_in_amount: number;
  update_note: string;
  sheet_url: string;
  disclaimer: string;
  region_names: string[];
  theme: CompetitionSettings["theme"];
};

type TeamRow = {
  competition_slug: CompetitionSlug;
  slot_number: number;
  region_index: number;
  seed: number;
  name: string;
  logo_url: string;
};

type WinnerRow = {
  game_id: string;
  winner_slot: number;
};

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function mapCompetitionRow(row: CompetitionRow): CompetitionSettings {
  return {
    slug: row.slug,
    label: row.label,
    title: row.title,
    subtitle: row.subtitle,
    signupUrl: row.signup_url,
    venmoHandle: row.venmo_handle,
    buyInAmount: Number(row.buy_in_amount ?? 10),
    updateNote: row.update_note,
    sheetUrl: row.sheet_url,
    disclaimer: row.disclaimer,
    regionNames: row.region_names,
    theme: row.theme
  };
}

function mapTeamRow(row: TeamRow): Team {
  return {
    competitionSlug: row.competition_slug,
    slotNumber: row.slot_number,
    regionIndex: row.region_index,
    seed: row.seed,
    name: row.name,
    logoUrl: row.logo_url
  };
}

function toCompetitionPayload(settings: CompetitionSettings) {
  return {
    slug: settings.slug,
    label: settings.label,
    title: settings.title,
    subtitle: settings.subtitle,
    signup_url: settings.signupUrl,
    venmo_handle: settings.venmoHandle,
    buy_in_amount: settings.buyInAmount,
    update_note: settings.updateNote,
    sheet_url: settings.sheetUrl,
    disclaimer: settings.disclaimer,
    region_names: settings.regionNames,
    theme: settings.theme
  };
}

function toTeamPayload(team: Team) {
  return {
    competition_slug: team.competitionSlug,
    slot_number: team.slotNumber,
    region_index: team.regionIndex,
    seed: team.seed,
    name: team.name,
    logo_url: team.logoUrl
  };
}

async function persistWinners(
  client: ReturnType<typeof getSupabaseClient>,
  slug: CompetitionSlug,
  winners: WinnerMap
) {
  await client.from("match_winners").delete().eq("competition_slug", slug);

  const winnerRows = Object.entries(winners).map(([gameId, winnerSlot]) => ({
    competition_slug: slug,
    game_id: gameId,
    winner_slot: winnerSlot
  }));

  if (winnerRows.length > 0) {
    await client.from("match_winners").insert(winnerRows as never);
  }
}

async function persistCompetitionSnapshot(
  client: ReturnType<typeof getSupabaseClient>,
  settings: CompetitionSettings,
  teams: Team[],
  winners: WinnerMap
) {
  await client.from("competitions").upsert(toCompetitionPayload(settings), {
    onConflict: "slug"
  });
  await client.from("teams").upsert(teams.map(toTeamPayload), {
    onConflict: "competition_slug,slot_number"
  });
  await persistWinners(client, settings.slug, winners);
}

function defaultState(slug: CompetitionSlug): CompetitionState {
  const settings = getDefaultCompetitionSettings(slug);
  const teams = getDefaultTeams(slug);
  const bracket = buildBracket(settings, teams, {});

  return {
    settings,
    teams,
    winners: bracket.winners,
    bracket,
    leaderboard: [],
    leaderboardUpdatedAt: null,
    dataMode: "demo",
    adminEnabled: isAdminConfigured()
  };
}

async function seedCompetitionIfNeeded(slug: CompetitionSlug) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = getSupabaseClient();
  const { data: competition } = await client
    .from("competitions")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!competition) {
    await client.from("competitions").insert(toCompetitionPayload(getDefaultCompetitionSettings(slug)));
  }

  const { count } = await client
    .from("teams")
    .select("slot_number", { count: "exact", head: true })
    .eq("competition_slug", slug);

  if (!count) {
    await client.from("teams").upsert(getDefaultTeams(slug).map(toTeamPayload), {
      onConflict: "competition_slug,slot_number"
    });
  }
}

async function loadConfiguredCompetition(slug: CompetitionSlug): Promise<CompetitionState> {
  await seedCompetitionIfNeeded(slug);

  const client = getSupabaseClient();
  const [competitionResponse, teamsResponse, winnersResponse] = await Promise.all([
    client.from("competitions").select("*").eq("slug", slug).single(),
    client
      .from("teams")
      .select("*")
      .eq("competition_slug", slug)
      .order("slot_number", { ascending: true }),
    client.from("match_winners").select("game_id,winner_slot").eq("competition_slug", slug)
  ]);

  if (competitionResponse.error || teamsResponse.error || winnersResponse.error) {
    return defaultState(slug);
  }

  let settings = mapCompetitionRow(competitionResponse.data as CompetitionRow);
  let teams = (teamsResponse.data as TeamRow[]).map(mapTeamRow);
  let rawWinners = (winnersResponse.data as WinnerRow[]).reduce<WinnerMap>(
    (accumulator, row) => {
      accumulator[row.game_id] = row.winner_slot;
      return accumulator;
    },
    {}
  );

  if (slug === "mens") {
    const syncResult = await applyOfficialMensResults({
      settings,
      teams,
      winners: rawWinners
    });

    if (syncResult.changed) {
      teams = syncResult.teams;
      rawWinners = syncResult.winners;
      await persistCompetitionSnapshot(client, settings, teams, rawWinners);
    }
  }

  if (slug === "womens") {
    const syncResult = await applyOfficialWomensBracketAndResults({
      settings,
      teams,
      winners: rawWinners
    });

    if (syncResult.changed) {
      teams = syncResult.teams;
      rawWinners = syncResult.winners;
      settings = syncResult.settings;

      await persistCompetitionSnapshot(client, settings, teams, rawWinners);
    }
  }

  const bracket = buildBracket(settings, teams, rawWinners);
  const leaderboardResult = await getLeaderboardFromSheet(settings.sheetUrl);

  return {
    settings,
    teams,
    winners: bracket.winners,
    bracket,
    leaderboard: leaderboardResult.entries,
    leaderboardUpdatedAt: leaderboardResult.lastUpdated,
    dataMode: "supabase",
    adminEnabled: isAdminConfigured()
  };
}

export function assertCompetitionSlug(value: string): CompetitionSlug {
  if (value === "mens" || value === "womens") {
    return value;
  }

  throw new Error("Unknown competition slug.");
}

export async function getCompetitionState(
  slug: CompetitionSlug
): Promise<CompetitionState> {
  if (!isSupabaseConfigured()) {
    return defaultState(slug);
  }

  return loadConfiguredCompetition(slug);
}

export async function getAllCompetitionStates() {
  return Promise.all(COMPETITION_SLUGS.map((slug) => getCompetitionState(slug)));
}

export async function saveCompetitionContent(
  slug: CompetitionSlug,
  input: {
    settings: CompetitionSettings;
    teams: Team[];
  }
) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  await seedCompetitionIfNeeded(slug);

  const client = getSupabaseClient();
  const sanitizedSettings: CompetitionSettings = {
    ...input.settings,
    slug,
    label: input.settings.label.trim() || getDefaultCompetitionSettings(slug).label,
    title: input.settings.title.trim() || getDefaultCompetitionSettings(slug).title,
    subtitle: input.settings.subtitle.trim() || getDefaultCompetitionSettings(slug).subtitle,
    signupUrl: input.settings.signupUrl.trim(),
    venmoHandle: input.settings.venmoHandle.trim(),
    buyInAmount: Number(input.settings.buyInAmount) || 10,
    updateNote: input.settings.updateNote.trim(),
    sheetUrl: input.settings.sheetUrl.trim(),
    disclaimer:
      input.settings.disclaimer.trim() ||
      "Not affiliated with PwC and not created using PwC resources.",
    regionNames: input.settings.regionNames.map((name) => name.trim() || "Region")
  };
  const sanitizedTeams = input.teams
    .map((team) => ({
      ...team,
      competitionSlug: slug,
      slotNumber: team.slotNumber,
      name: team.name.trim() || `Selection Sunday Slot ${team.slotNumber}`,
      logoUrl: team.logoUrl.trim()
    }))
    .sort((left, right) => left.slotNumber - right.slotNumber);

  await client.from("competitions").upsert(toCompetitionPayload(sanitizedSettings), {
    onConflict: "slug"
  });
  await client.from("teams").upsert(sanitizedTeams.map(toTeamPayload), {
    onConflict: "competition_slug,slot_number"
  });

  return getCompetitionState(slug);
}

export async function saveWinnerSelection(
  slug: CompetitionSlug,
  gameId: string,
  winnerSlot: number | null
) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  await seedCompetitionIfNeeded(slug);

  const client = getSupabaseClient();
  const competition = await getCompetitionState(slug);
  const rawWinners = { ...competition.winners };

  if (winnerSlot === null) {
    delete rawWinners[gameId];
  } else {
    rawWinners[gameId] = winnerSlot;
  }

  const cleanedWinners = buildBracket(
    competition.settings,
    competition.teams,
    rawWinners
  ).winners;
  await persistWinners(client, slug, cleanedWinners);

  return getCompetitionState(slug);
}
