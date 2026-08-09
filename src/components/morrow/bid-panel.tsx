import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Amount, Disclaimer, Pill } from "@/components/morrow/primitives";
import { TransactionDialog, useTxRunner } from "@/components/morrow/tx-modal";
import { useMorrow } from "@/lib/morrow/store";
import { bestApr, expectedReturnFor, fundedAmount, termDays, usdc } from "@/lib/morrow/format";
import type { BidSource, Invoice } from "@/lib/morrow/types";
import { cn } from "@/lib/utils";

const BID_STEPS = [
  { label: "Approving USDC", detail: "Allowing MorrowMarket to escrow this bid" },
  { label: "Escrowing bid on Arc", detail: "Amount and APR are written to the auction" },
  { label: "Confirming on Arc", detail: "Bid is live and competing" },
];

const SOURCES: { id: BidSource; label: string; hint: string }[] = [
  { id: "arc", label: "Arc wallet", hint: "Real test USDC escrow" },
];

export function BidDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, placeBid } = useMorrow();
  const [amount, setAmount] = useState("");
  const [apr, setApr] = useState(9);
  const [maxDuration, setMaxDuration] = useState("90");
  const [source, setSource] = useState<BidSource>("arc");
  const [txOpen, setTxOpen] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [submittedBid, setSubmittedBid] = useState<{ amount: number; apr: number } | null>(null);

  const tx = useTxRunner(BID_STEPS);

  const remaining = invoice
    ? Math.max(0, Math.round(invoice.advanceRequested - fundedAmount(invoice)))
    : 0;
  const days = invoice ? termDays(invoice) : 30;
  const value = Math.min(Number(amount) || 0, remaining);
  const expected = expectedReturnFor(value, apr, days);
  const best = invoice ? bestApr(invoice) : null;
  const overCeiling = invoice ? apr > invoice.maxCostApr : false;
  const insufficient = value > state.balances.lender && source === "arc";

  const capacity = useMemo(
    () =>
      source === "unified"
        ? state.unified.base + state.unified.ethereum + state.unified.arc
        : state.balances.lender,
    [source, state.balances.lender, state.unified],
  );

  const submit = () => {
    if (!invoice || value <= 0 || overCeiling) return;
    setSubmittedBid({ amount: value, apr });
    onOpenChange(false);
    setTxOpen(true);
    void tx.run(async () => {
      const result = await placeBid({
        invoiceId: invoice.id,
        amount: value,
        apr,
        maxDurationDays: Number(maxDuration),
        source,
      });
      setTxHash(result.txHash ?? "");
      toast.success(`Bid placed on ${invoice.ref}`, {
        description: `${usdc(value)} USDC at ${apr.toFixed(1)}% APR`,
      });
    });
  };

  return (
    <>
      <Dialog
        open={open && Boolean(invoice)}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (next && invoice) {
            setAmount(String(Math.min(remaining, 50_000)));
            setApr(best != null ? Math.max(4, Number((best - 0.25).toFixed(2))) : 9);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          {invoice ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[17px]">Bid on {invoice.ref}</DialogTitle>
                <DialogDescription>
                  {invoice.sellerName} → {invoice.buyerName} · {days}-day term
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="bid-amount">Amount (USDC)</Label>
                    <span className="num text-[11.5px] text-muted-foreground">
                      {usdc(remaining)} remaining
                    </span>
                  </div>
                  <Input
                    id="bid-amount"
                    className="num"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {[0.25, 0.5, 1].map((fraction) => (
                      <Button
                        key={fraction}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(String(Math.round(remaining * fraction)))}
                      >
                        {fraction === 1 ? "Fill remaining" : `${fraction * 100}%`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <Label>Your rate</Label>
                    <span
                      className={cn(
                        "num text-[13px] font-semibold",
                        overCeiling ? "text-danger" : "text-foreground",
                      )}
                    >
                      {apr.toFixed(1)}% APR
                    </span>
                  </div>
                  <Slider
                    className="mt-4"
                    value={[apr]}
                    min={3}
                    max={20}
                    step={0.1}
                    onValueChange={([v]) => setApr(v)}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span>
                      Seller ceiling{" "}
                      <span className="num font-medium text-foreground">{invoice.maxCostApr}%</span>
                    </span>
                    {best != null ? (
                      <Pill tone="info">Best bid {best.toFixed(1)}%</Pill>
                    ) : (
                      <Pill tone="neutral">No bids yet</Pill>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="max-duration">Max duration</Label>
                    <Select value={maxDuration} onValueChange={setMaxDuration}>
                      <SelectTrigger id="max-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["30", "60", "90", "120"].map((d) => (
                          <SelectItem key={d} value={d}>
                            {d} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Funding source</Label>
                    <Select value={source} onValueChange={(v) => setSource(v as BidSource)}>
                      <SelectTrigger id="source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label} · {s.hint}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] text-muted-foreground">Expected return</span>
                    <Amount value={expected} size="sm" className="text-success" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[12.5px] text-muted-foreground">Repaid at maturity</span>
                    <span className="num text-[13px] font-semibold text-foreground">
                      {usdc(value + expected)} USDC
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[12.5px] text-muted-foreground">Available capacity</span>
                    <span className="num text-[13px] text-foreground">{usdc(capacity)} USDC</span>
                  </div>
                </div>

                {overCeiling ? (
                  <p className="text-[12.5px] font-medium text-danger">
                    Your rate exceeds the seller's ceiling of {invoice.maxCostApr}% APR.
                  </p>
                ) : null}
                {insufficient ? (
                  <p className="text-[12.5px] font-medium text-warning">
                    Amount exceeds your Arc balance — switch to your unified balance to cover it.
                  </p>
                ) : null}

                <Button className="w-full" disabled={value <= 0 || overCeiling} onClick={submit}>
                  Place bid for {usdc(value)} USDC
                </Button>
                <Disclaimer>
                  Real Arc auction. Lowest APR bids fill first until the requested advance is
                  covered; unused escrow is refundable after finalization.
                </Disclaimer>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        title="Placing bid"
        steps={BID_STEPS}
        current={tx.current}
        phase={tx.phase}
        successTitle="Bid placed"
        successBody={
          <p className="text-[13.5px] text-muted-foreground">
            Your bid of {usdc(submittedBid?.amount ?? 0)} USDC at{" "}
            {(submittedBid?.apr ?? apr).toFixed(1)}% APR is competing in the auction.
          </p>
        }
        txHash={txHash}
      />
    </>
  );
}
