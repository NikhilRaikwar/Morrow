import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell, PageHeader, RoleSwitcher } from "@/components/morrow/app-shell";
import { Amount, Disclaimer, KeyValue, Pill } from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";
import { DEMO_WALLET } from "@/lib/morrow/seed";
import { usdc } from "@/lib/morrow/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Morrow" },
      {
        name: "description",
        content: "Manage your demo wallet, balances, role and reset the Morrow demo state.",
      },
      { property: "og:title", content: "Morrow settings" },
      { property: "og:description", content: "Wallet, balances and demo controls." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, fundWallet, resetDemo, disconnectWallet } = useMorrow();

  return (
    <AppShell>
      <PageHeader title="Settings" description="Wallet, balances and demo controls." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Wallet</h2>
          <div className="mt-3 divide-y divide-border">
            <KeyValue label="Address" value={DEMO_WALLET.slice(0, 18) + "…"} mono />
            <KeyValue
              label="Network"
              value={
                <Pill tone="success" dot>
                  Arc Testnet
                </Pill>
              }
            />
            <KeyValue label="Type" value="Circle Wallet (email)" />
            <KeyValue label="Status" value={state.connected ? "Connected" : "Disconnected"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fundWallet(10_000);
                toast.success("10,000 test USDC added");
              }}
            >
              Fund 10,000 USDC
            </Button>
            <Button variant="ghost" onClick={disconnectWallet}>
              Disconnect
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Balances</h2>
          <div className="mt-4 space-y-4">
            {(["business", "lender", "buyer"] as const).map((role) => (
              <div key={role} className="flex items-center justify-between gap-4">
                <span className="text-[13px] capitalize text-muted-foreground">{role}</span>
                <Amount value={state.balances[role]} size="sm" />
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
              Unified balance
            </p>
            <div className="mt-2 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base</span>
                <span className="num">{usdc(state.unified.base)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ethereum</span>
                <span className="num">{usdc(state.unified.ethereum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arc</span>
                <span className="num">{usdc(state.unified.arc)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Demo role</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            All roles share one live state, so actions in one view appear instantly in the others.
          </p>
          <div className="mt-4">
            <RoleSwitcher />
          </div>
        </section>

        <section className="rounded-xl border border-danger/20 bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold text-foreground">Reset demo</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Restores the original seeded invoices, balances and activity log.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => {
              resetDemo();
              toast.success("Demo reset", { description: "Seed state restored." });
            }}
          >
            Reset demo state
          </Button>
          <Disclaimer className="mt-4">
            State is stored in your browser only. Nothing is sent to a server.
          </Disclaimer>
        </section>
      </div>
    </AppShell>
  );
}
