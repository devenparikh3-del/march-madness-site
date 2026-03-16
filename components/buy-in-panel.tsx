import type { CompetitionSettings } from "@/lib/types";

type BuyInPanelProps = {
  settings: CompetitionSettings;
  isTemplateMode: boolean;
};

export function BuyInPanel({ settings, isTemplateMode }: BuyInPanelProps) {
  return (
    <div className="info-stack">
      <section className="panel callout-panel">
        <div className="panel__header">
          <p className="panel__eyebrow">Join the Pool</p>
          <h2>Build your ESPN bracket</h2>
          <p className="panel__description">
            Use the league link below to create your bracket and join the right
            competition.
          </p>
        </div>
        {settings.signupUrl ? (
          <a
            className="cta-button"
            href={settings.signupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open ESPN signup
          </a>
        ) : (
          <div className="muted-card">
            ESPN signup link will appear here once it is added in the admin
            area.
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <p className="panel__eyebrow">Buy-In</p>
          <h2>${settings.buyInAmount.toFixed(0)} to play</h2>
        </div>
        <div className="buy-in-panel__body">
          <p>
            Send your payment to <strong>Venmo {settings.venmoHandle}</strong>.
          </p>
          <p>
            Only paid participants are shown publicly on the leaderboard once
            they are marked as paid in the score sheet.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <p className="panel__eyebrow">Scoring Note</p>
          <h2>Refresh cadence</h2>
        </div>
        <p className="panel__description">{settings.updateNote}</p>
        {isTemplateMode ? (
          <p className="inline-note">
            Template mode is active until Supabase and your published sheet are
            configured.
          </p>
        ) : null}
      </section>
    </div>
  );
}
