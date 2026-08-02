import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Gauge, Landmark, Split } from "lucide-react";

import { cn } from "@/lib/utils";

const STAGES = [
  {
    title: "Buyer accepts",
    body: "The buyer confirms the invoice is a valid payment obligation and designates the Arc settlement route.",
    icon: BadgeCheck,
  },
  {
    title: "Lenders bid",
    body: "Funding auctions let lenders compete on rate and size until the requested advance is filled.",
    icon: Gauge,
  },
  {
    title: "Payment settles",
    body: "The buyer's USDC payment flows into the settlement vault and splits automatically to every claim.",
    icon: Split,
  },
];

const STAGE_MS = [2000, 2500, 2000];
const RESET_MS = 500;

const BIDS = [
  { amount: "4,000", apr: "8.2%" },
  { amount: "3,000", apr: "8.4%" },
  { amount: "2,200", apr: "8.7%" },
];

const LEGS = [
  { label: "Funders", amount: "9,500" },
  { label: "Protocol", amount: "50" },
  { label: "Business", amount: "450" },
];

const PACKET_LABEL = ["9,200 USDC", "9,200 USDC", "10,000 USDC"];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useSectionVisible<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(Boolean(entries[0]?.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function LifecycleScene() {
  const { ref } = useSectionVisible<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(0);

  const playing = !reduced;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setStage((s) => (s + 1) % STAGES.length),
      STAGE_MS[stage] + (stage === STAGES.length - 1 ? RESET_MS : 0),
    );
    return () => window.clearTimeout(timer);
  }, [playing, stage]);

  const active = reduced ? STAGES.length - 1 : stage;
  const isActive = useCallback((index: number) => reduced || active === index, [active, reduced]);
  const reached = useCallback((index: number) => reduced || active >= index, [active, reduced]);

  return (
    <div ref={ref} className="relative mt-12">
      {/* rail — horizontal on desktop, sits above the cards */}
      <div className="pointer-events-none relative mb-8 hidden h-8 md:block">
        <div className="absolute inset-x-[16%] bottom-0 h-px bg-border-strong">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${(active / (STAGES.length - 1)) * 100}%` }}
          />
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "absolute -top-[3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full transition-colors duration-500",
                reached(i) ? "bg-primary" : "bg-border-strong",
              )}
              style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
            />
          ))}
          <div
            className="absolute bottom-2 -translate-x-1/2 transition-[left] duration-700 ease-out"
            style={{ left: `${(active / (STAGES.length - 1)) * 100}%` }}
          >
            <span className="num rounded-full border border-primary/25 bg-card px-2.5 py-1 text-[10.5px] font-semibold whitespace-nowrap text-primary shadow-card">
              {PACKET_LABEL[active]}
            </span>
          </div>
        </div>
      </div>

      {/* rail — vertical on mobile */}
      <div className="pointer-events-none absolute top-10 bottom-10 left-5 w-px bg-border-strong md:hidden">
        <div
          className="absolute inset-x-0 top-0 bg-primary transition-[height] duration-700 ease-out"
          style={{ height: `${(active / (STAGES.length - 1)) * 100}%` }}
        />
      </div>

      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {STAGES.map((s, index) => (
          <div
            key={s.title}
            className={cn(
              "relative rounded-xl border bg-card p-5 text-left shadow-card transition-all duration-500 ease-out sm:p-6",
              isActive(index) ? "-translate-y-1 border-primary/30" : "translate-y-0 border-border",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-xl transition-colors duration-500",
                  reached(index)
                    ? "bg-primary-soft text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" />
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary transition-opacity duration-300",
                    isActive(index) ? "animate-pulse-soft opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span className="num text-[12px] font-semibold text-muted-foreground">
                0{index + 1}
              </span>
            </div>

            <h3 className="mt-4 text-[17px] font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>

            <div className="mt-4 border-t border-border pt-4">
              {index === 0 ? (
                <AcceptanceVisual on={reached(0)} />
              ) : index === 1 ? (
                <BidVisual on={reached(1)} />
              ) : (
                <SettlementVisual on={reached(2)} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcceptanceVisual({ on }: { on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p
          className={cn(
            "text-[12px] font-medium transition-colors duration-500",
            on ? "text-primary" : "text-muted-foreground",
          )}
        >
          {on ? "Buyer accepted" : "Awaiting confirmation"}
        </p>
        <p className="num mt-0.5 text-[11px] text-muted-foreground">INV-2048 · 10,000 USDC</p>
      </div>
      <svg viewBox="0 0 44 24" className="h-6 w-11 shrink-0" aria-hidden>
        <path
          d="M2 18 C8 4, 12 22, 18 12 S28 2, 34 14"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="60"
          style={{
            strokeDashoffset: on ? 0 : 60,
            transition: "stroke-dashoffset 900ms ease-out",
          }}
        />
        <path
          d="M36 12 l3 4 l5 -8"
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20"
          style={{
            strokeDashoffset: on ? 0 : 20,
            transition: "stroke-dashoffset 500ms ease-out 700ms",
          }}
        />
      </svg>
    </div>
  );
}

function BidVisual({ on }: { on: boolean }) {
  return (
    <div>
      <div className="space-y-1.5">
        {BIDS.map((bid, i) => (
          <div
            key={bid.amount}
            className="num flex items-center justify-between text-[11.5px] transition-all duration-500 ease-out"
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "translateY(0)" : "translateY(6px)",
              transitionDelay: `${i * 180}ms`,
            }}
          >
            <span className="text-foreground">{bid.amount} USDC</span>
            <span className="text-muted-foreground">{bid.apr}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
          style={{ width: on ? "100%" : "0%", transitionDelay: "300ms" }}
        />
      </div>
      <p
        className="num mt-2 text-[11px] text-muted-foreground transition-opacity duration-500"
        style={{ opacity: on ? 1 : 0, transitionDelay: "900ms" }}
      >
        9,200 USDC funded · 8.4% clearing APR
      </p>
    </div>
  );
}

function SettlementVisual({ on }: { on: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Landmark
          className={cn(
            "h-4 w-4 transition-colors duration-500",
            on ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="num text-[11.5px] text-muted-foreground">
          Settlement vault · 10,000 USDC
        </span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {LEGS.map((leg, i) => (
          <div key={leg.label} className="flex items-center gap-2">
            <span
              className="h-px flex-1 origin-left bg-primary/40 transition-transform duration-500 ease-out"
              style={{
                transform: on ? "scaleX(1)" : "scaleX(0)",
                transitionDelay: `${i * 160}ms`,
              }}
            />
            <span
              className="num shrink-0 text-[11px] transition-opacity duration-500"
              style={{ opacity: on ? 1 : 0, transitionDelay: `${200 + i * 160}ms` }}
            >
              <span className="text-muted-foreground">{leg.label} </span>
              <span className="font-semibold text-foreground">{leg.amount}</span>
            </span>
          </div>
        ))}
      </div>
      <p
        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-success transition-opacity duration-500"
        style={{ opacity: on ? 1 : 0, transitionDelay: "800ms" }}
      >
        <Check className="h-3.5 w-3.5" />
        Settled on Arc
      </p>
    </div>
  );
}
