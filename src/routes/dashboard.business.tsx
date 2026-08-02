import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Banknote, Clock3, Copy, Plus, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
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
import { formatDate, fundedPct, outstanding, usdc, usdcCompact } from "@/lib/morrow/format";
import type { Invoice, InvoiceStatus } from "@/lib/morrow/types";

export const Route = createFileRoute("/dashboard/business")({
  head: () => ({
    meta: [
      { title: "Business dashboard — Morrow" },
      {
        name: "description",
        content:
          "Track outstanding receivables, open funding auctions and monitor settlement of buyer-accepted invoices.",
      },
      { property: "og:title", content: "Morrow business dashboard" },
      {
        property: "og:description",
        content: "Turn accepted receivables into working capital on Arc.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessDashboard,
});

const PIPELINE: { status: InvoiceStatus; label: string }[] = [
  { status: "awaiting_buyer", label: "Waiting for buyer" },
  { status: "buyer_accepted", label: "Ready for funding" },
  { status: "auction_live", label: "Auction live" },
  { status: "funded", label: "Funded" },
  { status: "settled", label: "Settled" },
];

function BusinessDashboard() {
  const { state, openAuction } = useMorrow();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");

  const mine = useMemo(() => state.invoices.filter((i) => i.ownedByUserBusiness), [state.invoices]);

  const outstandingTotal = mine
    .filter((i) => i.status !== "settled" && i.status !== "rejected")
    .reduce((sum, i) => sum + outstanding(i), 0);

  const activeFinancing = mine
    .filter(
      (i) => i.status === "funded" || i.status === "partially_repaid" || i.status === "overdue",
    )
    .reduce((sum, i) => sum + i.advanceReleased, 0);

  const financedThisMonth = mine.reduce((sum, i) => sum + i.advanceReleased, 0);

  const chartData = [{ month: "Current", volume: Math.round(financedThisMonth) }];

  const counts = PIPELINE.map((bucket) => ({
    ...bucket,
    count: mine.filter((i) =>
      bucket.status === "funded"
        ? i.status === "funded" || i.status === "partially_repaid"
        : i.status === bucket.status,
    ).length,
  }));

  const filtered = filter === "all" ? mine : mine.filter((i) => i.status === filter);

  const copyLink = (invoice: Invoice) => {
    const link = `${window.location.origin}/invoice/${invoice.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link);
    }
    toast.success("Acceptance link copied", { description: link });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">Good morning, Alex</p>
        }
        title="Turn accepted receivables into working capital."
        description="Aster Studio · Arc Testnet"
        actions={
          <Link to="/create-invoice">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create invoice
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding receivables"
          value={<Amount value={outstandingTotal} size="lg" />}
          hint={`${mine.filter((i) => i.status !== "settled").length} open invoices`}
          icon={<Banknote className="h-3.5 w-3.5" />}
          tone="info"
        />
        <StatCard
          label="Available working capital"
          value={<Amount value={state.balances.business} size="lg" />}
          hint="Arc wallet balance"
          icon={<Wallet className="h-3.5 w-3.5" />}
          tone="success"
        />
        <StatCard
          label="Active financing"
          value={<Amount value={activeFinancing} size="lg" />}
          hint="Advances outstanding to lenders"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatCard
          label="Average funding time"
          value={<span className="num text-[30px] font-semibold text-foreground">4m 12s</span>}
          hint="Auction open to advance released"
          icon={<Clock3 className="h-3.5 w-3.5" />}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">Cash unlocked</h2>
              <p className="text-[12.5px] text-muted-foreground">Monthly financed volume in USDC</p>
            </div>
            <Pill tone="success">+18% vs last month</Pill>
          </div>
          <div className="mt-5 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
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
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                    boxShadow: "var(--shadow-raised)",
                  }}
                  formatter={(value: number) => [`${usdcCompact(value)} USDC`, "Financed"]}
                />
                <Bar
                  dataKey="volume"
                  fill="var(--color-primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Invoice status</h2>
          <p className="text-[12.5px] text-muted-foreground">Where each receivable sits today</p>
          <ul className="mt-5 space-y-1">
            {counts.map((bucket) => (
              <li key={bucket.status}>
                <button
                  type="button"
                  onClick={() => setFilter(filter === bucket.status ? "all" : bucket.status)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                    filter === bucket.status ? "bg-primary-soft" : "hover:bg-muted"
                  }`}
                >
                  <span className="text-[13.5px] font-medium text-foreground">{bucket.label}</span>
                  <span className="num text-[13px] font-semibold text-muted-foreground">
                    {bucket.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Disclaimer className="mt-4">
            Results are filtered from the latest MorrowMarket state on Arc Testnet.
          </Disclaimer>
        </div>
      </div>

      <section id="invoices" className="mt-8 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-foreground">My invoices</h2>
          {filter !== "all" ? (
            <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
              Clear filter
            </Button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No invoices in this state"
            description="Create an invoice or clear the filter to see the full list."
            action={
              <Link to="/create-invoice">
                <Button>Create invoice</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="hidden grid-cols-[1.2fr_1fr_0.9fr_0.9fr_1fr_auto] gap-4 border-b border-border px-5 py-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase lg:grid">
              <span>Invoice</span>
              <span>Buyer</span>
              <span className="text-right">Face value</span>
              <span>Due</span>
              <span>Status</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((invoice) => (
                <li
                  key={invoice.id}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_1fr_auto] lg:items-center lg:gap-4"
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
                      {invoice.description}
                    </p>
                  </div>
                  <p className="text-[13px] text-foreground">{invoice.buyerName}</p>
                  <p className="num text-[13.5px] font-semibold text-foreground lg:text-right">
                    {usdc(invoice.faceValue)}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground">
                    {formatDate(invoice.dueDate)}
                  </p>
                  <div className="space-y-1.5">
                    <StatusPill status={invoice.status} />
                    {invoice.status === "auction_live" ? (
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={fundedPct(invoice)}
                          height={5}
                          className="max-w-[110px]"
                        />
                        <span className="num text-[11px] text-muted-foreground">
                          {Math.round(fundedPct(invoice))}%
                        </span>
                      </div>
                    ) : null}
                    {invoice.status === "funded" ? (
                      <p className="num text-[11px] text-muted-foreground">
                        Advance received {usdc(invoice.advanceReleased)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-start lg:justify-end">
                    <InvoiceAction
                      invoice={invoice}
                      onOpenAuction={() => {
                        void openAuction(invoice.id)
                          .then(() => {
                            toast.success(`Funding auction opened for ${invoice.ref}`, {
                              description: "Confirmed through Circle and Arc.",
                            });
                            navigate({ to: "/auction/$id", params: { id: invoice.id } });
                          })
                          .catch((error) =>
                            toast.error(
                              error instanceof Error ? error.message : "Unable to open auction.",
                            ),
                          );
                      }}
                      onCopy={() => copyLink(invoice)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function InvoiceAction({
  invoice,
  onOpenAuction,
  onCopy,
}: {
  invoice: Invoice;
  onOpenAuction: () => void;
  onCopy: () => void;
}) {
  if (invoice.status === "awaiting_buyer") {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onCopy}>
        <Copy className="h-3.5 w-3.5" />
        Copy acceptance link
      </Button>
    );
  }
  if (invoice.status === "buyer_accepted") {
    return (
      <Button size="sm" onClick={onOpenAuction}>
        Open auction
      </Button>
    );
  }
  if (invoice.status === "auction_live") {
    return (
      <Link to="/auction/$id" params={{ id: invoice.id }}>
        <Button variant="outline" size="sm" className="gap-1.5">
          View auction
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    );
  }
  if (invoice.status === "settled") {
    return (
      <Link to="/invoice/$id" params={{ id: invoice.id }}>
        <Button variant="outline" size="sm">
          View receipt
        </Button>
      </Link>
    );
  }
  return (
    <Link to="/invoice/$id" params={{ id: invoice.id }}>
      <Button variant="outline" size="sm">
        Track payment
      </Button>
    </Link>
  );
}
