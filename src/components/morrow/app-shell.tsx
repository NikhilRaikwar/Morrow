import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Copy,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Files,
  HelpCircle,
  LayoutDashboard,
  Menu,
  PieChart,
  Search,
  Settings,
  Store,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ARCSCAN_TESTNET_URL } from "@/config/arc";
import { useCircleWallet } from "@/lib/circle/wallet-context";
import { useMorrow } from "@/lib/morrow/store";
import type { Workspace } from "@/lib/morrow/types";
import { usdc } from "@/lib/morrow/format";
import { cn } from "@/lib/utils";
import { EnvironmentBadge } from "./environment-badge";
import { Wordmark } from "./primitives";

const WORKSPACES: { id: Workspace; label: string; to: string }[] = [
  { id: "business", label: "Business", to: "/dashboard/business" },
  { id: "buyer", label: "Buyer", to: "/dashboard/buyer" },
  { id: "lender", label: "Lender", to: "/dashboard/lender" },
];

function navItems(workspace: Workspace) {
  return [
    {
      label: "Overview",
      to: WORKSPACES.find((item) => item.id === workspace)!.to,
      icon: LayoutDashboard,
    },
    ...(workspace === "business"
      ? [
          { label: "Create receivable", to: "/create-invoice", icon: FileText },
          { label: "My invoices", to: "/dashboard/business", hash: "invoices", icon: Files },
        ]
      : []),
    { label: "Market", to: "/dashboard/market", icon: Store },
    { label: "Portfolio", to: "/portfolio", icon: PieChart },
    { label: "Arc activity", to: "/activity", icon: Activity },
    { label: "Settings", to: "/settings", icon: Settings },
  ];
}

function WorkspaceTabs({ onNavigate }: { onNavigate?: () => void }) {
  const { state, setRole } = useMorrow();
  return (
    <div
      className="grid grid-cols-3 rounded-lg border border-border bg-surface p-1"
      aria-label="Workspace navigation"
    >
      {WORKSPACES.map((workspace) => (
        <Link
          key={workspace.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={workspace.to as any}
          onClick={() => {
            setRole(workspace.id);
            onNavigate?.();
          }}
          className={cn(
            "rounded-md px-2 py-1.5 text-center text-[11.5px] font-medium transition-colors",
            state.role === workspace.id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {workspace.label}
        </Link>
      ))}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useMorrow();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const currentHash = useRouterState({ select: (router) => router.location.hash });
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/">
          <Wordmark />
        </Link>
      </div>
      <div className="px-3 pb-4">
        <p className="mb-2 px-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <WorkspaceTabs onNavigate={onNavigate} />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems(state.role).map((item) => (
          <Link
            key={item.label} // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={item.to as any}
            hash={"hash" in item ? item.hash : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
              pathname === item.to &&
                (!("hash" in item) || currentHash === item.hash || currentHash === `#${item.hash}`)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3 p-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="num text-[12px] font-medium">
              {state.walletAddress
                ? `${state.walletAddress.slice(0, 6)}…${state.walletAddress.slice(-4)}`
                : "Disconnected"}
            </span>
          </div>
          <p className="num mt-1.5 text-[15px] font-semibold">
            {usdc(state.unified.arc)}{" "}
            <span className="text-[11px] font-medium text-muted-foreground">USDC</span>
          </p>
        </div>
        <a
          href="https://developers.circle.com"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Circle wallet docs
        </a>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { state } = useMorrow();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      query.trim().length < 2
        ? []
        : state.invoices
            .filter((invoice) =>
              [invoice.ref, invoice.buyerName, invoice.sellerName]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .slice(0, 5),
    [query, state.invoices],
  );
  return (
    <div className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search onchain receivables"
        className="h-9 w-64 pl-9 text-[13px]"
      />
      {results.length > 0 ? (
        <div className="absolute left-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-float">
          {results.map((invoice) => (
            <button
              key={invoice.id}
              type="button"
              onClick={() => {
                setQuery("");
                navigate({ to: "/invoice/$id", params: { id: invoice.id } });
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted"
            >
              <span className="num text-[13px] font-medium">{invoice.ref}</span>
              <span className="num text-[12px] text-muted-foreground">{invoice.buyerName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu() {
  const { state, disconnectWallet } = useMorrow();
  const navigate = useNavigate();
  const address = state.walletAddress;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">
            {address.slice(2, 4).toUpperCase()}
          </span>
          <span className="num hidden text-[12px] sm:inline">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <DropdownMenuLabel>
          <span className="block text-[11px] text-muted-foreground">
            Circle wallet on Arc Testnet
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span className="num min-w-0 flex-1 break-all text-[12px] leading-5">{address}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Copy wallet address"
              title="Copy wallet address"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void navigator.clipboard.writeText(address).then(() => {
                  toast.success("Wallet address copied");
                });
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`${ARCSCAN_TESTNET_URL}/address/${address}`} target="_blank" rel="noreferrer">
            View on Arcscan <ExternalLink className="ml-auto h-3.5 w-3.5" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            disconnectWallet();
            navigate({ to: "/" });
          }}
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  children,
  requireConnection = true,
}: {
  children: ReactNode;
  requireConnection?: boolean;
}) {
  const { state, hydrated } = useMorrow();
  const circleWallet = useCircleWallet();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (
      hydrated &&
      requireConnection &&
      circleWallet.sessionStatus !== "loading" &&
      !circleWallet.session &&
      typeof window !== "undefined"
    ) {
      window.location.replace(`/connect?next=${encodeURIComponent(pathname)}`);
    }
  }, [circleWallet.session, circleWallet.sessionStatus, hydrated, requireConnection, pathname]);
  if (requireConnection && (!hydrated || !circleWallet.session))
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <p className="text-[13px] text-muted-foreground">Restoring Circle wallet session…</p>
      </div>
    );
  return (
    <div className="min-h-screen bg-background">
      <EnvironmentBadge />
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarNav />
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[268px] p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:flex">
                <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                <span className="num text-[13px] font-semibold">{usdc(state.unified.arc)}</span>
                <span className="text-[11px] text-muted-foreground">USDC</span>
              </div>
              <AccountMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-[26px] leading-tight font-semibold text-foreground sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-[14px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
