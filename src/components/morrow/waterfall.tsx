import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { usdc } from "@/lib/morrow/format";
import type { WaterfallLeg } from "@/lib/morrow/types";

export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

const toneBar: Record<WaterfallLeg["tone"], string> = {
  fee: "bg-muted-foreground/50",
  lender: "bg-primary",
  business: "bg-success",
};

const toneText: Record<WaterfallLeg["tone"], string> = {
  fee: "text-muted-foreground",
  lender: "text-primary",
  business: "text-success",
};

export function WaterfallBars({
  total,
  legs,
  animate = true,
  className,
}: {
  total: number;
  legs: WaterfallLeg[];
  animate?: boolean;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const active = animate ? inView : true;

  return (
    <div ref={ref} className={cn("space-y-4", className)}>
      {legs.map((leg, index) => {
        const width = total > 0 ? (leg.amount / total) * 100 : 0;
        return (
          <div key={leg.label}>
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{leg.label}</p>
                {leg.sublabel ? (
                  <p className="num truncate text-[11px] text-muted-foreground">{leg.sublabel}</p>
                ) : null}
              </div>
              <p className={cn("num shrink-0 text-[14px] font-semibold", toneText[leg.tone])}>
                {usdc(leg.amount)} <span className="text-[11px] font-medium">USDC</span>
              </p>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-1000 ease-out",
                  toneBar[leg.tone],
                )}
                style={{
                  width: active ? `${Math.max(1.5, width)}%` : "0%",
                  transitionDelay: `${index * 140}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SettlementFlowDiagram({
  total,
  legs,
  active,
}: {
  total: number;
  legs: WaterfallLeg[];
  active: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[190px_1fr_minmax(0,1.1fr)] lg:items-center">
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-500",
          active ? "opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Buyer payment
        </p>
        <p className="num mt-1.5 text-[24px] font-semibold text-foreground">{usdc(total)}</p>
        <p className="text-[11px] text-muted-foreground">USDC received on Arc</p>
      </div>

      <div className="relative hidden h-32 lg:block">
        <svg className="h-full w-full" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 60 H80 M80 60 V20 H200 M80 60 H200 M80 60 V100 H200"
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth="1.5"
          />
          {active ? (
            <path
              d="M0 60 H80 M80 60 V20 H200 M80 60 H200 M80 60 V100 H200"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              strokeDasharray="6 18"
              className="animate-flow"
            />
          ) : null}
          <circle cx="80" cy="60" r="6" fill="var(--color-primary)" opacity="0.15" />
          <circle cx="80" cy="60" r="3" fill="var(--color-primary)" />
        </svg>
        <span className="absolute top-1/2 left-[40%] -translate-y-9 text-[11px] font-medium text-muted-foreground">
          Settlement vault
        </span>
      </div>

      <div className="space-y-3">
        {legs.map((leg, index) => (
          <div
            key={leg.label}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-card transition-all duration-500",
              active ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
            )}
            style={{ transitionDelay: `${300 + index * 180}ms` }}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">{leg.label}</p>
              {leg.sublabel ? (
                <p className="num truncate text-[11px] text-muted-foreground">{leg.sublabel}</p>
              ) : null}
            </div>
            <p className={cn("num shrink-0 text-[15px] font-semibold", toneText[leg.tone])}>
              {usdc(leg.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
