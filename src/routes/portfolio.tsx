import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import {
  Amount,
  Disclaimer,
  EmptyState,
  ProgressBar,
  StatCard,
  StatusPill,
} from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import { formatDate, lenderPayout, termDays, usdc } from "@/lib/morrow/format";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Morrow" },
      {
        name: "description",
        content:
          "Track funded receivable positions, expected returns and repayment progress in USDC.",
      },
      { property: "og:title", content: "Morrow portfolio" },
      { property: "og:description", content: "Positions, yield and repayments in one view." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { state } = useMorrow();

  const rows = useMemo(
    () =>
      state.invoices.flatMap((invoice) =>
        invoice.positions.filter((p) => p.isUser).map((position) => ({ invoice, position })),
      ),
    [state.invoices],
  );

  const principal = rows.reduce((s, r) => s + r.position.principal, 0);
  const expected = rows.reduce((s, r) => s + r.position.expectedReturn, 0);
  const received = rows.reduce((s, r) => s + r.position.received, 0);

  return (
    <AppShell>
      <PageHeader
        title="Portfolio"
        description="Every position, its expected return and how much has already been repaid."
        actions={
          <Link to="/dashboard/market">
            <Button>Deploy more capital</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Principal" value={<Amount value={principal} size="lg" />} tone="primary" />
        <StatCard
          label="Expected return"
          value={<Amount value={expected} size="lg" />}
          tone="success"
        />
        <StatCard label="Received" value={<Amount value={received} size="lg" />} tone="info" />
        <StatCard
          label="Idle USDC"
          value={<Amount value={state.balances.lender} size="lg" />}
          tone="neutral"
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            title="No positions yet"
            description="Fund a receivable from the market to build your portfolio."
            action={
              <Link to="/dashboard/market">
                <Button>Browse market</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {rows.map(({ invoice, position }) => {
                const payout = lenderPayout(position);
                const progress = payout > 0 ? (position.received / payout) * 100 : 0;
                return (
                  <li key={position.id} className="px-5 py-4 hover:bg-surface">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/invoice/$id"
                          params={{ id: invoice.id }}
                          className="num text-[13.5px] font-semibold text-foreground hover:text-primary"
                        >
                          {invoice.ref}
                        </Link>
                        <p className="text-[12px] text-muted-foreground">
                          {invoice.buyerName} · {termDays(invoice)}d · due{" "}
                          {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="num text-[13.5px] font-semibold text-foreground">
                            {usdc(position.principal)}
                          </p>
                          <p className="num text-[11.5px] text-success">
                            +{usdc(position.expectedReturn)} at {position.apr.toFixed(2)}%
                          </p>
                        </div>
                        <StatusPill status={invoice.status} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <ProgressBar
                        value={progress}
                        height={6}
                        tone={progress >= 100 ? "success" : "primary"}
                      />
                      <span className="num shrink-0 text-[11.5px] text-muted-foreground">
                        {usdc(position.received)} / {usdc(payout)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <Disclaimer className="mt-6">
        Returns are illustrative and settle in test USDC on Arc Testnet.
      </Disclaimer>
    </AppShell>
  );
}
