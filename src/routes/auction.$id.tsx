import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Gavel, Timer, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import { BidDialog } from "@/components/morrow/bid-panel";
import {
  Amount,
  Disclaimer,
  Pill,
  ProgressBar,
  StatCard,
  StatusPill,
} from "@/components/morrow/primitives";
import { TransactionDialog, useTxRunner } from "@/components/morrow/tx-modal";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import {
  bestApr,
  clearingApr,
  countdown,
  fundedAmount,
  fundedPct,
  relativeTime,
  termDays,
  usdc,
} from "@/lib/morrow/format";
import { cn } from "@/lib/utils";

const SITE_URL = "https://morrow.nikhilraikwar.me";
const SOCIAL_IMAGE = `${SITE_URL}/morrow-og.jpg`;

export const Route = createFileRoute("/auction/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Live funding auction - Morrow" },
      {
        name: "description",
        content:
          "Watch lenders compete in real time to finance a buyer-accepted invoice, then finalize at the best blended rate.",
      },
      { property: "og:title", content: "Live funding auction on Morrow" },
      {
        property: "og:description",
        content: "Reverse auction pricing for receivables, settled in USDC.",
      },
      {
        name: "keywords",
        content: "receivable auction, competitive bidding, USDC funding, clearing APR",
      },
      { property: "og:url", content: `${SITE_URL}/auction/${params.id}` },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:alt", content: "Morrow live funding auction on Arc" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Live funding auction on Morrow" },
      {
        name: "twitter:description",
        content: "Watch lenders compete to fund an accepted receivable.",
      },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/auction/${params.id}` }],
  }),
  component: AuctionRoom,
});

const FINALIZE_STEPS = [
  { label: "Selecting winning bids", detail: "Lowest rates fill first" },
  { label: "Collecting lender USDC", detail: "Locking committed capital" },
  { label: "Releasing advance to seller", detail: "Instant settlement on Arc" },
];

function AuctionRoom() {
  const { id } = Route.useParams();
  const { state, finalizeAuction } = useMorrow();
  const invoice = state.invoices.find((i) => i.id === id || i.ref === id);

  const [bidOpen, setBidOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [released, setReleased] = useState(0);
  const [, setTick] = useState(0);

  const tx = useTxRunner(FINALIZE_STEPS);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedBids = useMemo(
    () => (invoice ? [...invoice.bids].sort((a, b) => a.apr - b.apr) : []),
    [invoice],
  );

  if (!invoice) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-[20px] font-semibold text-foreground">Auction not found</h1>
          <Link to="/dashboard/market" className="mt-6 inline-block">
            <Button>Back to market</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const live = invoice.status === "auction_live";
  const remaining = Math.max(0, invoice.advanceRequested - fundedAmount(invoice));
  const blended = clearingApr(invoice);
  const filled = fundedPct(invoice);

  // Determine which bids would win at the current book.
  let cumulative = 0;
  const winners = new Set<string>();
  for (const bid of sortedBids) {
    if (cumulative >= invoice.advanceRequested) break;
    winners.add(bid.id);
    cumulative += bid.amount;
  }

  const finalize = () => {
    setTxOpen(true);
    void tx.run(async () => {
      const result = await finalizeAuction(invoice.id);
      setTxHash(result.txHash ?? "");
      setReleased(invoice.advanceRequested);
      toast.success("Auction finalized", {
        description: `${usdc(result.released)} USDC released to ${invoice.sellerName}.`,
      });
    });
  };

  return (
    <AppShell>
      <Link
        to="/dashboard/market"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to market
      </Link>

      <PageHeader
        eyebrow={
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusPill status={invoice.status} />
            {live && invoice.auctionEndsAt ? (
              <Pill tone="warning" dot>
                <Timer className="mr-1 inline h-3 w-3" />
                {countdown(invoice.auctionEndsAt)} remaining
              </Pill>
            ) : null}
          </div>
        }
        title={`Funding auction · ${invoice.ref}`}
        description={`${invoice.sellerName} → ${invoice.buyerName} · ${termDays(invoice)}-day term · ceiling ${invoice.maxCostApr}% APR`}
        actions={
          <>
            {live ? (
              <Button className="gap-2" onClick={() => setBidOpen(true)} disabled={remaining <= 0}>
                <Gavel className="h-4 w-4" />
                Place bid
              </Button>
            ) : (
              <Link to="/invoice/$id" params={{ id: invoice.id }}>
                <Button>View invoice</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Advance sought"
          value={<Amount value={invoice.advanceRequested} size="lg" />}
          hint={`${usdc(invoice.faceValue)} face value`}
          tone="info"
        />
        <StatCard
          label="Committed"
          value={<Amount value={fundedAmount(invoice)} size="lg" />}
          hint={`${Math.round(filled)}% of target`}
          tone="primary"
        />
        <StatCard
          label="Best rate"
          value={
            <span className="num text-[30px] font-semibold text-success">
              {bestApr(invoice) != null ? `${bestApr(invoice)!.toFixed(1)}%` : "—"}
            </span>
          }
          hint={blended != null ? `Blended ${blended.toFixed(2)}% APR` : "Awaiting first bid"}
          tone="success"
        />
        <StatCard
          label="Lenders competing"
          value={
            <span className="num text-[30px] font-semibold text-foreground">
              {new Set(invoice.bids.map((b) => b.lenderName)).size}
            </span>
          }
          hint={`${invoice.bids.length} bids in book`}
          icon={<Users className="h-3.5 w-3.5" />}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold text-foreground">Order book</h2>
            <span className="num text-[12px] text-muted-foreground">
              {usdc(remaining)} USDC still needed
            </span>
          </div>
          <ProgressBar
            className="mt-3"
            value={filled}
            tone={filled >= 100 ? "success" : "primary"}
          />

          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.5fr_0.8fr_0.7fr_0.9fr] gap-3 border-b border-border bg-surface px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>Lender</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Placed</span>
            </div>
            {sortedBids.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No bids yet. Be the first to price this receivable.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {sortedBids.map((bid) => (
                  <li
                    key={bid.id}
                    className={cn(
                      "animate-fade-up grid grid-cols-[1.5fr_0.8fr_0.7fr_0.9fr] gap-3 px-4 py-3 text-[13px]",
                      bid.isUser && "bg-primary-soft",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-foreground">{bid.lenderName}</span>
                      {bid.isUser ? <Pill tone="info">You</Pill> : null}
                      {winners.has(bid.id) ? (
                        <Pill tone="success">Filling</Pill>
                      ) : (
                        <Pill tone="neutral">Queued</Pill>
                      )}
                    </span>
                    <span className="num text-right">{usdc(bid.amount)}</span>
                    <span className="num text-right font-semibold text-success">
                      {bid.apr.toFixed(1)}%
                    </span>
                    <span className="num text-right text-[12px] text-muted-foreground">
                      {relativeTime(bid.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Disclaimer className="mt-5">
            Lowest rates fill first. Bids above the seller's ceiling are rejected automatically.
          </Disclaimer>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-[15px] font-semibold text-foreground">Clearing preview</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              What the seller receives if the auction closes now.
            </p>
            <div className="mt-4 space-y-3">
              <Row
                label="Advance released"
                value={`${usdc(Math.min(cumulative, invoice.advanceRequested))} USDC`}
                strong
              />
              <Row
                label="Blended cost"
                value={blended != null ? `${blended.toFixed(2)}% APR` : "—"}
              />
              <Row label="Fill" value={`${Math.round(filled)}%`} />
              <Row label="Term" value={`${termDays(invoice)} days`} />
            </div>

            {live ? (
              <div className="mt-5 space-y-2">
                <Button className="w-full" onClick={finalize} disabled={invoice.bids.length === 0}>
                  Finalize auction
                </Button>
                <p className="text-center text-[11.5px] text-muted-foreground">
                  Sellers can close early once the advance is covered.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-success/20 bg-success-soft p-3 text-[12.5px] text-foreground">
                Auction complete. {usdc(invoice.advanceReleased)} USDC was released to{" "}
                {invoice.sellerName}.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-[15px] font-semibold text-foreground">Why this is priceable</h2>
            <ul className="mt-3 space-y-3 text-[12.5px] text-muted-foreground">
              {[
                `${invoice.buyerName} accepted this obligation onchain.`,
                `Buyer credit rating ${invoice.buyerRating} with an on-time payment record.`,
                "Repayment is enforced by the settlement waterfall, not by collections.",
                "Positions are pro-rata: partial payments distribute proportionally.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <BidDialog invoice={bidOpen ? invoice : null} open={bidOpen} onOpenChange={setBidOpen} />

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        title="Finalizing auction"
        steps={FINALIZE_STEPS}
        current={tx.current}
        phase={tx.phase}
        successTitle="Advance released"
        successBody={
          <p className="text-[13.5px] text-muted-foreground">
            {usdc(released)} USDC was sent to {invoice.sellerName}. Lender positions are now active
            until the buyer pays.
          </p>
        }
        txHash={txHash}
      />
    </AppShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span
        className={cn("num text-[13px] text-foreground", strong && "text-[15px] font-semibold")}
      >
        {value}
      </span>
    </div>
  );
}
