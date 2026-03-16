import { CompetitionPage } from "@/components/competition-page";
import { getCompetitionState } from "@/lib/data";

export const revalidate = 300;

export default async function MensPage() {
  const competition = await getCompetitionState("mens");

  return <CompetitionPage competition={competition} />;
}
