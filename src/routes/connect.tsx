import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { MarketingNav } from "@/components/morrow/marketing";
import { Button } from "@/components/ui/button";
import { useCircleWallet } from "@/lib/circle/wallet-context";

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : "/dashboard/business",
  }),
  head: () => ({
    meta: [
      { title: "Connect Circle Wallet — Morrow" },
      {
        name: "description",
        content: "Sign in with Google and create a Circle wallet on Arc Testnet.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConnectPage,
});

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/business";
}
function ConnectPage() {
  const { connect, sessionStatus, operationState, error } = useCircleWallet();
  const { next } = Route.useSearch();
  const start = async () => {
    try {
      await connect(safeNext(next));
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : (error ?? "Unable to connect Circle Wallet.");
      toast.error("Wallet connection failed", {
        description: message,
      });
    }
  };
  const busy =
    sessionStatus === "loading" ||
    sessionStatus === "onboarding" ||
    ["preparing", "awaiting_approval"].includes(operationState);
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav minimal />
      <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1080px] items-center gap-12 px-5 py-14 lg:grid-cols-[1fr_430px]">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Circle wallet on Arc Testnet
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-[44px] leading-[1.05] tracking-[-0.03em] sm:text-[58px]">
            Your approval key for programmable receivables.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Sign in with Google to access a Circle user-controlled EOA wallet. Circle securely
            approves wallet creation and every onchain transaction.
          </p>
          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">User controlled</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Morrow never receives your Google password or private key.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <KeyRound className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">Google authentication</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                OAuth verifies your identity without exposing credentials to Morrow.
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-7 shadow-float">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Enter the Morrow app</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Google authenticates your Circle user and opens the same Arc wallet on return. Morrow
            never receives a password, private key, or seed phrase.
          </p>
          <Button
            className="mt-7 w-full gap-2"
            size="lg"
            disabled={busy}
            onClick={() => void start()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {operationState === "awaiting_approval" ? "Approve in Circle" : "Preparing wallet"}
              </>
            ) : (
              <>
                Continue with Google <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          {error ? (
            <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">{error}</p>
          ) : null}
          <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
            Arc Testnet only · Test USDC · Unaudited hackathon MVP
          </p>
          <Link
            to="/market"
            className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to public market
          </Link>
        </section>
      </main>
    </div>
  );
}
