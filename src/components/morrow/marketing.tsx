import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Wordmark } from "./primitives";

export function MarketingNav({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-8 px-5">
        <Link to="/" className="shrink-0">
          <Wordmark />
        </Link>

        {!minimal ? (
          <div className="ml-auto flex items-center gap-2">
            <Link to="/market" className="hidden sm:block">
              <Button variant="outline" size="sm">
                View market
              </Button>
            </Link>
            <Link to="/connect" search={{ next: "/dashboard/business" }}>
              <Button size="sm">Launch app</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-14">
        <div>
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Turn buyer-accepted invoices into immediate USDC through competitive funding and
              programmable settlement on Arc.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-[12px] text-muted-foreground">
            © 2026 Morrow. Arc Testnet prototype · Test USDC only.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Not an investment product. Contract data is read directly from Arc.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
