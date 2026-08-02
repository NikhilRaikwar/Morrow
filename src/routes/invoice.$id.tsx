import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FileText, Hash, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/morrow/app-shell";
import { MarketingShell } from "@/components/morrow/marketing";
import {
  Amount,
  Disclaimer,
  KeyValue,
  Pill,
  ProgressBar,
  StatusPill,
  TxLink,
} from "@/components/morrow/primitives";
import { WaterfallBars } from "@/components/morrow/waterfall";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import {
  bestApr,
  clearingApr,
  countdown,
  daysUntil,
  formatDate,
  formatDateTime,
  fundedAmount,
  fundedPct,
  lenderPayout,
  outstanding,
  shortHash,
  termDays,
  usdc,
  waterfall,
} from "@/lib/morrow/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/invoice/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Invoice detail — Morrow" },
      {
        name: "description",
        content:
          "Full receivable record: buyer acceptance, auction pricing, funded positions and the settlement waterfall.",
      },
      { property: "og:title", content: "Invoice detail on Morrow" },
      {
        property: "og:description",
        content: "Every stage of a receivable, from acceptance to settlement.",
      },
      {
        name: "keywords",
        content: "invoice detail, receivable obligation, USDC advance, buyer acceptance",
      },
      { property: "og:url", content: `/invoice/${params.id}` },
      { property: "og:image", content: "/morrow-og.jpg" },
      { name: "twitter:image", content: "/morrow-og.jpg" },
    ],
    links: [{ rel: "canonical", href: `/invoice/${params.id}` }],
  }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { state } = useMorrow();
  const invoice = state.invoices.find((i) => i.id === id || i.ref === id);

  if (!invoice) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <h1 className="text-[20px] font-semibold text-foreground">Invoice not found</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            This receivable was not found in the current Arc event window.
          </p>
          <Link to="/market" className="mt-6 inline-block">
            <Button>Back to market</Button>
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const legs = waterfall(invoice);
  const live = invoice.status === "auction_live";
  const settled = invoice.status === "settled";
  const clearing = clearingApr(invoice);

  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-6">
        <Link
          to="/market"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to market
        </Link>

        <PageHeader
          eyebrow={
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusPill status={invoice.status} />
            </div>
          }
          title={`${invoice.ref} · ${usdc(invoice.faceValue)} USDC`}
          description={`${invoice.sellerName} → ${invoice.buyerName} · ${invoice.description}`}
          actions={
            live ? (
              <Link to="/connect" search={{ next: "lender" }}>
                <Button>Connect to fund</Button>
              </Link>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[16px] font-semibold text-foreground">Receivable</h2>
              <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
                <div className="divide-y divide-border">
                  <KeyValue label="Face value" value={`${usdc(invoice.faceValue)} USDC`} mono />
                  <KeyValue
                    label="Advance requested"
                    value={`${usdc(invoice.advanceRequested)} USDC`}
                    mono
                  />
                  <KeyValue label="Retention" value={`${invoice.retentionPct}%`} mono />
                  <KeyValue label="Cost ceiling" value={`${invoice.maxCostApr}% APR`} mono />
                </div>
                <div className="divide-y divide-border">
                  <KeyValue label="Issued" value={formatDate(invoice.issueDate)} />
                  <KeyValue label="Due" value={formatDate(invoice.dueDate)} />
                  <KeyValue label="Term" value={`${termDays(invoice)} days`} mono />
                  <KeyValue
                    label="Document digest"
                    value={shortHash(invoice.docHash, 12, 8)}
                    mono
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-foreground">Auction</h2>
                {live && invoice.auctionEndsAt ? (
                  <Pill tone="warning" dot>
                    Ends in {countdown(invoice.auctionEndsAt)}
                  </Pill>
                ) : clearing != null ? (
                  <Pill tone="success">Cleared at {clearing.toFixed(2)}% APR</Pill>
                ) : (
                  <Pill tone="neutral">Not started</Pill>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-[12px] text-muted-foreground">
                  <span className="num">
                    {usdc(fundedAmount(invoice))} of {usdc(invoice.advanceRequested)} committed
                  </span>
                  <span className="num">{Math.round(fundedPct(invoice))}%</span>
                </div>
                <ProgressBar value={fundedPct(invoice)} tone={settled ? "success" : "primary"} />
              </div>

              {invoice.bids.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-border bg-surface px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <span>Lender</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Max term</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {[...invoice.bids]
                      .sort((a, b) => a.apr - b.apr)
                      .map((bid) => (
                        <li
                          key={bid.id}
                          className={cn(
                            "grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-[13px]",
                            bid.isUser && "bg-primary-soft",
                          )}
                        >
                          <span className="truncate font-medium text-foreground">
                            {bid.lenderName}
                            {bid.isUser ? (
                              <span className="ml-2 text-[11px] text-primary">You</span>
                            ) : null}
                          </span>
                          <span className="num text-right">{usdc(bid.amount)}</span>
                          <span className="num text-right font-semibold text-success">
                            {bid.apr.toFixed(1)}%
                          </span>
                          <span className="num text-right text-muted-foreground">
                            {bid.maxDurationDays}d
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
                  No bids yet.
                </p>
              )}
            </section>

            {invoice.positions.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h2 className="text-[16px] font-semibold text-foreground">Funded positions</h2>
                <ul className="mt-3 divide-y divide-border">
                  {invoice.positions.map((position) => (
                    <li key={position.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground">
                          {position.lenderName}
                          {position.isUser ? (
                            <span className="ml-2 text-[11px] text-primary">You</span>
                          ) : null}
                        </p>
                        <p className="num text-[12px] text-muted-foreground">
                          {usdc(position.principal)} at {position.apr.toFixed(2)}% APR
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="num text-[13.5px] font-semibold text-foreground">
                          {usdc(lenderPayout(position))}
                        </p>
                        <p className="num text-[11.5px] text-muted-foreground">
                          {usdc(position.received)} received
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[16px] font-semibold text-foreground">Settlement waterfall</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                How the buyer's {usdc(invoice.faceValue)} USDC payment is distributed.
              </p>
              <WaterfallBars className="mt-5" total={invoice.faceValue} legs={legs} />
              <Disclaimer className="mt-5">
                Distribution executes automatically when the buyer pays. No manual reconciliation.
              </Disclaimer>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[15px] font-semibold text-foreground">Payment status</h2>
              <div className="mt-3">
                <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
                  Outstanding
                </p>
                <Amount value={outstanding(invoice)} size="lg" className="mt-1" />
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                  {settled
                    ? `Settled ${invoice.settledAt ? formatDateTime(invoice.settledAt) : ""}`
                    : `${daysUntil(invoice.dueDate)} days until due`}
                </p>
              </div>
              <div className="mt-4 divide-y divide-border border-t border-border">
                <KeyValue label="Paid to date" value={`${usdc(invoice.amountPaid)} USDC`} mono />
                <KeyValue
                  label="Advance released"
                  value={`${usdc(invoice.advanceReleased)} USDC`}
                  mono
                />
                <KeyValue
                  label="Best rate"
                  value={bestApr(invoice) != null ? `${bestApr(invoice)!.toFixed(2)}%` : "—"}
                  mono
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[15px] font-semibold text-foreground">Verification</h2>
              <ul className="mt-3 space-y-3">
                {[{ label: "Receivable document digest", hash: invoice.docHash }].map((doc) => (
                  <li key={doc.label} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{doc.label}</p>
                      <p className="num flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {shortHash(doc.hash, 10, 6)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {invoice.acceptedAt ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-success/20 bg-success-soft p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-[12.5px] text-foreground">
                    Buyer accepted on {formatDateTime(invoice.acceptedAt)}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-[15px] font-semibold text-foreground">Onchain history</h2>
              <ul className="mt-3 space-y-3">
                {state.activity
                  .filter((event) => event.invoiceRef === invoice.ref)
                  .slice(0, 8)
                  .map((event) => (
                    <li key={event.id} className="border-l-2 border-border pl-3">
                      <p className="text-[13px] font-medium text-foreground">{event.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {formatDateTime(event.ts)}
                        {event.amount ? ` · ${usdc(event.amount)} USDC` : ""}
                      </p>
                      <TxLink hash={event.txHash} />
                    </li>
                  ))}
                {state.activity.filter((event) => event.invoiceRef === invoice.ref).length === 0 ? (
                  <li className="text-[12.5px] text-muted-foreground">No events yet.</li>
                ) : null}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </MarketingShell>
  );
}
