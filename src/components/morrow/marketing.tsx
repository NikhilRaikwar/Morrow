import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "./primitives";

const NAV = [
  { label: "How it works", to: "/how-it-works", hash: undefined },
  { label: "Market", to: "/market", hash: undefined },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-8 px-5">
        <Link to="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              className="text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/market" className="hidden sm:block">
            <Button variant="outline" size="sm">
              View market
            </Button>
          </Link>
          <Link to="/connect" search={{ next: "app" }}>
            <Button size="sm">Launch app</Button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="px-4 pt-4">
                <Wordmark />
              </SheetTitle>
              <nav className="mt-6 flex flex-col gap-1 px-3">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    hash={item.hash}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" as const },
      { label: "Receivables market", to: "/market" as const },
      { label: "Launch app", to: "/connect" as const },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Turn buyer-accepted invoices into immediate USDC through competitive funding and
              programmable settlement on Arc.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <p className="text-[12px] font-semibold tracking-wide text-foreground uppercase">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      search={link.to === "/connect" ? { next: "app" } : undefined}
                      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-[12px] text-muted-foreground">
            © 2026 Morrow. Arc Testnet prototype · Mock business and risk data.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Not an investment product. Risk assessment is illustrative.
          </p>
        </div>
      </div>
    </footer>
  );
}
