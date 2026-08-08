import type { Invoice, InvoiceStatus, Position, WaterfallLeg } from "./types";

export const PROTOCOL_FEE_BPS = 50; // 0.5% of face value
export const ARCSCAN_BASE = "https://testnet.arcscan.app/tx/";
export const USER_LENDER_NAME = "Your capital";

export function shortHash(hash: string, lead = 10, tail = 8): string {
  if (hash.length <= lead + tail + 3) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}

export function arcscan(hash: string): string {
  return `${ARCSCAN_BASE}${hash}`;
}

export function usdc(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function usdcCompact(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function pct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  const ms = new Date(iso).getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function countdown(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "Closed";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  awaiting_buyer: "Waiting for buyer",
  buyer_accepted: "Buyer accepted",
  auction_live: "Auction live",
  funded: "Funded",
  partially_repaid: "Partially repaid",
  settled: "Settled",
  overdue: "Overdue",
  rejected: "Rejected",
};

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  awaiting_buyer: "neutral",
  buyer_accepted: "info",
  auction_live: "info",
  funded: "success",
  partially_repaid: "warning",
  settled: "success",
  overdue: "danger",
  rejected: "danger",
};

export function fundedAmount(invoice: Invoice): number {
  return invoice.bids.reduce((sum, bid) => sum + bid.amount, 0);
}

export function fundedPct(invoice: Invoice): number {
  if (invoice.advanceRequested <= 0) return 0;
  return Math.min(100, (fundedAmount(invoice) / invoice.advanceRequested) * 100);
}

export function bestApr(invoice: Invoice): number | null {
  if (invoice.bids.length === 0) return null;
  return Math.min(...invoice.bids.map((b) => b.apr));
}

export function clearingApr(invoice: Invoice): number | null {
  if (invoice.clearingApr != null) return invoice.clearingApr;
  const total = fundedAmount(invoice);
  if (total <= 0) return null;
  return invoice.bids.reduce((sum, b) => sum + b.apr * b.amount, 0) / total;
}

export function termDays(invoice: Invoice): number {
  const ms = new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export function expectedReturnFor(principal: number, apr: number, days: number): number {
  return Math.round(principal * (apr / 100) * (days / 365) * 100) / 100;
}

export function protocolFee(invoice: Invoice): number {
  return Math.round(invoice.faceValue * (PROTOCOL_FEE_BPS / 10_000) * 100) / 100;
}

export function lenderPayout(position: Position): number {
  return position.principal + position.expectedReturn;
}

export function waterfall(invoice: Invoice): WaterfallLeg[] {
  const fee = protocolFee(invoice);
  const legs: WaterfallLeg[] = [{ label: "Protocol servicing fee", amount: fee, tone: "fee" }];
  let lenderTotal = 0;
  for (const p of invoice.positions) {
    const payout = lenderPayout(p);
    lenderTotal += payout;
    legs.push({
      label: `${p.lenderName} principal and return`,
      sublabel: `${usdc(p.principal)} principal · ${usdc(p.expectedReturn)} return`,
      amount: payout,
      tone: "lender",
    });
  }
  const remainder = Math.max(0, Math.round((invoice.faceValue - fee - lenderTotal) * 100) / 100);
  legs.push({ label: "Business remainder", amount: remainder, tone: "business" });
  return legs;
}

export function businessRemainder(invoice: Invoice): number {
  const legs = waterfall(invoice);
  return legs[legs.length - 1].amount;
}

export function outstanding(invoice: Invoice): number {
  return Math.max(0, Math.round((invoice.faceValue - invoice.amountPaid) * 100) / 100);
}

export function isMarketVisible(invoice: Invoice): boolean {
  return (
    invoice.status === "buyer_accepted" ||
    invoice.status === "auction_live" ||
    invoice.status === "funded"
  );
}

export function riskLabel(risk: Invoice["riskCategory"]): string {
  if (!risk) return "Unrated";
  if (risk === "low") return "Low risk";
  if (risk === "low-moderate") return "Low–moderate risk";
  return "Moderate risk";
}
