import { CompetitionPage } from "@/components/competition-page";
import { getCompetitionState } from "@/lib/data";

export const revalidate = 300;

export default async function WomensPage() {
  const competition = await getCompetitionState("womens");

  return <CompetitionPage competition={competition} />;
}
