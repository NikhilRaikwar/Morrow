import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Hash,
  Receipt,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import {
  Amount,
  Disclaimer,
  EmptyState,
  KeyValue,
  Pill,
  StatCard,
  StatusPill,
} from "@/components/morrow/primitives";
import { TransactionDialog, useTxRunner } from "@/components/morrow/tx-modal";
import { WaterfallBars } from "@/components/morrow/waterfall";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMorrow } from "@/lib/morrow/store";
import {
  daysUntil,
  formatDate,
  outstanding,
  shortHash,
  usdc,
  waterfall,
} from "@/lib/morrow/format";
import type { Invoice } from "@/lib/morrow/types";

export const Route = createFileRoute("/dashboard/buyer")({
  head: () => ({
    meta: [
      { title: "Buyer dashboard — Morrow" },
      {
        name: "description",
        content:
          "Confirm invoice obligations from your suppliers and pay in USDC on the original due date.",
      },
      { property: "og:title", content: "Morrow buyer dashboard" },
      {
        property: "og:description",
        content: "One acceptance, one payment, automatic distribution to lenders.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BuyerDashboard,
});

const ACCEPT_STEPS = [
  { label: "Verifying invoice hash", detail: "Matching against your PO record" },
  { label: "Signing acceptance", detail: "Confirming payment obligation" },
  { label: "Publishing to Arc", detail: "Invoice becomes financeable" },
];

const PAY_STEPS = [
  { label: "Transferring USDC", detail: "From your Arc wallet" },
  { label: "Executing settlement waterfall", detail: "Protocol fee, lenders, supplier" },
  { label: "Confirming distribution", detail: "Recording receipts" },
];

function BuyerDashboard() {
  const { state, acceptInvoice, rejectInvoice, payInvoice } = useMorrow();

  const pending = useMemo(
    () => state.invoices.filter((i) => i.status === "awaiting_buyer"),
    [state.invoices],
  );
  const obligations = useMemo(
    () =>
      state.invoices.filter((i) =>
        ["buyer_accepted", "auction_live", "funded", "partially_repaid", "overdue"].includes(
          i.status,
        ),
      ),
    [state.invoices],
  );
  const paid = useMemo(
    () => state.invoices.filter((i) => i.status === "settled"),
    [state.invoices],
  );

  const totalObligations = obligations.reduce((sum, i) => sum + outstanding(i), 0);
  const dueSoon = obligations.filter((i) => daysUntil(i.dueDate) <= 30);

  const [target, setTarget] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<"accept" | "pay">("accept");
  const [payAmount, setPayAmount] = useState("");
  const [txOpen, setTxOpen] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [settledFlag, setSettledFlag] = useState(false);

  const acceptTx = useTxRunner(ACCEPT_STEPS);
  const payTx = useTxRunner(PAY_STEPS);

  const openAccept = (invoice: Invoice) => {
    setTarget(invoice);
    setMode("accept");
  };
  const openPay = (invoice: Invoice) => {
    setTarget(invoice);
    setMode("pay");
    setPayAmount(String(Math.round(outstanding(invoice))));
  };

  const confirmAccept = () => {
    if (!target) return;
    const invoice = target;
    setTarget(null);
    setTxOpen(true);
    acceptTx.run(() => {
      const hash = acceptInvoice(invoice.id);
      setTxHash(hash);
      toast.success(`${invoice.ref} accepted`, {
        description: "The supplier can now open a funding auction.",
      });
    });
  };

  const confirmPay = () => {
    if (!target) return;
    const invoice = target;
    const amount = Math.min(Number(payAmount) || 0, outstanding(invoice));
    if (amount <= 0) return;
    setTarget(null);
    setTxOpen(true);
    payTx.run(() => {
      const result = payInvoice(invoice.id, amount);
      setTxHash(result.txHash);
      setSettledFlag(result.settled);
      toast.success(`${usdc(amount)} USDC paid`, {
        description: result.settled
          ? `${invoice.ref} fully settled and distributed.`
          : `${invoice.ref} partially repaid.`,
      });
    });
  };

  const reject = (invoice: Invoice) => {
    rejectInvoice(invoice.id);
    toast(`${invoice.ref} disputed`, { description: "The supplier has been notified." });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">
            Northwind Retail Group · Accounts payable
          </p>
        }
        title="Confirm what you owe. Pay once, on time."
        description="Accepting an invoice does not change your terms — you still pay on the original due date."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting your acceptance"
          value={
            <span className="num text-[30px] font-semibold text-foreground">{pending.length}</span>
          }
          hint="Supplier invoices to review"
          icon={<FileCheck2 className="h-3.5 w-3.5" />}
          tone="warning"
        />
        <StatCard
          label="Total obligations"
          value={<Amount value={totalObligations} size="lg" />}
          hint={`${obligations.length} confirmed invoices`}
          icon={<Receipt className="h-3.5 w-3.5" />}
          tone="info"
        />
        <StatCard
          label="Due within 30 days"
          value={<Amount value={dueSoon.reduce((s, i) => s + outstanding(i), 0)} size="lg" />}
          hint={`${dueSoon.length} invoices`}
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatCard
          label="Paid to date"
          value={<Amount value={paid.reduce((s, i) => s + i.amountPaid, 0)} size="lg" />}
          hint={`${paid.length} settled`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="success"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-[18px] font-semibold text-foreground">Pending acceptance</h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={<FileWarning className="h-6 w-6" />}
            title="Nothing to review"
            description="New supplier invoices will appear here for confirmation."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((invoice) => (
              <article
                key={invoice.id}
                className="animate-fade-up rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to="/invoice/$id"
                      params={{ id: invoice.id }}
                      className="num text-[14px] font-semibold text-foreground hover:text-primary"
                    >
                      {invoice.ref}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {invoice.sellerName} · {invoice.description}
                    </p>
                  </div>
                  <StatusPill status={invoice.status} />
                </div>

                <div className="mt-4 divide-y divide-border border-y border-border">
                  <KeyValue label="Amount" value={`${usdc(invoice.faceValue)} USDC`} mono />
                  <KeyValue label="Due date" value={formatDate(invoice.dueDate)} />
                  <KeyValue label="Purchase order" value={invoice.poRef} mono />
                  <KeyValue
                    label="Document hash"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {shortHash(invoice.docHash, 8, 6)}
                      </span>
                    }
                    mono
                  />
                </div>

                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  Accepting confirms this is a valid payable. Your due date and amount stay exactly
                  the same.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="gap-2" onClick={() => openAccept(invoice)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept invoice
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => reject(invoice)}>
                    <X className="h-4 w-4" />
                    Dispute
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-[18px] font-semibold text-foreground">Payment obligations</h2>
        {obligations.length === 0 ? (
          <EmptyState title="No open obligations" description="Accepted invoices will show here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {obligations.map((invoice) => {
                const days = daysUntil(invoice.dueDate);
                return (
                  <li
                    key={invoice.id}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1.2fr_1fr_0.9fr_1fr_auto] lg:items-center lg:gap-4"
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
                        {invoice.sellerName}
                      </p>
                    </div>
                    <p className="num text-[13.5px] font-semibold text-foreground">
                      {usdc(outstanding(invoice))}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusPill status={invoice.status} />
                      {days <= 7 ? (
                        <Pill tone={days < 0 ? "danger" : "warning"}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : `Due in ${days}d`}
                        </Pill>
                      ) : null}
                    </div>
                    <div className="flex lg:justify-end">
                      <Button size="sm" onClick={() => openPay(invoice)}>
                        Pay invoice
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Disclaimer className="mt-4">
          Your payment is distributed automatically by the Arc settlement waterfall. You never
          manage lender relationships.
        </Disclaimer>
      </section>

      <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? null : setTarget(null))}>
        <DialogContent className="sm:max-w-[480px]">
          {target ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[17px]">
                  {mode === "accept" ? `Accept ${target.ref}` : `Pay ${target.ref}`}
                </DialogTitle>
                <DialogDescription>
                  {mode === "accept"
                    ? "You are confirming a payment obligation to " + target.sellerName + "."
                    : "Funds are split automatically between the protocol, lenders and your supplier."}
                </DialogDescription>
              </DialogHeader>

              {mode === "accept" ? (
                <div className="space-y-4">
                  <div className="divide-y divide-border rounded-lg border border-border bg-surface px-4">
                    <KeyValue label="Amount" value={`${usdc(target.faceValue)} USDC`} mono />
                    <KeyValue label="Due date" value={formatDate(target.dueDate)} />
                    <KeyValue label="Terms" value={`Net ${daysUntil(target.dueDate)} days`} />
                  </div>
                  <Button className="w-full" onClick={confirmAccept}>
                    Sign acceptance
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment amount (USDC)</Label>
                    <Input
                      id="amount"
                      className="num"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPayAmount(String(Math.round(outstanding(target))))}
                      >
                        Pay in full
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPayAmount(String(Math.round(outstanding(target) / 2)))}
                      >
                        Pay 50%
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="mb-3 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
                      Settlement waterfall
                    </p>
                    <WaterfallBars
                      total={target.faceValue}
                      legs={waterfall(target)}
                      animate={false}
                    />
                  </div>

                  <Button className="w-full" onClick={confirmPay}>
                    Pay {usdc(Number(payAmount) || 0)} USDC
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        title={mode === "accept" ? "Accepting invoice" : "Processing payment"}
        steps={mode === "accept" ? ACCEPT_STEPS : PAY_STEPS}
        current={mode === "accept" ? acceptTx.current : payTx.current}
        phase={mode === "accept" ? acceptTx.phase : payTx.phase}
        successTitle={
          mode === "accept"
            ? "Invoice accepted"
            : settledFlag
              ? "Invoice settled"
              : "Payment received"
        }
        successBody={
          <p className="text-[13.5px] text-muted-foreground">
            {mode === "accept"
              ? "The supplier can now open a funding auction against this receivable."
              : settledFlag
                ? "Lenders were repaid and the retention was released to your supplier."
                : "Your partial payment was distributed pro-rata to lenders."}
          </p>
        }
        txHash={txHash}
      />
    </AppShell>
  );
}
