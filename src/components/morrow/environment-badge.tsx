import { getMorrowPublicConfig } from "@/config/env";

export function EnvironmentBadge() {
  const live = getMorrowPublicConfig().mode === "arc";
  return (
    <div className="flex items-center justify-center gap-2 border-b border-border bg-foreground px-4 py-1.5 text-center text-[11.5px] font-medium text-background">
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-amber-300"}`} />
      {live
        ? "Arc Testnet · Live contract mode"
        : "Demo mode · Mock state only · No transaction is submitted"}
    </div>
  );
}
