"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { BracketBoard } from "@/components/bracket-board";
import { CompetitionNav } from "@/components/competition-nav";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { SiteFooter } from "@/components/site-footer";
import type {
  CompetitionState,
  LeaderboardEntry,
  SustainabilityTeamCode
} from "@/lib/types";

type CompetitionExperienceProps = {
  competition: CompetitionState;
};

type ViewerMode = "member" | "guest";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

const SUSTAINABILITY_TEAMS: Array<{
  code: SustainabilityTeamCode;
  title: string;
}> = [
  { code: "SO", title: "Strategy and Operations" },
  { code: "RA", title: "Reporting and Assurance" },
  {
    code: "CPI",
    title: "Capital Projects and Investments"
  }
];

function FloatingBasketballs() {
  return (
    <div className="floating-basketballs" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className="floating-basketball"
          key={index}
          style={
            {
              "--delay": `${index * 0.45}s`,
              "--duration": `${8 + (index % 3) * 2}s`,
              "--left": `${8 + index * 10}%`,
              "--size": `${34 + (index % 4) * 8}px`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function UsernameGate({
  competition,
  initialUsername,
  errorMessage,
  onSubmit,
  onEnterGuest
}: {
  competition: CompetitionState;
  initialUsername: string;
  errorMessage: string;
  onSubmit: (username: string) => void;
  onEnterGuest: () => void;
}) {
  const [username, setUsername] = useState(initialUsername);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim()) {
      return;
    }

    onSubmit(username);
  }

  return (
    <div className="entry-gate">
      <FloatingBasketballs />
      <div className="entry-gate__card">
        <div className="entry-gate__echo">Welcome to the Madness</div>
        <p className="panel__eyebrow">{competition.settings.label} Pool Access</p>
        <h1>Enter the pool portal</h1>
        <p>
          In order to gain access to this page, please sign up for the pool and
          Venmo <strong>{competition.settings.venmoHandle}</strong> for access.
          Otherwise, access will not be granted.
        </p>
        <p className="inline-note">
          It may take up to eight hours for access to be granted after your
          account is created and payment is received.
        </p>
        <form className="entry-gate__form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Enter your paid ESPN bracket username</span>
            <input
              className="text-input"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Deven49"
              value={username}
            />
          </label>
          {errorMessage ? (
            <p className="form-message is-error">{errorMessage}</p>
          ) : null}
          <button className="cta-button" type="submit">
            Request access
          </button>
        </form>
        <div className="entry-gate__guest">
          <span>Just browsing the bracket and standings?</span>
          <button className="secondary-button" onClick={onEnterGuest} type="button">
            Enter as guest
          </button>
        </div>
        <div className="entry-gate__actions">
          <span>Need to create your bracket first?</span>
          {competition.settings.signupUrl ? (
            <a
              className="secondary-button"
              href={competition.settings.signupUrl}
              rel="noreferrer"
              target="_blank"
            >
              Create it on ESPN
            </a>
          ) : (
            <span className="inline-note">ESPN signup link coming soon.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeFlash({
  username,
  onDismiss
}: {
  username: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 2600);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="welcome-flash" aria-live="polite">
      <FloatingBasketballs />
      <div className="welcome-flash__card">
        <span className="panel__eyebrow">Welcome back</span>
        <h2>Welcome to the Madness</h2>
        <p>{username} is locked in. Let&apos;s see where your bracket stands.</p>
      </div>
    </div>
  );
}

function SustainabilityTeamCards({
  entries
}: {
  entries: LeaderboardEntry[];
}) {
  const cards = SUSTAINABILITY_TEAMS.map((team) => {
    const teamEntries = entries.filter((entry) => entry.teamCode === team.code);
    const averageScore =
      teamEntries.length > 0
        ? teamEntries.reduce((sum, entry) => sum + entry.points, 0) / teamEntries.length
        : null;

    return {
      ...team,
      averageScore,
      participants: teamEntries.length
    };
  });

  return (
    <section className="team-pulse">
      {cards.map((card) => (
        <article className="team-pulse__card" key={card.code}>
          <div className="team-pulse__meta">
            <strong>{card.title}</strong>
          </div>
          <div className="team-pulse__score">
            <strong>
              {card.averageScore !== null ? card.averageScore.toFixed(1) : "--"}
            </strong>
          </div>
          <p>
            Average score across {card.participants}{" "}
            {card.participants === 1 ? "entrant" : "entrants"}
          </p>
        </article>
      ))}
    </section>
  );
}

function PoolSummary({
  buyInAmount,
  entrantCount
}: {
  buyInAmount: number;
  entrantCount: number;
}) {
  const totalPot = entrantCount * buyInAmount;

  return (
    <section className="pool-summary">
      <article className="pool-summary__card">
        <span className="pool-summary__label">Total Pot</span>
        <strong>{formatCurrency(totalPot)}</strong>
      </article>

      <article className="pool-summary__card">
        <span className="pool-summary__label">Payouts</span>
        <div className="pool-summary__payouts">
          <span>1st: 70% ({formatCurrency(totalPot * 0.7)})</span>
          <span>2nd: 20% ({formatCurrency(totalPot * 0.2)})</span>
          <span>3rd: 10% ({formatCurrency(totalPot * 0.1)})</span>
        </div>
        <p>Payouts are based on the final paid-entry pot.</p>
      </article>
    </section>
  );
}

export function CompetitionExperience({
  competition
}: CompetitionExperienceProps) {
  const [username, setUsername] = useState("");
  const [viewerMode, setViewerMode] = useState<ViewerMode>("member");
  const [showWelcome, setShowWelcome] = useState(false);
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(
      `march-madness-viewer-mode-${competition.settings.slug}`
    );
    const storedUsername = window.localStorage.getItem(
      `march-madness-username-${competition.settings.slug}`
    );

    if (storedMode === "guest") {
      setViewerMode("guest");
      setUsername("");
      return;
    }

    if (storedUsername) {
      setViewerMode("member");
      setUsername(storedUsername);
    }
  }, [competition.settings.slug]);

  const currentEntry = useMemo<LeaderboardEntry | null>(() => {
    if (!username || viewerMode === "guest") {
      return null;
    }

    const normalized = normalizeUsername(username);
    return (
      competition.leaderboard.find(
        (entry) => normalizeUsername(entry.nickname) === normalized
      ) ?? null
    );
  }, [competition.leaderboard, username]);

  const paidEntrantCount = competition.leaderboard.length;

  const themeStyle = {
    "--theme-accent": competition.settings.theme.accent,
    "--theme-accent-soft": competition.settings.theme.accentSoft,
    "--theme-ink": competition.settings.theme.ink,
    "--theme-surface": competition.settings.theme.surface,
    "--theme-surface-strong": competition.settings.theme.surfaceStrong,
    "--theme-border": competition.settings.theme.border,
    "--theme-glow": competition.settings.theme.glow,
    "--theme-background-a": competition.settings.theme.backgroundA,
    "--theme-background-b": competition.settings.theme.backgroundB,
    "--theme-ribbon": competition.settings.theme.ribbon
  } as CSSProperties;

  function handleUsernameSubmit(nextUsername: string) {
    const trimmed = nextUsername.trim();

    window.localStorage.setItem(
      `march-madness-viewer-mode-${competition.settings.slug}`,
      "member"
    );
    window.localStorage.setItem(
      `march-madness-username-${competition.settings.slug}`,
      trimmed
    );
    setGateError("");
    setViewerMode("member");
    setUsername(trimmed);
    setShowWelcome(true);
  }

  function handleGuestEntry() {
    window.localStorage.setItem(
      `march-madness-viewer-mode-${competition.settings.slug}`,
      "guest"
    );
    window.localStorage.removeItem(
      `march-madness-username-${competition.settings.slug}`
    );
    setGateError("");
    setViewerMode("guest");
    setUsername("");
    setShowWelcome(false);
  }

  function resetUsername() {
    window.localStorage.removeItem(
      `march-madness-viewer-mode-${competition.settings.slug}`
    );
    window.localStorage.removeItem(
      `march-madness-username-${competition.settings.slug}`
    );
    setViewerMode("member");
    setUsername("");
    setGateError("");
  }

  const isGuest = viewerMode === "guest";

  if (!username && !isGuest) {
    return (
      <div className="competition-theme" style={themeStyle}>
        <UsernameGate
          competition={competition}
          errorMessage={gateError}
          initialUsername={username}
          onEnterGuest={handleGuestEntry}
          onSubmit={handleUsernameSubmit}
        />
      </div>
    );
  }

  return (
    <div className="competition-theme" style={themeStyle}>
      {showWelcome ? (
        <WelcomeFlash username={username} onDismiss={() => setShowWelcome(false)} />
      ) : null}
      <div className="page-shell">
        <CompetitionNav
          activeSlug={competition.settings.slug}
          rightSlot={
            <button className="secondary-button" onClick={resetUsername} type="button">
              Switch username
            </button>
          }
        />
        <main className="page-grid">
          <aside className="page-rail">
            <LeaderboardPanel
              currentEntry={currentEntry}
              entries={competition.leaderboard}
              isGuest={isGuest}
            />
          </aside>

          <section className="page-center">
            <SustainabilityTeamCards entries={competition.leaderboard} />
            <PoolSummary
              buyInAmount={competition.settings.buyInAmount}
              entrantCount={paidEntrantCount}
            />
            <div className="hero-card hero-card--energized">
              <div className="hero-card__ribbon">{competition.settings.label} Pool</div>
              <div className="hero-card__league">Sustainability March Madness HQ</div>
              <div className="hero-card__topline">
                <h1>{competition.settings.title}</h1>
              </div>
              <p>{competition.settings.subtitle}</p>
              <div className="hero-card__stats">
                <div className="hero-stat">
                  <span className="hero-stat__label">Logged in as</span>
                  <strong>{isGuest ? "Guest" : username}</strong>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat__label">Your rank</span>
                  <strong>
                    {isGuest
                      ? "Hidden in guest mode"
                      : currentEntry
                        ? `#${currentEntry.rank}`
                        : "Not found yet"}
                  </strong>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat__label">Potential</span>
                  <strong>{isGuest ? "--" : currentEntry ? currentEntry.potentialPoints : "--"}</strong>
                </div>
              </div>
              {isGuest ? (
                <div className="inline-note">
                  You entered as a guest. Guest mode shows the bracket and public
                  standings, but not a personal rank.
                </div>
              ) : null}
              {!isGuest && !currentEntry ? (
                <div className="inline-note">
                  This username is not in the current paid leaderboard yet. You can
                  still view the bracket and top standings, but your personal rank
                  will appear after your sheet entry is added or updated.
                </div>
              ) : null}
              {competition.dataMode === "demo" ? (
                <div className="inline-note">
                  Template mode is live. Add your Supabase keys, ESPN links, and
                  Google Sheet feed when you are ready to publish.
                </div>
              ) : null}
            </div>

            <BracketBoard bracket={competition.bracket} />
            <SiteFooter
              disclaimer={competition.settings.disclaimer}
              lastUpdated={competition.leaderboardUpdatedAt}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
