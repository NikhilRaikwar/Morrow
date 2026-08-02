import { Link } from "@tanstack/react-router";
import { ExternalLink, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, arcscan, shortHash, usdc } from "@/lib/morrow/format";
import type { InvoiceStatus } from "@/lib/morrow/types";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span className="font-display text-[26px] leading-none tracking-[-0.015em] text-foreground">
        Morrow
      </span>
      <span className="ml-[3px] h-[6px] w-[6px] translate-y-[-1px] rounded-full bg-primary" />
    </span>
  );
}

export function Amount({
  value,
  size = "md",
  suffix = "USDC",
  className,
  decimals,
}: {
  value: number;
  size?: "sm" | "md" | "lg" | "xl";
  suffix?: string | null;
  className?: string;
  decimals?: number;
}) {
  const sizes = {
    sm: "text-[15px] font-medium",
    md: "text-[20px] font-semibold sm:text-[22px]",
    lg: "text-[26px] font-semibold sm:text-[30px]",
    xl: "text-[34px] font-semibold sm:text-[44px]",
  } as const;
  const suffixSizes = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-[13px]",
    xl: "text-sm",
  } as const;
  return (
    <span
      className={cn(
        "num inline-flex items-baseline gap-1.5 text-foreground",
        sizes[size],
        className,
      )}
    >
      {usdc(value, { decimals })}
      {suffix ? (
        <span className={cn("font-medium text-muted-foreground", suffixSizes[size])}>{suffix}</span>
      ) : null}
    </span>
  );
}

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary-soft text-primary border-primary/15",
  primary: "bg-primary-soft text-primary border-primary/15",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function Pill({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function StatusPill({ status, className }: { status: InvoiceStatus; className?: string }) {
  return (
    <Pill tone={STATUS_TONE[status]} className={className} dot>
      {STATUS_LABEL[status]}
    </Pill>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon ? (
          <span
            className={cn("grid h-7 w-7 place-items-center rounded-lg border", toneClass[tone])}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{value}</div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  className,
  height = 8,
}: {
  value: number;
  tone?: "primary" | "success" | "warning";
  className?: string;
  height?: number;
}) {
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-muted", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bg)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-2xl text-center", className)}>
      {eyebrow ? (
        <p className="text-[12px] font-semibold tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-[28px] leading-tight font-semibold text-foreground sm:text-[34px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function Disclaimer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-[12px] text-muted-foreground", className)}>
      <Info className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={arcscan(hash)}
      target="_blank"
      rel="noreferrer noopener"
      className="num inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
    >
      {label ?? shortHash(hash)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function KeyValue({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-6 py-2.5", className)}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-right text-[13px] font-medium text-foreground", mono && "num")}>
        {value}
      </span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CardLink({
  to,
  params,
  children,
  className,
}: {
  to: string;
  params?: Record<string, string>;
  children: ReactNode;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={to as any} params={params as any} className={className}>
      {children}
    </Link>
  );
}
