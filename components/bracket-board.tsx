"use client";

import type { DerivedBracket, Team } from "@/lib/types";

type BracketBoardProps = {
  bracket: DerivedBracket;
  editable?: boolean;
  savingGameId?: string | null;
  onWinnerChange?: (gameId: string, winnerSlot: number | null) => void;
};

function TeamButton({
  team,
  gameId,
  winnerSlot,
  editable,
  saving,
  onWinnerChange
}: {
  team: Team | null;
  gameId: string;
  winnerSlot: number | null;
  editable: boolean;
  saving: boolean;
  onWinnerChange?: (gameId: string, winnerSlot: number | null) => void;
}) {
  const isWinner = team?.slotNumber === winnerSlot;

  return (
    <button
      className={`team-slot ${isWinner ? "is-winner" : ""} ${!team ? "is-empty" : ""}`}
      disabled={!editable || !team || saving}
      onClick={() => {
        if (!team || !onWinnerChange) {
          return;
        }

        onWinnerChange(gameId, isWinner ? null : team.slotNumber);
      }}
      type="button"
    >
      <div className="team-slot__identity">
        <span className="team-slot__seed">{team?.seed ?? "-"}</span>
        {team?.logoUrl ? (
          <img
            className="team-slot__logo"
            src={team.logoUrl}
            alt={`${team.name} logo`}
          />
        ) : (
          <span className="team-slot__logo team-slot__logo--placeholder" />
        )}
        <span className="team-slot__name">{team?.name ?? "Open slot"}</span>
      </div>
      {isWinner ? <span className="team-slot__badge">Winner</span> : null}
    </button>
  );
}

function GameCard({
  game,
  editable = false,
  savingGameId,
  onWinnerChange
}: Pick<BracketBoardProps, "editable" | "savingGameId" | "onWinnerChange"> & {
  game: DerivedBracket["regions"][number]["rounds"][number]["games"][number];
}) {
  return (
    <article className="game-card">
      <div className="game-card__meta">
        <span>{game.label}</span>
        <span>{game.id.toUpperCase()}</span>
      </div>
      <div className="game-card__slots">
        {game.teams.map((team, index) => (
          <TeamButton
            team={team}
            gameId={game.id}
            key={`${game.id}-${team?.slotNumber ?? index}`}
            winnerSlot={game.winnerSlot}
            editable={Boolean(editable)}
            saving={savingGameId === game.id}
            onWinnerChange={onWinnerChange}
          />
        ))}
      </div>
    </article>
  );
}

function RegionSection({
  region,
  editable,
  savingGameId,
  onWinnerChange,
  reverse = false
}: Pick<BracketBoardProps, "editable" | "savingGameId" | "onWinnerChange"> & {
  region: DerivedBracket["regions"][number];
  reverse?: boolean;
}) {
  const displayRounds = reverse ? [...region.rounds].reverse() : region.rounds;

  return (
    <section className={`region-board ${reverse ? "region-board--reverse" : ""}`}>
      <header className="region-board__header">
        <h3>{region.regionName}</h3>
      </header>
      <div className="region-board__rounds">
        {displayRounds.map((round) => (
          <div
            className={`round-column round-column--round-${round.round} ${
              reverse ? "round-column--reverse" : ""
            }`}
            key={`${region.regionName}-${round.round}`}
          >
            <p className="round-column__title">{round.label}</p>
            <div className="round-column__games">
              {round.games.map((game) => (
                <GameCard
                  game={game}
                  key={game.id}
                  editable={editable}
                  savingGameId={savingGameId}
                  onWinnerChange={onWinnerChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BracketBoard({
  bracket,
  editable = false,
  savingGameId = null,
  onWinnerChange
}: BracketBoardProps) {
  return (
    <section className="bracket-shell">
      <div className="bracket-shell__intro">
        <div>
          <p className="panel__eyebrow">Bracket Board</p>
          <h2>Track every winner to the title</h2>
        </div>
        {editable ? (
          <p className="inline-note">
            Commissioner mode: click a team to advance it. Clicking the current
            winner clears that pick.
          </p>
        ) : null}
      </div>

      <div className="bracket-layout">
        <div className="bracket-side">
          {bracket.regions.slice(0, 2).map((region) => (
            <RegionSection
              editable={editable}
              key={region.regionName}
              onWinnerChange={onWinnerChange}
              region={region}
              savingGameId={savingGameId}
            />
          ))}
        </div>

        <div className="finals-board">
          <div className="finals-board__column">
            <p className="round-column__title">Final Four</p>
            {bracket.national.semifinals.map((game) => (
              <GameCard
                game={game}
                key={game.id}
                editable={editable}
                savingGameId={savingGameId}
                onWinnerChange={onWinnerChange}
              />
            ))}
          </div>
          <div className="finals-board__column finals-board__column--championship">
            <p className="round-column__title">Championship</p>
            <GameCard
              game={bracket.national.final}
              editable={editable}
              savingGameId={savingGameId}
              onWinnerChange={onWinnerChange}
            />
            <div className="champion-card">
              <span className="panel__eyebrow">Champion</span>
              <strong>{bracket.champion?.name ?? "Waiting on the last game"}</strong>
            </div>
          </div>
        </div>

        <div className="bracket-side">
          {bracket.regions.slice(2).map((region) => (
            <RegionSection
              editable={editable}
              key={region.regionName}
              onWinnerChange={onWinnerChange}
              region={region}
              reverse
              savingGameId={savingGameId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
