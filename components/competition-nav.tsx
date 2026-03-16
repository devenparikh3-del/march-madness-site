import type { ReactNode } from "react";
import Link from "next/link";

import type { CompetitionSlug } from "@/lib/types";

type CompetitionNavProps = {
  activeSlug: CompetitionSlug;
  rightSlot?: ReactNode;
};

export function CompetitionNav({ activeSlug, rightSlot }: CompetitionNavProps) {
  return (
    <nav className="competition-nav" aria-label="Competition switcher">
      <div className="competition-nav__brand">
        <span className="competition-nav__eyebrow">Sustainability Office Pool</span>
        <Link href="/mens" className="competition-nav__title">
          Sustainability March Madness HQ
        </Link>
      </div>
      <div className="competition-nav__center">
        <div className="competition-nav__toggle">
          <Link
            href="/mens"
            className={`competition-toggle ${activeSlug === "mens" ? "is-active" : ""}`}
          >
            Men's
          </Link>
          <Link
            href="/womens"
            className={`competition-toggle ${activeSlug === "womens" ? "is-active" : ""}`}
          >
            Women's
          </Link>
        </div>
      </div>
      <div className="competition-nav__actions">
        {rightSlot ? rightSlot : <span className="competition-nav__spacer" />}
      </div>
    </nav>
  );
}
