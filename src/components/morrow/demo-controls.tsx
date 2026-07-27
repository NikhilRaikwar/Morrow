import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FilePlus2,
  Gavel,
  RotateCcw,
  Timer,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useMorrow } from "@/lib/morrow/store";
import { fundedAmount, outstanding, usdc } from "@/lib/morrow/format";
import { Disclaimer } from "./primitives";

export function DemoControls({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    state,
    resetDemo,
    seedNewInvoice,
    advanceAuctionTimer,
    acceptInvoice,
    finalizeAuction,
    payInvoice,
    markOverdue,
    seedCompetingBid,
    fundWallet,
  } = useMorrow();

  const pendingBuyer = state.invoices.find((i) => i.status === "awaiting_buyer");
  const liveAuction = state.invoices.find((i) => i.status === "auction_live");
  const payable = state.invoices.find(
    (i) => (i.status === "funded" || i.status === "partially_repaid") && outstanding(i) > 0,
  );
  const overdueTarget = state.invoices.find((i) => i.status === "funded");

  const actions = [
    {
      icon: FilePlus2,
      label: "Seed new invoice",
      detail: "Adds a fresh receivable in Waiting for buyer",
      disabled: false,
      run: () => {
        const invoice = seedNewInvoice();
        toast.success(`Seeded ${invoice.ref}`, {
          description: "Visible in the Buyer approvals queue.",
        });
      },
    },
    {
      icon: CheckCircle2,
      label: "Simulate buyer acceptance",
      detail: pendingBuyer ? `Accepts ${pendingBuyer.ref}` : "No invoice waiting for a buyer",
      disabled: !pendingBuyer,
      run: () => {
        if (!pendingBuyer) return;
        acceptInvoice(pendingBuyer.id);
        toast.success(`${pendingBuyer.ref} accepted by ${pendingBuyer.buyerName}`);
      },
    },
    {
      icon: Gavel,
      label: "Complete funding with a seeded lender",
      detail: liveAuction ? `Fills remaining demand on ${liveAuction.ref}` : "No live auction",
      disabled: !liveAuction,
      run: () => {
        if (!liveAuction) return;
        seedCompetingBid(liveAuction.id);
        toast.success("Cobalt Credit Fund completed the funding request");
      },
    },
    {
      icon: Timer,
      label: "Advance auction timer",
      detail: liveAuction ? "Moves auction close to 45 seconds out" : "No live auction",
      disabled: !liveAuction,
      run: () => {
        advanceAuctionTimer();
        toast.success("Auction timers advanced");
      },
    },
    {
      icon: ArrowRight,
      label: "Finalize auction",
      detail: liveAuction
        ? `${liveAuction.ref} · ${usdc(fundedAmount(liveAuction))} committed`
        : "No live auction",
      disabled: !liveAuction,
      run: () => {
        if (!liveAuction) return;
        const { released } = finalizeAuction(liveAuction.id);
        toast.success(`${usdc(released)} USDC advance released`);
      },
    },
    {
      icon: Clock,
      label: "Simulate partial payment",
      detail: payable ? `Pays 40% of ${payable.ref}` : "No payable invoice",
      disabled: !payable,
      run: () => {
        if (!payable) return;
        payInvoice(payable.id, Math.round(payable.faceValue * 0.4 * 100) / 100);
        toast.success("Partial buyer payment received");
      },
    },
    {
      icon: CheckCircle2,
      label: "Simulate full payment",
      detail: payable ? `Settles ${payable.ref} in full` : "No payable invoice",
      disabled: !payable,
      run: () => {
        if (!payable) return;
        payInvoice(payable.id, outstanding(payable));
        toast.success("Settlement waterfall executed");
      },
    },
    {
      icon: TriangleAlert,
      label: "Simulate overdue invoice",
      detail: overdueTarget ? `Marks ${overdueTarget.ref} overdue` : "No funded invoice",
      disabled: !overdueTarget,
      run: () => {
        if (!overdueTarget) return;
        markOverdue(overdueTarget.id);
        toast.warning(`${overdueTarget.ref} marked overdue`);
      },
    },
    {
      icon: Wallet,
      label: "Fund lender wallet",
      detail: "Adds 10,000 test USDC on Arc",
      disabled: false,
      run: () => {
        fundWallet(10_000);
        toast.success("10,000 test USDC added to your Arc wallet");
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Demo controls</SheetTitle>
          <SheetDescription>
            Drive the presentation deterministically. Every control mutates the same shared demo
            state used by all three roles.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-4 pb-6">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={action.run}
              className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border-strong hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <action.icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-foreground">
                  {action.label}
                </span>
                <span className="block text-[12px] text-muted-foreground">{action.detail}</span>
              </span>
            </button>
          ))}

          <Separator className="my-4" />

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              resetDemo();
              toast.success("Demo reset", { description: "Original seeded state restored." });
              onOpenChange(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset demo
          </Button>

          <Disclaimer className="mt-4">
            Arc Testnet demo. Mock business and risk data, test USDC only. Not an investment
            product.
          </Disclaimer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
