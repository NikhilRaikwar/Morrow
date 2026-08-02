import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppShell, PageHeader, RoleSwitcher } from "@/components/morrow/app-shell";
import { Amount, Disclaimer, KeyValue, Pill } from "@/components/morrow/primitives";
import { Button } from "@/components/ui/button";
import { useMorrow } from "@/lib/morrow/store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });
function SettingsPage() {
  const { state, disconnectWallet, refresh } = useMorrow();
  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Circle Wallet connection and live Arc Testnet data."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold">Circle Wallet</h2>
          <div className="mt-3 divide-y divide-border">
            <KeyValue label="Address" value={state.walletAddress || "Not connected"} mono />
            <KeyValue
              label="Network"
              value={
                <Pill tone="success" dot>
                  Arc Testnet
                </Pill>
              }
            />
            <KeyValue label="Status" value={state.connected ? "Connected" : "Disconnected"} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh Arc data
            </Button>
            {state.connected ? (
              <Button variant="ghost" onClick={disconnectWallet}>
                Disconnect
              </Button>
            ) : (
              <Link to="/connect">
                <Button>Connect Circle Wallet</Button>
              </Link>
            )}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold">Arc USDC balance</h2>
          <div className="mt-5">
            <Amount value={state.unified.arc} size="lg" />
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Read from your Circle wallet on Arc Testnet. Cross-chain Unified Balance funding is not
            enabled in this MVP.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-[16px] font-semibold">Market view</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            The selected view changes navigation only. MorrowMarket validates the seller, buyer, and
            lender address on every lifecycle action.
          </p>
          <div className="mt-4">
            <RoleSwitcher />
          </div>
        </section>
      </div>
      <Disclaimer className="mt-6">
        Testnet only. Onchain invoice evidence is a document digest; no real credit underwriting or
        collections are provided.
      </Disclaimer>
    </AppShell>
  );
}
