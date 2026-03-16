import { CompetitionExperience } from "@/components/competition-experience";
import type { CompetitionState } from "@/lib/types";

type CompetitionPageProps = {
  competition: CompetitionState;
};

export function CompetitionPage({ competition }: CompetitionPageProps) {
  return <CompetitionExperience competition={competition} />;
}
