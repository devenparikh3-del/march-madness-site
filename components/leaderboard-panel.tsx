import type { LeaderboardEntry } from "@/lib/types";

type LeaderboardPanelProps = {
  entries: LeaderboardEntry[];
  currentEntry?: LeaderboardEntry | null;
  isGuest?: boolean;
};

function LeaderboardRow({
  entry,
  compact = false
}: {
  entry: LeaderboardEntry;
  compact?: boolean;
}) {
  const content = (
    <>
      <div className="leaderboard-row__identity">
        <span className="leaderboard-row__rank">#{entry.rank}</span>
        <span className="leaderboard-row__name">{entry.nickname}</span>
      </div>
      <div className="leaderboard-row__score">
        <strong>{entry.points}</strong>
        <span>{entry.potentialPoints} potential</span>
      </div>
    </>
  );

  if (!entry.bracketUrl) {
    return <div className={`leaderboard-row ${compact ? "is-compact" : ""}`}>{content}</div>;
  }

  return (
    <a
      className={`leaderboard-row ${compact ? "is-compact" : ""}`}
      href={entry.bracketUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  );
}

export function LeaderboardPanel({
  entries,
  currentEntry = null,
  isGuest = false
}: LeaderboardPanelProps) {
  const topTen = entries.slice(0, 10);
  const showingCurrentEntry =
    currentEntry && !topTen.some((entry) => entry.nickname === currentEntry.nickname);

  return (
    <section className="panel leaderboard-panel">
      <div className="panel__header">
        <p className="panel__eyebrow">Leaderboard</p>
        <h2>Leaderboard</h2>
        <p className="panel__description">
          Only paid entries appear publicly. Everyone sees the top ten, plus
          their own place in the standings after entering a bracket username.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          Add a published Google Sheet in the admin area to populate the paid
          leaderboard.
        </div>
      ) : (
        <>
          {currentEntry ? (
            <div className="leaderboard-spotlight">
              <span className="leaderboard-spotlight__label">Your current rank</span>
              <strong>#{currentEntry.rank}</strong>
              <span>
                {currentEntry.nickname} · {currentEntry.points} points ·{" "}
                {currentEntry.potentialPoints} potential
              </span>
            </div>
          ) : (
            <div className="muted-card">
              {isGuest
                ? "Guest mode is active. Enter an ESPN username anytime to reveal your personal spot in the standings."
                : "Enter the same ESPN username you used for your bracket to reveal your personal spot in the standings."}
            </div>
          )}
          <div className="leaderboard-top">
            {topTen.map((entry) => (
              <LeaderboardRow entry={entry} key={`${entry.nickname}-${entry.rank}`} />
            ))}
          </div>
          {showingCurrentEntry ? (
            <div className="leaderboard-current">
              <p className="round-column__title">Your bracket</p>
              <LeaderboardRow entry={currentEntry} compact />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
