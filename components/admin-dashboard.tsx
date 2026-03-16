"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { CompetitionEditor } from "@/components/competition-editor";
import { CompetitionNav } from "@/components/competition-nav";
import type { CompetitionState } from "@/lib/types";

type AdminDashboardProps = {
  competitions: CompetitionState[];
};

export function AdminDashboard({ competitions }: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    });
  }

  return (
    <div className="competition-theme admin-theme">
      <div className="page-shell">
        <CompetitionNav activeSlug="mens" />
        <header className="admin-header">
          <div>
            <p className="panel__eyebrow">Commissioner Console</p>
            <h1>Manage both tournaments in one place</h1>
            <p className="panel__description">
              Update the public copy, change ESPN links, add teams and logos,
              and click through winners as games finish.
            </p>
          </div>
          <button className="secondary-button" onClick={handleLogout} type="button">
            {isPending ? "Leaving..." : "Log out"}
          </button>
        </header>
        <div className="admin-stack">
          {competitions.map((competition) => (
            <CompetitionEditor competition={competition} key={competition.settings.slug} />
          ))}
        </div>
      </div>
    </div>
  );
}
