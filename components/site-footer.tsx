type SiteFooterProps = {
  disclaimer: string;
  lastUpdated: string | null;
};

export function SiteFooter({ disclaimer, lastUpdated }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__left">
        <span>{disclaimer}</span>
      </div>
      <div className="site-footer__center">
        <span>Report will be updated at the end of the day.</span>
        <span>
          Last updated: {lastUpdated ? lastUpdated : "Waiting on manual spreadsheet update"}
        </span>
      </div>
      <div className="site-footer__right">Go Blue</div>
    </footer>
  );
}
