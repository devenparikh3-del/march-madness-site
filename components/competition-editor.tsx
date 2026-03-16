"use client";

import { useState, useTransition } from "react";

import { BracketBoard } from "@/components/bracket-board";
import { buildBracket } from "@/lib/bracket";
import type { CompetitionState, Team } from "@/lib/types";

type CompetitionEditorProps = {
  competition: CompetitionState;
};

type ApiResponse = {
  competition?: CompetitionState;
  error?: string;
};

export function CompetitionEditor({ competition }: CompetitionEditorProps) {
  const [draft, setDraft] = useState(competition);
  const [message, setMessage] = useState("");
  const [savingGameId, setSavingGameId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewBracket = buildBracket(draft.settings, draft.teams, draft.winners);

  function updateTeam(slotNumber: number, patch: Partial<Team>) {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team) =>
        team.slotNumber === slotNumber ? { ...team, ...patch } : team
      )
    }));
  }

  function updateSetting<Value extends keyof CompetitionState["settings"]>(
    key: Value,
    value: CompetitionState["settings"][Value]
  ) {
    setDraft((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  async function postPayload(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/competitions/${draft.settings.slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = (await response.json()) as ApiResponse;

    if (!response.ok || !payload.competition) {
      throw new Error(payload.error ?? "Unable to save changes.");
    }

    return payload.competition;
  }

  function saveContent() {
    startTransition(async () => {
      setMessage("");

      try {
        const nextCompetition = await postPayload({
          type: "content",
          settings: draft.settings,
          teams: draft.teams
        });
        setDraft(nextCompetition);
        setMessage("Content saved.");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to save content."
        );
      }
    });
  }

  function handleWinnerChange(gameId: string, winnerSlot: number | null) {
    setSavingGameId(gameId);

    startTransition(async () => {
      setMessage("");

      try {
        const nextCompetition = await postPayload({
          type: "winner",
          gameId,
          winnerSlot
        });
        setDraft(nextCompetition);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to save winner."
        );
      } finally {
        setSavingGameId(null);
      }
    });
  }

  return (
    <section className="admin-editor">
      <div className="admin-editor__header">
        <div>
          <p className="panel__eyebrow">{draft.settings.label} Pool</p>
          <h2>{draft.settings.title}</h2>
        </div>
        <button className="cta-button" disabled={isPending} onClick={saveContent} type="button">
          {isPending ? "Saving..." : "Save content"}
        </button>
      </div>

      {draft.dataMode === "demo" ? (
        <div className="inline-note">
          Demo mode is active. Saves will start persisting after Supabase and
          your environment variables are configured.
        </div>
      ) : null}
      {message ? (
        <p className={`form-message ${message.includes("saved") ? "is-success" : "is-error"}`}>
          {message}
        </p>
      ) : null}

      <div className="admin-editor__grid">
        <section className="panel admin-editor__panel">
          <div className="panel__header">
            <p className="panel__eyebrow">Page Settings</p>
            <h3>Copy, links, and payments</h3>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Label</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("label", event.target.value)}
                value={draft.settings.label}
              />
            </label>
            <label className="form-field">
              <span>Title</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("title", event.target.value)}
                value={draft.settings.title}
              />
            </label>
            <label className="form-field form-field--full">
              <span>Subtitle</span>
              <textarea
                className="text-area"
                onChange={(event) => updateSetting("subtitle", event.target.value)}
                rows={3}
                value={draft.settings.subtitle}
              />
            </label>
            <label className="form-field form-field--full">
              <span>ESPN signup link</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("signupUrl", event.target.value)}
                value={draft.settings.signupUrl}
              />
            </label>
            <label className="form-field form-field--full">
              <span>Published Google Sheet link</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("sheetUrl", event.target.value)}
                value={draft.settings.sheetUrl}
              />
            </label>
            <label className="form-field">
              <span>Venmo handle</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("venmoHandle", event.target.value)}
                value={draft.settings.venmoHandle}
              />
            </label>
            <label className="form-field">
              <span>Buy-in amount</span>
              <input
                className="text-input"
                min="0"
                onChange={(event) =>
                  updateSetting("buyInAmount", Number(event.target.value) || 0)
                }
                step="1"
                type="number"
                value={draft.settings.buyInAmount}
              />
            </label>
            <label className="form-field form-field--full">
              <span>Manual update note</span>
              <textarea
                className="text-area"
                onChange={(event) => updateSetting("updateNote", event.target.value)}
                rows={2}
                value={draft.settings.updateNote}
              />
            </label>
            <label className="form-field form-field--full">
              <span>Footer disclaimer</span>
              <input
                className="text-input"
                onChange={(event) => updateSetting("disclaimer", event.target.value)}
                value={draft.settings.disclaimer}
              />
            </label>
          </div>

          <div className="region-name-grid">
            {draft.settings.regionNames.map((regionName, index) => (
              <label className="form-field" key={`${draft.settings.slug}-region-${index}`}>
                <span>Region {index + 1} label</span>
                <input
                  className="text-input"
                  onChange={(event) =>
                    updateSetting(
                      "regionNames",
                      draft.settings.regionNames.map((existing, regionIndex) =>
                        regionIndex === index ? event.target.value : existing
                      )
                    )
                  }
                  value={regionName}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel admin-editor__panel admin-editor__panel--wide">
          <div className="panel__header">
            <p className="panel__eyebrow">Team Slots</p>
            <h3>Names, seeds, and logos</h3>
          </div>

          <div className="team-groups">
            {draft.settings.regionNames.map((regionName, regionIndex) => {
              const regionTeams = draft.teams.filter(
                (team) => team.regionIndex === regionIndex
              );

              return (
                <section className="team-group" key={`${draft.settings.slug}-${regionName}`}>
                  <header className="team-group__header">
                    <h4>{regionName}</h4>
                  </header>
                  <div className="team-group__rows">
                    {regionTeams.map((team) => (
                      <div className="team-row" key={`${draft.settings.slug}-${team.slotNumber}`}>
                        <div className="team-row__slot">#{team.slotNumber}</div>
                        <input
                          className="text-input"
                          onChange={(event) =>
                            updateTeam(team.slotNumber, { name: event.target.value })
                          }
                          value={team.name}
                        />
                        <input
                          className="text-input team-row__seed"
                          min="1"
                          onChange={(event) =>
                            updateTeam(team.slotNumber, {
                              seed: Number(event.target.value) || team.seed
                            })
                          }
                          type="number"
                          value={team.seed}
                        />
                        <input
                          className="text-input"
                          onChange={(event) =>
                            updateTeam(team.slotNumber, { logoUrl: event.target.value })
                          }
                          placeholder="Logo URL"
                          value={team.logoUrl}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>

      <BracketBoard
        bracket={previewBracket}
        editable
        savingGameId={savingGameId}
        onWinnerChange={handleWinnerChange}
      />
    </section>
  );
}
