import type {
  CompetitionSettings,
  CompetitionSlug,
  CompetitionTheme,
  Team
} from "@/lib/types";

export const COMPETITION_SLUGS: CompetitionSlug[] = ["mens", "womens"];

const BRACKET_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];

const themes: Record<CompetitionSlug, CompetitionTheme> = {
  mens: {
    accent: "#ff7a00",
    accentSoft: "rgba(255, 122, 0, 0.16)",
    ink: "#eff4ff",
    surface: "rgba(7, 22, 52, 0.84)",
    surfaceStrong: "rgba(4, 14, 34, 0.94)",
    border: "rgba(255, 166, 76, 0.28)",
    glow: "rgba(255, 122, 0, 0.35)",
    backgroundA: "#04111d",
    backgroundB: "#10315c",
    ribbon: "#ffb86c"
  },
  womens: {
    accent: "#df6d43",
    accentSoft: "rgba(223, 109, 67, 0.16)",
    ink: "#2f180d",
    surface: "rgba(255, 246, 236, 0.88)",
    surfaceStrong: "rgba(255, 241, 226, 0.98)",
    border: "rgba(164, 79, 33, 0.2)",
    glow: "rgba(223, 109, 67, 0.22)",
    backgroundA: "#fff4e7",
    backgroundB: "#f5d3b5",
    ribbon: "#7a3a22"
  }
};

const defaults: Record<CompetitionSlug, Omit<CompetitionSettings, "theme">> = {
  mens: {
    slug: "mens",
    label: "Men's",
    title: "Men's Tournament Challenge",
    subtitle:
      "Build your ESPN bracket, watch the bracket board take shape, and keep tabs on the paid leaderboard.",
    signupUrl: "",
    venmoHandle: "Deven49",
    buyInAmount: 10,
    updateNote: "Scores reflect manual spreadsheet updates, typically every two hours.",
    sheetUrl: "",
    disclaimer: "Not affiliated with PwC and not created using PwC resources.",
    regionNames: ["East", "West", "South", "Midwest"]
  },
  womens: {
    slug: "womens",
    label: "Women's",
    title: "Women's Tournament Challenge",
    subtitle:
      "Follow the women's bracket, use the ESPN signup link, and track only the paid entries on the leaderboard.",
    signupUrl: "",
    venmoHandle: "Deven49",
    buyInAmount: 10,
    updateNote: "Scores reflect manual spreadsheet updates, typically every two hours.",
    sheetUrl: "",
    disclaimer: "Not affiliated with PwC and not created using PwC resources.",
    regionNames: ["Region 1", "Region 2", "Region 3", "Region 4"]
  }
};

export function getDefaultCompetitionSettings(
  slug: CompetitionSlug
): CompetitionSettings {
  return {
    ...defaults[slug],
    theme: { ...themes[slug] },
    regionNames: [...defaults[slug].regionNames]
  };
}

export function getDefaultTeams(slug: CompetitionSlug): Team[] {
  return Array.from({ length: 4 }, (_, regionIndex) =>
    BRACKET_ORDER.map((seed, indexWithinRegion) => {
      const slotNumber = regionIndex * 16 + indexWithinRegion + 1;

      return {
        competitionSlug: slug,
        slotNumber,
        regionIndex,
        seed,
        name: `Selection Sunday Slot ${slotNumber}`,
        logoUrl: ""
      };
    })
  ).flat();
}
