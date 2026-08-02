import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import { Disclaimer, EmptyState, Pill, TxLink } from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import { formatDateTime, usdc } from "@/lib/morrow/format";
import type { ActivityKind } from "@/lib/morrow/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Morrow" },
      {
        name: "description",
        content:
          "A chronological onchain log of invoice registrations, bids, advances and settlements.",
      },
      { property: "og:title", content: "Morrow activity log" },
      { property: "og:description", content: "Every action on the receivables market, in order." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ActivityPage,
});

const FILTERS: { id: ActivityKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "invoice", label: "Invoices" },
  { id: "auction", label: "Auctions" },
  { id: "funding", label: "Funding" },
  { id: "payment", label: "Payments" },
  { id: "settlement", label: "Settlements" },
];

function ActivityPage() {
  const { state } = useMorrow();
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  const events =
    filter === "all" ? state.activity : state.activity.filter((e) => e.kind === filter);

  return (
    <AppShell>
      <PageHeader
        title="Activity"
        description="Every state change, recorded with an Arc transaction."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.id}
            variant={filter === option.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No onchain activity"
          description="Create or interact with a receivable to see Arc events here."
        />
      ) : (
        <ol className="relative space-y-1 border-l border-border pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative py-3">
              <span
                className={cn(
                  "absolute top-5 -left-[25px] h-2.5 w-2.5 rounded-full border-2 border-background",
                  event.kind === "settlement"
                    ? "bg-success"
                    : event.kind === "payment"
                      ? "bg-primary"
                      : event.kind === "auction"
                        ? "bg-warning"
                        : "bg-muted-foreground",
                )}
              />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground">{event.title}</p>
                  <p className="num text-[12px] text-muted-foreground">
                    {formatDateTime(event.ts)} · {event.invoiceRef} · {event.wallet}
                  </p>
                  <TxLink hash={event.txHash} />
                </div>
                <div className="flex items-center gap-2">
                  {event.amount ? (
                    <span className="num text-[13px] font-semibold text-foreground">
                      {usdc(event.amount)} USDC
                    </span>
                  ) : null}
                  <Pill tone={event.status === "confirmed" ? "success" : "warning"} dot>
                    {event.status}
                  </Pill>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Disclaimer className="mt-6">
        Activity is decoded from MorrowMarket events on Arc Testnet. Arc RPC remains authoritative.
      </Disclaimer>
    </AppShell>
  );
}
