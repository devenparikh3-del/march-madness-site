import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";
import {
  assertCompetitionSlug,
  saveCompetitionContent,
  saveWinnerSelection
} from "@/lib/data";
import type { CompetitionSettings, Team } from "@/lib/types";

async function hasAdminAccess() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug: rawSlug } = await context.params;
  const slug = assertCompetitionSlug(rawSlug);
  const body = (await request.json()) as
    | {
        type: "content";
        settings: CompetitionSettings;
        teams: Team[];
      }
    | {
        type: "winner";
        gameId: string;
        winnerSlot: number | null;
      };

  try {
    const competition =
      body.type === "content"
        ? await saveCompetitionContent(slug, {
            settings: body.settings,
            teams: body.teams
          })
        : await saveWinnerSelection(slug, body.gameId, body.winnerSlot);

    revalidatePath("/mens");
    revalidatePath("/womens");
    revalidatePath("/admin");

    return NextResponse.json({ competition });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update competition."
      },
      { status: 400 }
    );
  }
}
