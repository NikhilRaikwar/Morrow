import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TxLink } from "./primitives";

export interface TxStep {
  label: string;
  detail?: string;
}

export type TxPhase = "idle" | "running" | "done";

export function useTxRunner(steps: TxStep[], stepMs = 750) {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [current, setCurrent] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const run = async (work?: () => Promise<void> | void) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("running");
    setCurrent(0);
    try {
      await work?.();
      setCurrent(steps.length);
      setPhase("done");
    } catch {
      setPhase("idle");
      throw new Error("The Circle transaction was not completed.");
    }
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setPhase("idle");
    setCurrent(0);
  };

  return { phase, current, run, reset };
}

export function TxSteps({
  steps,
  current,
  phase,
}: {
  steps: TxStep[];
  current: number;
  phase: TxPhase;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => {
        const complete = phase === "done" || index < current;
        const active = phase === "running" && index === current;
        return (
          <li
            key={step.label}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
              active && "bg-primary-soft",
              complete && "opacity-70",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                complete
                  ? "border-success/30 bg-success text-success-foreground"
                  : active
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              {complete ? (
                <Check className="h-3 w-3" />
              ) : active ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">{step.label}</span>
              {step.detail ? (
                <span className="block text-[12px] text-muted-foreground">{step.detail}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TransactionDialog({
  open,
  onOpenChange,
  title,
  steps,
  current,
  phase,
  successTitle,
  successBody,
  txHash,
  onClose,
  closeLabel = "Done",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: TxStep[];
  current: number;
  phase: TxPhase;
  successTitle: string;
  successBody?: ReactNode;
  txHash?: string;
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && phase === "running") return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[17px]">
            {phase === "done" ? successTitle : title}
          </DialogTitle>
        </DialogHeader>

        {phase === "done" ? (
          <div className="animate-scale-in space-y-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
              <Check className="h-6 w-6" />
            </div>
            {successBody}
            {txHash ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Arc transaction
                </p>
                <TxLink hash={txHash} />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[12px] text-muted-foreground">Confirmed on Arc Testnet</span>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onClose?.();
                }}
              >
                {closeLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <TxSteps steps={steps} current={current} phase={phase} />
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-[12px] text-muted-foreground">
                Awaiting Circle PIN approval
              </span>
              <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Arc Testnet
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RejectIcon() {
  return <X className="h-4 w-4" />;
}
