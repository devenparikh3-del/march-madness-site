import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCompetitionState } from "@/lib/data";

export async function GET() {
  try {
    const competition = await getCompetitionState("mens");

    revalidatePath("/mens");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      winnerCount: Object.keys(competition.winners).length,
      teamCount: competition.teams.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to sync men's bracket."
      },
      { status: 500 }
    );
  }
}
