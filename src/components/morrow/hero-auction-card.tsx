import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Amount, Disclaimer, Pill } from "@/components/morrow/primitives";
import { cn } from "@/lib/utils";

type Bid = { lender: string; apr: string; amount: string; progress: number };

const BIDS: Bid[] = [
  { lender: "Harbor Capital", apr: "9.6", amount: "2,900", progress: 32 },
  { lender: "Vela Credit", apr: "9.1", amount: "2,100", progress: 55 },
  { lender: "Northwind Fund", apr: "8.7", amount: "1,500", progress: 71 },
  { lender: "Arc Yield Desk", apr: "8.4", amount: "700", progress: 78 },
];

const BID_DELAY_MS = 850;
const START_MS = 700;
const HOLD_MS = 2400;
const COUNTDOWN_START = 161; // 02:41

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function HeroAuctionCard() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // number of bids currently placed (0..4)
  const [count, setCount] = useState(reduced ? BIDS.length : 0);
  const [live, setLive] = useState(reduced);
  const [seconds, setSeconds] = useState(COUNTDOWN_START);
  const [running, setRunning] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduced) {
      setCount(BIDS.length);
      setLive(true);
    }
  }, [reduced]);

  // pause when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = running && visible && !reduced;

  // the loop
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    if (count === 0 && !live) {
      at(START_MS, () => setLive(true));
    }
    if (live && count < BIDS.length) {
      at(count === 0 ? 300 : BID_DELAY_MS, () => setCount((c) => c + 1));
    }
    if (count === BIDS.length) {
      at(HOLD_MS + 1400, () => {
        setCount(0);
        setLive(false);
        setSeconds(COUNTDOWN_START);
        setCycle((c) => c + 1);
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [active, count, live]);

  // countdown
  useEffect(() => {
    if (!active || !live) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active, live]);

  const placed = BIDS.slice(0, count);
  const best = placed.length ? placed[placed.length - 1] : null;
  const progress = best ? best.progress : 0;
  const complete = count === BIDS.length;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 3, y: px * 3 });
  };

  return (
    <div className="animate-fade-up [animation-delay:120ms]" ref={containerRef}>
      <div
        onMouseEnter={() => setRunning(false)}
        onMouseLeave={() => {
          setRunning(true);
          setTilt({ x: 0, y: 0 });
        }}
        onMouseMove={onMove}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="rounded-2xl border border-border bg-card p-6 shadow-float"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="num text-[13px] font-semibold text-foreground">INV-2048</p>
            <p className="text-[12px] text-muted-foreground">Buyer · Northstar Labs</p>
          </div>
          {live ? (
            <div className="relative">
              <span className="pointer-events-none absolute left-[9px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-primary animate-ring-pulse" />
              <Pill tone="primary" dot>
                Auction live · <span className="num ml-1">{mmss(seconds)}</span>
              </Pill>
            </div>
          ) : (
            <Pill tone="success" dot>
              Buyer accepted
            </Pill>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Face value
            </p>
            <Amount value={10_000} size="lg" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Advance requested
            </p>
            <Amount value={9_200} size="lg" />
          </div>
        </div>

        {/* bid ticker */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Incoming bids
            </span>
            <span
              key={`c-${cycle}-${count}`}
              className={cn(
                "num rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary",
                !reduced && "animate-count-pop",
              )}
            >
              {count} {count === 1 ? "bid" : "bids"}
            </span>
          </div>

          <div className="mt-2 min-h-[112px] space-y-1">
            {placed.length === 0 ? (
              <p className="px-1 pt-6 text-center text-[12px] text-muted-foreground">
                Waiting for lenders…
              </p>
            ) : (
              placed.map((bid, i) => {
                const isBest = i === placed.length - 1;
                return (
                  <div
                    key={`${cycle}-${bid.lender}`}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors",
                      !reduced && "animate-bid-in",
                      isBest ? "bg-primary-soft" : "bg-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[12.5px] font-medium",
                        isBest ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {bid.lender}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="num text-[11.5px] text-muted-foreground">
                        {bid.amount} USDC
                      </span>
                      <span
                        className={cn(
                          "num text-[13px] font-semibold",
                          isBest ? "text-primary" : "text-foreground",
                        )}
                      >
                        {bid.apr}%
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            Due in 45 days
          </div>
          <div className="overflow-hidden text-right">
            <p className="text-[11px] text-muted-foreground">Current best rate</p>
            <p
              key={`r-${cycle}-${count}`}
              className={cn(
                "num text-[14px] font-semibold",
                !reduced && "animate-digit-flash",
                best ? "text-primary" : "text-muted-foreground",
              )}
            >
              {best ? `${best.apr}% APR` : "— APR"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12.5px] font-medium text-foreground">Funding progress</span>
            <span className="num text-[13px] font-semibold text-primary">{progress}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${progress}%`,
                transition: reduced ? undefined : "width 700ms cubic-bezier(0.34, 1.36, 0.64, 1)",
              }}
            />
            {complete && !reduced ? (
              <span
                key={`s-${cycle}`}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer-sweep bg-gradient-to-r from-transparent via-primary-foreground/70 to-transparent"
              />
            ) : null}
          </div>
        </div>

        <Link to="/invoice/$id" params={{ id: "inv-2048" }} className="mt-6 block">
          <Button
            key={`b-${cycle}-${complete}`}
            className={cn("w-full gap-2", complete && !reduced && "animate-cta-glow")}
          >
            View auction
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <Disclaimer className="mt-4">
          Arc Testnet demo. Mock business and risk data, test USDC only.
        </Disclaimer>
      </div>
    </div>
  );
}
