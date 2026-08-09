import { Link, createFileRoute } from "@tanstack/react-router";
import { Coins, Layers, PiggyBank, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import { BidDialog } from "@/components/morrow/bid-panel";
import {
  Amount,
  Disclaimer,
  EmptyState,
  Pill,
  ProgressBar,
  StatCard,
  StatusPill,
} from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import {
  bestApr,
  countdown,
  fundedAmount,
  fundedPct,
  lenderPayout,
  riskLabel,
  termDays,
  usdc,
  usdcCompact,
} from "@/lib/morrow/format";
import type { Invoice } from "@/lib/morrow/types";

export const Route = createFileRoute("/dashboard/lender")({
  head: () => ({
    meta: [
      { title: "Lender dashboard — Morrow" },
      {
        name: "description",
        content:
          "Deploy USDC into short-duration, buyer-accepted receivables and track yield, positions and repayments.",
      },
      { property: "og:title", content: "Morrow lender dashboard" },
      {
        property: "og:description",
        content: "Real-world yield from confirmed invoice obligations on Arc.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LenderDashboard,
});

function LenderDashboard() {
  const { state } = useMorrow();
  const [bidTarget, setBidTarget] = useState<Invoice | null>(null);

  const positions = useMemo(
    () =>
      state.invoices.flatMap((invoice) =>
        invoice.positions.filter((p) => p.isUser).map((p) => ({ invoice, position: p })),
      ),
    [state.invoices],
  );

  const deployed = positions
    .filter((p) => p.position.status !== "settled")
    .reduce((sum, p) => sum + p.position.principal, 0);
  const expected = positions
    .filter((p) => p.position.status !== "settled")
    .reduce((sum, p) => sum + p.position.expectedReturn, 0);
  const earned = positions.reduce(
    (sum, p) => sum + Math.max(0, p.position.received - p.position.principal),
    0,
  );
  const weightedApr =
    deployed > 0
      ? positions
          .filter((p) => p.position.status !== "settled")
          .reduce((sum, p) => sum + p.position.apr * p.position.principal, 0) / deployed
      : 0;

  const openAuctions = state.invoices.filter((i) => i.status === "auction_live");
  const myBids = state.invoices.flatMap((invoice) =>
    invoice.bids.filter((b) => b.isUser).map((bid) => ({ invoice, bid })),
  );

  const chartData = [
    { month: "Current", value: Math.round(state.balances.lender + deployed + expected) },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">Lender workspace</p>
        }
        title="Short-duration yield from confirmed invoices."
        description="Every position is backed by a buyer-accepted payment obligation."
        actions={
          <Link to="/dashboard/market">
            <Button>Browse market</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Capital deployed"
          value={<Amount value={deployed} size="lg" />}
          hint={`${positions.filter((p) => p.position.status !== "settled").length} active positions`}
          icon={<Layers className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatCard
          label="Idle USDC"
          value={<Amount value={state.balances.lender} size="lg" />}
          hint="Ready to deploy"
          icon={<PiggyBank className="h-3.5 w-3.5" />}
          tone="neutral"
        />
        <StatCard
          label="Weighted yield"
          value={
            <span className="num text-[30px] font-semibold text-success">
              {weightedApr.toFixed(1)}%
            </span>
          }
          hint="Blended APR across positions"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone="success"
        />
        <StatCard
          label="Interest earned"
          value={<Amount value={earned} size="lg" />}
          hint={`${usdc(expected)} expected outstanding`}
          icon={<Coins className="h-3.5 w-3.5" />}
          tone="info"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Portfolio value</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Principal plus accrued return, in USDC
          </p>
          <div className="mt-5 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                    boxShadow: "var(--shadow-raised)",
                  }}
                  formatter={(value: number) => [`${usdcCompact(value)} USDC`, "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#pv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">My live bids</h2>
          {myBids.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
              No open bids. Head to the market to price a receivable.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {myBids.map(({ invoice, bid }) => (
                <li key={bid.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/auction/$id"
                      params={{ id: invoice.id }}
                      className="num text-[13px] font-semibold text-foreground hover:text-primary"
                    >
                      {invoice.ref}
                    </Link>
                    <p className="num text-[11.5px] text-muted-foreground">
                      {usdc(bid.amount)} at {bid.apr.toFixed(1)}%
                    </p>
                  </div>
                  <StatusPill status={invoice.status} />
                </li>
              ))}
            </ul>
          )}
          <Disclaimer className="mt-4">
            Bids lock USDC until the auction clears or you are outbid.
          </Disclaimer>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-foreground">Opportunities</h2>
          <Link
            to="/dashboard/market"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {openAuctions.length === 0 ? (
          <EmptyState
            title="No live auctions"
            description="New buyer-accepted invoices open for funding throughout the day."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {openAuctions.slice(0, 6).map((invoice) => {
              const remaining = Math.max(0, invoice.advanceRequested - fundedAmount(invoice));
              return (
                <article
                  key={invoice.id}
                  className="animate-fade-up rounded-xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/invoice/$id"
                        params={{ id: invoice.id }}
                        className="num text-[13.5px] font-semibold text-foreground hover:text-primary"
                      >
                        {invoice.ref}
                      </Link>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {invoice.buyerName} · {riskLabel(invoice.riskCategory)}
                      </p>
                    </div>
                    <p className="num text-[20px] font-semibold text-success">
                      {(bestApr(invoice) ?? invoice.maxCostApr).toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11.5px] text-muted-foreground">
                      <span className="num">{usdc(remaining)} available</span>
                      <span className="num">{termDays(invoice)}d term</span>
                    </div>
                    <ProgressBar value={fundedPct(invoice)} height={6} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {invoice.auctionEndsAt ? (
                      <Pill tone="neutral" dot>
                        {countdown(invoice.auctionEndsAt)} left
                      </Pill>
                    ) : (
                      <span />
                    )}
                    <Button size="sm" onClick={() => setBidTarget(invoice)}>
                      Place bid
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-[18px] font-semibold text-foreground">My positions</h2>
        {positions.length === 0 ? (
          <EmptyState
            title="No positions yet"
            description="Fund your first receivable to start earning."
            action={
              <Link to="/dashboard/market">
                <Button>Browse market</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {positions.map(({ invoice, position }) => (
                <li
                  key={position.id}
                  className="grid gap-3 px-5 py-4 hover:bg-surface lg:grid-cols-[1.2fr_0.9fr_0.7fr_1fr_auto] lg:items-center lg:gap-4"
                >
                  <div>
                    <Link
                      to="/invoice/$id"
                      params={{ id: invoice.id }}
                      className="num text-[13.5px] font-semibold text-foreground hover:text-primary"
                    >
                      {invoice.ref}
                    </Link>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {invoice.buyerName}
                    </p>
                  </div>
                  <p className="num text-[13.5px] font-semibold text-foreground">
                    {usdc(position.principal)}
                  </p>
                  <p className="num text-[13px] text-success">{position.apr.toFixed(2)}%</p>
                  <div>
                    <StatusPill status={invoice.status} />
                    <p className="num mt-1 text-[11.5px] text-muted-foreground">
                      {usdc(position.received)} of {usdc(lenderPayout(position))} received
                    </p>
                  </div>
                  <div className="flex lg:justify-end">
                    <Link to="/portfolio">
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <BidDialog
        invoice={bidTarget}
        open={Boolean(bidTarget)}
        onOpenChange={(open) => (open ? null : setBidTarget(null))}
      />
    </AppShell>
  );
}
