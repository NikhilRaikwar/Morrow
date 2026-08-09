import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { MarketingShell } from "@/components/morrow/marketing";
import { StatusPill } from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMorrow } from "@/lib/morrow/store";
import { bestApr, formatDate, fundedAmount, isMarketVisible, usdc } from "@/lib/morrow/format";

const SITE_URL = "https://morrow.nikhilraikwar.me";
const MARKET_URL = `${SITE_URL}/market`;
const SOCIAL_IMAGE = `${SITE_URL}/morrow-og.jpg`;

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Receivables market - Morrow" },
      { name: "description", content: "Explore buyer-accepted receivables funding on Arc." },
      { property: "og:title", content: "Morrow receivables market" },
      {
        property: "og:description",
        content: "Read live MorrowMarket listings directly from Arc Testnet.",
      },
      { property: "og:url", content: MARKET_URL },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:alt", content: "Morrow public receivables market" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Morrow receivables market" },
      { name: "twitter:description", content: "Read live buyer-accepted receivables from Arc." },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: MARKET_URL }],
  }),
  component: MarketPage,
});

function short(address: string) {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

function MarketPage() {
  const { state, hydrated, refresh } = useMorrow();
  const [query, setQuery] = useState("");
  const listings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.invoices
      .filter(isMarketVisible)
      .filter((invoice) =>
        normalized
          ? [invoice.ref, invoice.sellerName, invoice.buyerName]
              .join(" ")
              .toLowerCase()
              .includes(normalized)
          : true,
      );
  }, [query, state.invoices]);

  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-[1480px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-3xl">
          <h1 className="font-serif text-[42px] leading-tight tracking-[-0.03em] text-foreground sm:text-[52px]">
            Receivables market
          </h1>
          <p className="mt-2 text-[16px] text-muted-foreground">
            Explore buyer-accepted invoices funding on Arc.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Arc Testnet
            <span aria-hidden>·</span> Live MorrowMarket contract data
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by receivable, seller or buyer address"
                className="h-10 pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh Arc data
            </Button>
          </div>

          {!hydrated ? (
            <div className="px-6 py-20 text-center text-[14px] text-muted-foreground">
              Reading MorrowMarket from Arc…
            </div>
          ) : listings.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <FileSearch className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 text-[17px] font-semibold text-foreground">
                No receivables are open for funding
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-[13.5px] text-muted-foreground">
                New buyer-accepted invoices will appear here from MorrowMarket on Arc.
              </p>
              <Link to="/connect" search={{ next: "lender" }} className="mt-6 inline-block">
                <Button variant="outline">Connect to fund</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead className="bg-surface text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Receivable</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Buyer</th>
                    <th className="px-5 py-3">Face value</th>
                    <th className="px-5 py-3">Advance</th>
                    <th className="px-5 py-3">Best APR</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listings.map((invoice) => (
                    <tr key={invoice.id} className="transition-colors hover:bg-surface/70">
                      <td className="px-5 py-4">
                        <p className="num text-[13.5px] font-semibold">{invoice.ref}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          Due {formatDate(invoice.dueDate)}
                        </p>
                      </td>
                      <td className="num px-5 py-4 text-[13px]">{short(invoice.sellerName)}</td>
                      <td className="num px-5 py-4 text-[13px]">{short(invoice.buyerName)}</td>
                      <td className="num px-5 py-4 text-[13px] font-medium">
                        {usdc(invoice.faceValue)} USDC
                      </td>
                      <td className="num px-5 py-4 text-[13px]">
                        {usdc(invoice.advanceRequested)} USDC
                      </td>
                      <td className="num px-5 py-4 text-[13px] font-semibold text-primary">
                        {bestApr(invoice)?.toFixed(2) ?? "—"}%
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={invoice.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link to="/invoice/$id" params={{ id: invoice.id }}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground">
                {usdc(
                  listings.reduce(
                    (sum, invoice) =>
                      sum + Math.max(0, invoice.advanceRequested - fundedAmount(invoice)),
                    0,
                  ),
                )}{" "}
                USDC currently open across {listings.length} receivable
                {listings.length === 1 ? "" : "s"}.
              </p>
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
