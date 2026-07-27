import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock3, Filter, Layers, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMorrow } from "@/lib/morrow/store";
import {
  bestApr,
  countdown,
  formatDate,
  fundedAmount,
  fundedPct,
  isMarketVisible,
  riskLabel,
  termDays,
  usdc,
  usdcCompact,
} from "@/lib/morrow/format";
import type { Invoice } from "@/lib/morrow/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Receivables market — Morrow" },
      {
        name: "description",
        content:
          "Browse buyer-accepted invoices open for funding. Compare yields, terms and buyer credit quality before you bid.",
      },
      { property: "og:title", content: "Morrow receivables market" },
      {
        property: "og:description",
        content: "Short-duration, buyer-confirmed USDC yield on Arc.",
      },
      {
        name: "keywords",
        content:
          "receivables market, invoice yield, USDC lending, buyer-accepted invoices, short duration credit",
      },
      { property: "og:url", content: "/market" },
      { property: "og:image", content: "/morrow-og.jpg" },
      { name: "twitter:image", content: "/morrow-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "/market" }],
  }),
  component: MarketPage,
});

type SortKey = "yield" | "size" | "ending" | "term";

function MarketPage() {
  const { state } = useMorrow();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("yield");
  const [bidTarget, setBidTarget] = useState<Invoice | null>(null);

  const listings = useMemo(() => {
    const base = state.invoices.filter(isMarketVisible);
    const filtered = base.filter((invoice) => {
      const matchesQuery =
        query.trim().length === 0 ||
        [invoice.ref, invoice.sellerName, invoice.buyerName, invoice.industry]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesRisk = risk === "all" || invoice.riskCategory === risk;
      return matchesQuery && matchesRisk;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "size") return b.advanceRequested - a.advanceRequested;
      if (sort === "term") return termDays(a) - termDays(b);
      if (sort === "ending") {
        return (a.auctionEndsAt ?? "9").localeCompare(b.auctionEndsAt ?? "9");
      }
      return (bestApr(b) ?? b.maxCostApr) - (bestApr(a) ?? a.maxCostApr);
    });
  }, [state.invoices, query, risk, sort]);

  const live = listings.filter((i) => i.status === "auction_live");
  const totalAvailable = live.reduce(
    (sum, i) => sum + Math.max(0, i.advanceRequested - fundedAmount(i)),
    0,
  );
  const avgApr =
    live.length > 0
      ? live.reduce((sum, i) => sum + (bestApr(i) ?? i.maxCostApr), 0) / live.length
      : 0;
  const avgTerm =
    live.length > 0 ? Math.round(live.reduce((sum, i) => sum + termDays(i), 0) / live.length) : 0;

  return (
    <AppShell requireConnection={false}>
      <PageHeader
        title="Receivables market"
        description="Every listing is a buyer-accepted invoice with a confirmed payment obligation."
        actions={
          <Link to="/portfolio">
            <Button variant="outline">My portfolio</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open for funding"
          value={<Amount value={totalAvailable} size="lg" />}
          hint={`${live.length} live auctions`}
          icon={<Layers className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatCard
          label="Average yield"
          value={
            <span className="num text-[30px] font-semibold text-foreground">
              {avgApr.toFixed(1)}%
            </span>
          }
          hint="Best bid APR across live auctions"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone="success"
        />
        <StatCard
          label="Average term"
          value={<span className="num text-[30px] font-semibold text-foreground">{avgTerm}d</span>}
          hint="Issue date to due date"
          icon={<Clock3 className="h-3.5 w-3.5" />}
          tone="info"
        />
        <StatCard
          label="Your deployable USDC"
          value={<Amount value={state.balances.lender} size="lg" />}
          hint="Arc wallet balance"
          icon={<Filter className="h-3.5 w-3.5" />}
          tone="neutral"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by invoice, seller, buyer or industry"
          className="h-9 max-w-[320px] flex-1"
        />
        <Select value={risk} onValueChange={setRisk}>
          <SelectTrigger className="h-9 w-[168px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk bands</SelectItem>
            <SelectItem value="low">Low risk</SelectItem>
            <SelectItem value="low-moderate">Low–moderate</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-[168px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yield">Highest yield</SelectItem>
            <SelectItem value="size">Largest size</SelectItem>
            <SelectItem value="ending">Ending soonest</SelectItem>
            <SelectItem value="term">Shortest term</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title="No matching receivables"
          description="Adjust your filters, or check back when new invoices are accepted."
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((invoice, index) => (
            <ListingCard
              key={invoice.id}
              invoice={invoice}
              index={index}
              onBid={() => setBidTarget(invoice)}
            />
          ))}
        </div>
      )}

      <Disclaimer className="mt-6">
        Mock listings on Arc Testnet. Risk bands and buyer ratings are illustrative.
      </Disclaimer>

      <BidDialog
        invoice={bidTarget}
        open={Boolean(bidTarget)}
        onOpenChange={(open) => (open ? null : setBidTarget(null))}
      />
    </AppShell>
  );
}

function ListingCard({
  invoice,
  index,
  onBid,
}: {
  invoice: Invoice;
  index: number;
  onBid: () => void;
}) {
  const apr = bestApr(invoice) ?? invoice.maxCostApr;
  const remaining = Math.max(0, invoice.advanceRequested - fundedAmount(invoice));
  const live = invoice.status === "auction_live";

  return (
    <article
      className="animate-fade-up flex flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
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
          <p className="truncate text-[12.5px] text-muted-foreground">{invoice.industry}</p>
        </div>
        <StatusPill status={invoice.status} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Advance sought
          </p>
          <Amount value={invoice.advanceRequested} size="md" suffix={null} />
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {live ? "Best bid" : "Cleared"}
          </p>
          <p className="num text-[22px] font-semibold text-success">{apr.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-[11.5px] text-muted-foreground">
          <span className="num">{Math.round(fundedPct(invoice))}% funded</span>
          <span className="num">{usdcCompact(remaining)} left</span>
        </div>
        <ProgressBar value={fundedPct(invoice)} height={6} tone={live ? "primary" : "success"} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-[12.5px]">
        <Meta label="Buyer" value={invoice.buyerName} />
        <Meta label="Rating" value={invoice.buyerRating} mono />
        <Meta label="Term" value={`${termDays(invoice)} days`} mono />
        <Meta label="Due" value={formatDate(invoice.dueDate)} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Pill
          tone={
            invoice.riskCategory === "low"
              ? "success"
              : invoice.riskCategory === "moderate"
                ? "warning"
                : "info"
          }
        >
          {riskLabel(invoice.riskCategory)}
        </Pill>
        {live && invoice.auctionEndsAt ? (
          <Pill tone="neutral" dot>
            Ends in {countdown(invoice.auctionEndsAt)}
          </Pill>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <Button className={cn("flex-1")} disabled={!live || remaining <= 0} onClick={onBid}>
          {live ? (remaining > 0 ? "Place bid" : "Fully funded") : "Auction closed"}
        </Button>
        <Link to="/invoice/$id" params={{ id: invoice.id }}>
          <Button variant="outline">Details</Button>
        </Link>
      </div>
    </article>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-medium text-foreground", mono && "num")}>{value}</dd>
    </div>
  );
}
