import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Chrome, Loader2, Mail, ShieldCheck, Wallet, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark, Pill, Disclaimer, Amount } from "@/components/morrow/primitives";
import { useMorrow } from "@/lib/morrow/store";
import { DEMO_WALLET_SHORT } from "@/lib/morrow/seed";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/morrow/types";

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : "app",
  }),
  head: () => ({
    meta: [
      { title: "Connect your wallet — Morrow" },
      {
        name: "description",
        content:
          "Create a Circle Wallet with email or connect an existing wallet to enter the Morrow receivables market on Arc Testnet.",
      },
      { property: "og:title", content: "Connect to Morrow" },
      {
        property: "og:description",
        content: "Email-created Circle Wallets, no seed phrase required.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConnectPage,
});

const STEPS = ["Creating secure wallet", "Connecting to Arc Testnet", "Loading USDC balance"];

const METHODS = [
  {
    id: "email",
    title: "Continue with email",
    subtitle: "powered by Circle Wallets",
    icon: Mail,
    recommended: true,
  },
  {
    id: "google",
    title: "Continue with Google",
    subtitle: "Single sign-on",
    icon: Chrome,
    recommended: false,
  },
  {
    id: "browser",
    title: "Connect browser wallet",
    subtitle: "Injected EVM wallet",
    icon: Wallet,
    recommended: false,
  },
  {
    id: "demo",
    title: "Demo wallet",
    subtitle: "Preloaded test USDC",
    icon: ShieldCheck,
    recommended: false,
  },
];

type Phase = "select" | "email" | "connecting" | "ready" | "role";

function ConnectPage() {
  const { connectWallet, setRole } = useMorrow();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("select");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("alex@asterstudio.co");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const start = () => {
    setPhase("connecting");
    setStep(0);
    timers.current.push(setTimeout(() => setStep(1), 400));
    timers.current.push(setTimeout(() => setStep(2), 800));
    timers.current.push(
      setTimeout(() => {
        setStep(3);
        setPhase("ready");
        connectWallet();
        toast.success("Wallet ready", { description: "Arc Testnet · 25,420.00 USDC" });
      }, 1200),
    );
    timers.current.push(setTimeout(() => setPhase("role"), 2200));
  };

  const enter = (role: Role) => {
    setRole(role);
    const to =
      role === "business"
        ? "/dashboard/business"
        : role === "lender"
          ? "/dashboard/lender"
          : "/dashboard/buyer";
    navigate({ to });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
      <div className="relative hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <div className="grid-canvas pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_60%_at_30%_20%,black,transparent)]" />
        <div className="relative">
          <Wordmark />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-[34px] leading-tight font-semibold text-foreground">
            Sell tomorrow's receivable for today's USDC.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Buyers confirm invoices, lenders compete to finance them, and Arc settles every payment
            automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Pill tone="neutral">USDC-native</Pill>
            <Pill tone="neutral">Buyer-accepted</Pill>
            <Pill tone="neutral">Deterministic settlement</Pill>
          </div>
        </div>
        <p className="relative text-[12px] text-muted-foreground">
          Arc Testnet demo · Mock business and risk data · Test USDC only
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <Wordmark />
          </div>

          {phase === "select" || phase === "email" ? (
            <div className="animate-fade-up">
              <h2 className="mt-8 text-[24px] font-semibold text-foreground lg:mt-0">
                Connect to Morrow
              </h2>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                No MetaMask required. This demo runs on Arc Testnet with mock balances.
              </p>

              {phase === "email" ? (
                <div className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <Button className="w-full gap-2" onClick={start} disabled={!email.includes("@")}>
                    Create wallet
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setPhase("select")}>
                    Back
                  </Button>
                </div>
              ) : (
                <div className="mt-8 space-y-2.5">
                  {METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => (method.id === "email" ? setPhase("email") : start())}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-raised",
                        method.recommended
                          ? "border-primary/40 ring-1 ring-primary/15"
                          : "border-border hover:border-border-strong",
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-foreground">
                        <method.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-foreground">
                          {method.title}
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          {method.subtitle}
                        </span>
                      </span>
                      {method.recommended ? <Pill tone="info">Recommended</Pill> : null}
                    </button>
                  ))}
                </div>
              )}

              <Disclaimer className="mt-8">
                Arc Testnet demo. Test USDC only. Not an investment product.
              </Disclaimer>
            </div>
          ) : null}

          {phase === "connecting" || phase === "ready" ? (
            <div className="animate-fade-up mt-8 lg:mt-0">
              <h2 className="text-[24px] font-semibold text-foreground">
                {phase === "ready" ? "Wallet ready" : "Setting up your wallet"}
              </h2>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                {phase === "ready"
                  ? "Your Circle Wallet is connected to Arc Testnet."
                  : "This takes about a second."}
              </p>

              <ol className="mt-8 space-y-1">
                {STEPS.map((label, index) => {
                  const done = step > index;
                  const active = step === index;
                  return (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5",
                        active && "bg-primary-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border text-[10px]",
                          done
                            ? "border-success/30 bg-success text-success-foreground"
                            : active
                              ? "border-primary/30 bg-primary text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? (
                          <Check className="h-3 w-3" />
                        ) : active ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="text-[13.5px] font-medium text-foreground">{label}</span>
                    </li>
                  );
                })}
              </ol>

              {phase === "ready" ? (
                <div className="animate-scale-in mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Wallet</span>
                    <span className="num text-[13px] font-medium">{DEMO_WALLET_SHORT}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Balance</span>
                    <Amount value={25_420} size="sm" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Network</span>
                    <Pill tone="success" dot>
                      Arc Testnet
                    </Pill>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {phase === "role" ? (
            <div className="animate-fade-up mt-8 lg:mt-0">
              <h2 className="text-[24px] font-semibold text-foreground">Choose your demo role</h2>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                You can switch at any time from the header. All three roles share one live demo
                state.
              </p>
              <div className="mt-8 space-y-2.5">
                {(
                  [
                    {
                      role: "business",
                      title: "Business",
                      body: "Issue invoices and unlock working capital",
                    },
                    {
                      role: "lender",
                      title: "Lender",
                      body: "Fund receivables and track repayments",
                    },
                    { role: "buyer", title: "Buyer", body: "Accept obligations and pay in USDC" },
                  ] as { role: Role; title: string; body: string }[]
                ).map((option) => (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => enter(option.role)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:shadow-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-foreground">
                        {option.title}
                      </span>
                      <span className="block text-[12px] text-muted-foreground">{option.body}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
