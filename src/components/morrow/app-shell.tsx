import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  ChevronDown,
  CircleDollarSign,
  FileText,
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMorrow } from "@/lib/morrow/store";
import { DEMO_WALLET_SHORT } from "@/lib/morrow/seed";
import { relativeTime, usdc } from "@/lib/morrow/format";
import type { Role } from "@/lib/morrow/types";
import { Pill, Wordmark } from "./primitives";
import { DemoControls } from "./demo-controls";
import { EnvironmentBadge } from "./environment-badge";
import { toast } from "sonner";

const ROLE_LABEL: Record<Role, string> = {
  business: "Business",
  lender: "Lender",
  buyer: "Buyer",
};

const ROLE_HOME: Record<Role, string> = {
  business: "/dashboard/business",
  lender: "/dashboard/lender",
  buyer: "/dashboard/buyer",
};

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

function navItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { label: "Overview", to: ROLE_HOME[role], icon: LayoutDashboard },
    { label: "Receivables Market", to: "/market", icon: Store },
    { label: "Create Invoice", to: "/create-invoice", icon: FileText, roles: ["business"] },
    { label: "My Invoices", to: ROLE_HOME[role], icon: CircleDollarSign },
    { label: "Portfolio", to: "/portfolio", icon: PieChart },
    { label: "Activity", to: "/activity", icon: Activity },
    { label: "Settings", to: "/settings", icon: Settings },
  ];
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useMorrow();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navItems(state.role);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/" className="inline-flex">
          <Wordmark />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item, index) => {
          const active = index === 0 ? pathname === item.to : pathname === item.to && index !== 0;
          const isMyInvoices = item.label === "My Invoices";
          return (
            <Link
              key={item.label}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={item.to as any}
              hash={isMyInvoices ? "invoices" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-success" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[12px] font-medium text-foreground">Arc Testnet</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Live</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="num text-[12px] font-medium text-foreground">{DEMO_WALLET_SHORT}</span>
          </div>
          <p className="num mt-1.5 text-[15px] font-semibold text-foreground">
            {usdc(state.balances[state.role])}{" "}
            <span className="text-[11px] font-medium text-muted-foreground">USDC</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[state.role]} wallet</p>
        </div>

        <a
          href="https://developers.circle.com"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Help and documentation
        </a>
      </div>
    </div>
  );
}

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { state, setRole } = useMorrow();
  const navigate = useNavigate();
  const [controlsOpen, setControlsOpen] = useState(false);

  const change = (role: Role) => {
    setRole(role);
    toast.success(`Switched to ${ROLE_LABEL[role]} view`, {
      description: "All demo data stays in sync across roles.",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: ROLE_HOME[role] as any });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span className="hidden text-[11px] font-normal text-muted-foreground sm:inline">
              Demo role
            </span>
            <span className="text-[13px] font-medium">{ROLE_LABEL[state.role]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Switch demo role
          </DropdownMenuLabel>
          {(["business", "lender", "buyer"] as Role[]).map((role) => (
            <DropdownMenuItem key={role} onSelect={() => change(role)} className="gap-2">
              <span className="flex-1">{ROLE_LABEL[role]}</span>
              {state.role === role ? <Pill tone="info">Active</Pill> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTimeout(() => setControlsOpen(true), 10)}>
            Demo controls
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!compact ? <DemoControls open={controlsOpen} onOpenChange={setControlsOpen} /> : null}
    </>
  );
}

function Notifications() {
  const { state } = useMorrow();
  const recent = state.activity.slice(0, 6);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {recent.length > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[13px] font-semibold">Notifications</p>
          <p className="text-[11px] text-muted-foreground">Arc Testnet activity</p>
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {recent.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <p className="text-[13px] font-medium text-foreground">{event.title}</p>
              <p className="num text-[11px] text-muted-foreground">
                {event.invoiceRef} · {relativeTime(event.ts)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-2">
          <Link to="/activity">
            <Button variant="ghost" size="sm" className="w-full">
              View all activity
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GlobalSearch() {
  const { state } = useMorrow();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return state.invoices
      .filter(
        (i) =>
          i.ref.toLowerCase().includes(q) ||
          i.buyerName.toLowerCase().includes(q) ||
          i.sellerName.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [query, state.invoices]);

  return (
    <div className="relative hidden md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search invoices, buyers"
        className="h-9 w-64 pl-9 text-[13px]"
      />
      {results.length > 0 ? (
        <div className="absolute top-11 left-0 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-float">
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
              <span className="text-[12px] text-muted-foreground">{invoice.buyerName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  children,
  requireConnection = true,
}: {
  children: ReactNode;
  requireConnection?: boolean;
}) {
  const { state, hydrated, connectWallet } = useMorrow();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || !requireConnection) return;
    if (!state.connected) navigate({ to: "/connect", search: { next: "app" } });
  }, [hydrated, requireConnection, state.connected, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <EnvironmentBadge />

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarNav />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
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
                <span className="num text-[13px] font-semibold">
                  {usdc(state.balances[state.role])}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">USDC</span>
              </div>
              <Notifications />
              <RoleSwitcher />
              <button
                type="button"
                onClick={() => {
                  if (!state.connected) connectWallet();
                  navigate({ to: "/settings" });
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background"
                aria-label="Account settings"
              >
                AR
              </button>
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
