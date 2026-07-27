import { mockDocHash, mockTxHash, expectedReturnFor } from "./format";
import type { ActivityEvent, Bid, Invoice, MorrowState, Position } from "./types";

export const DEMO_WALLET = "0x71F4a83c5b19E7d2c6A0f4B1eD3c8975A2Bc91A2";
export const DEMO_WALLET_SHORT = "0x71F4...91A2";
export const USER_BUSINESS = "Aster Studio";
export const USER_LENDER = "Your capital";

const DAY = 86_400_000;

function iso(offsetDays: number, from = Date.now()): string {
  return new Date(from + offsetDays * DAY).toISOString();
}

function isoHours(offsetHours: number): string {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString();
}

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function bid(
  invoiceId: string,
  lenderName: string,
  amount: number,
  apr: number,
  isUser: boolean,
  hoursAgo: number,
): Bid {
  return {
    id: uid("bid"),
    invoiceId,
    lenderName,
    amount,
    apr,
    maxDurationDays: 90,
    source: "arc",
    createdAt: isoHours(-hoursAgo),
    isUser,
  };
}

function position(
  invoiceId: string,
  lenderName: string,
  principal: number,
  apr: number,
  days: number,
  isUser: boolean,
  status: Position["status"] = "active",
  received = 0,
): Position {
  return {
    id: uid("pos"),
    invoiceId,
    lenderName,
    principal,
    apr,
    expectedReturn: expectedReturnFor(principal, apr, days),
    isUser,
    status,
    received,
  };
}

function baseInvoice(partial: Partial<Invoice> & { ref: string }): Invoice {
  const id = partial.id ?? partial.ref.toLowerCase();
  return {
    id,

    sellerName: USER_BUSINESS,
    buyerName: "Northstar Labs",
    buyerEmail: "ap@northstarlabs.io",
    description: "Professional services",
    industry: "Software",
    faceValue: 10_000,
    advanceRequested: 9_200,
    issueDate: iso(-10),
    dueDate: iso(45),
    status: "awaiting_buyer",
    riskCategory: "low-moderate",
    buyerRating: "AA",
    maxCostApr: 12,
    retentionPct: 3,
    auctionDurationHours: 12,
    auctionEndsAt: null,
    bids: [],
    positions: [],
    clearingApr: null,
    advanceReleased: 0,
    amountPaid: 0,
    poRef: "PO-88213",
    docHash: mockDocHash(),
    poHash: mockDocHash(),
    deliveryHash: mockDocHash(),
    acceptedAt: null,
    settledAt: null,
    createdAt: iso(-10),
    ownedByUserBusiness: true,
    ...partial,
  };
}

export function createSeedState(): MorrowState {
  const inv2048 = baseInvoice({
    id: "inv-2048",
    ref: "INV-2048",
    buyerName: "Northstar Labs",
    buyerEmail: "ap@northstarlabs.io",
    description: "Brand system and product design retainer — Q3 2026",
    industry: "Software",
    faceValue: 10_000,
    advanceRequested: 9_200,
    dueDate: iso(45),
    status: "buyer_accepted",
    acceptedAt: iso(-2),
    riskCategory: "low-moderate",
    buyerRating: "AA",
  });

  const inv2051 = baseInvoice({
    id: "inv-2051",
    ref: "INV-2051",
    buyerName: "Atlas Commerce",
    buyerEmail: "payables@atlascommerce.com",
    description: "Commerce platform migration — milestone 2",
    industry: "Retail",
    faceValue: 18_500,
    advanceRequested: 17_020,
    issueDate: iso(-6),
    dueDate: iso(30),
    status: "auction_live",
    acceptedAt: iso(-4),
    auctionEndsAt: isoHours(9),
    riskCategory: "low",
    buyerRating: "AAA",
    poRef: "PO-44107",
  });
  inv2051.bids = [
    bid(inv2051.id, "Cobalt Credit Fund", 8_900, 7.6, false, 6),
    bid(inv2051.id, USER_LENDER, 4_500, 7.9, true, 3),
  ];

  const inv2039 = baseInvoice({
    id: "inv-2039",
    ref: "INV-2039",
    buyerName: "Meridian Systems",
    buyerEmail: "finance@meridiansystems.com",
    description: "Embedded analytics implementation",
    industry: "Industrial",
    faceValue: 14_000,
    advanceRequested: 12_950,
    issueDate: iso(-20),
    dueDate: iso(21),
    status: "funded",
    acceptedAt: iso(-18),
    clearingApr: 6.8,
    advanceReleased: 12_950,
    riskCategory: "low",
    buyerRating: "AAA",
    poRef: "PO-31288",
  });
  inv2039.positions = [
    position(inv2039.id, USER_LENDER, 6_000, 6.8, 41, true),
    position(inv2039.id, "Cobalt Credit Fund", 6_950, 6.8, 41, false),
  ];

  const inv2027 = baseInvoice({
    id: "inv-2027",
    ref: "INV-2027",
    buyerName: "VectorWorks",
    buyerEmail: "ap@vectorworks.co",
    description: "Systems integration retainer",
    industry: "Manufacturing",
    faceValue: 7_500,
    advanceRequested: 6_900,
    issueDate: iso(-58),
    dueDate: iso(-12),
    status: "settled",
    acceptedAt: iso(-55),
    settledAt: iso(-12),
    clearingApr: 7.2,
    advanceReleased: 6_900,
    amountPaid: 7_500,
    riskCategory: "low",
    buyerRating: "AA",
    poRef: "PO-22019",
  });
  inv2027.positions = [
    position(inv2027.id, USER_LENDER, 4_000, 7.2, 46, true, "settled", 4_036.3),
    position(inv2027.id, "Rivermark Capital", 2_900, 7.2, 46, false, "settled", 2_926.3),
  ];

  const inv2062 = baseInvoice({
    id: "inv-2062",
    ref: "INV-2062",
    sellerName: "Kestrel Logistics",
    buyerName: "Orbit Freight",
    buyerEmail: "ap@orbitfreight.com",
    description: "Cross-dock freight capacity — 60 day terms",
    industry: "Logistics",
    faceValue: 25_000,
    advanceRequested: 23_000,
    issueDate: iso(-4),
    dueDate: iso(60),
    status: "auction_live",
    acceptedAt: iso(-3),
    auctionEndsAt: isoHours(21),
    riskCategory: "moderate",
    buyerRating: "A",
    maxCostApr: 14,
    poRef: "PO-90514",
    ownedByUserBusiness: false,
  });
  inv2062.bids = [bid(inv2062.id, "Rivermark Capital", 5_750, 10.2, false, 5)];

  const inv2058 = baseInvoice({
    id: "inv-2058",
    ref: "INV-2058",
    sellerName: "Halcyon Fabrication",
    buyerName: "Pinehurst Retail",
    buyerEmail: "ap@pinehurstretail.com",
    description: "Store fixtures — batch 14",
    industry: "Retail",
    faceValue: 9_000,
    advanceRequested: 8_200,
    issueDate: iso(-70),
    dueDate: iso(-9),
    status: "overdue",
    acceptedAt: iso(-66),
    clearingApr: 11.5,
    advanceReleased: 8_200,
    riskCategory: "moderate",
    buyerRating: "BBB",
    poRef: "PO-77321",
    ownedByUserBusiness: false,
  });
  inv2058.positions = [
    position(inv2058.id, USER_LENDER, 4_500, 11.5, 61, true, "overdue"),
    position(inv2058.id, "Rivermark Capital", 3_700, 11.5, 61, false, "overdue"),
  ];

  const invoices = [inv2048, inv2051, inv2039, inv2027, inv2062, inv2058];

  const activity: ActivityEvent[] = [
    ev("settlement", "Distribution executed", inv2027.ref, 7_500, -12 * 24),
    ev("payment", "Buyer payment received", inv2027.ref, 7_500, -12 * 24 - 1),
    ev("funding", "Advance released", inv2039.ref, 12_950, -18 * 24),
    ev("auction", "Auction finalized at 6.8% APR", inv2039.ref, null, -18 * 24 - 1),
    ev("funding", "Bid placed by Cobalt Credit Fund", inv2051.ref, 8_900, -6),
    ev("funding", "Bid placed from your Arc wallet", inv2051.ref, 4_500, -3),
    ev("auction", "Funding auction opened", inv2051.ref, 17_020, -8),
    ev("invoice", "Buyer accepted receivable", inv2048.ref, 10_000, -48),
    ev("invoice", "Invoice issued to buyer", inv2048.ref, 10_000, -10 * 24),
  ];

  return {
    version: 3,
    role: "business",
    connected: false,
    walletAddress: DEMO_WALLET,
    balances: { business: 18_600, lender: 5_700, buyer: 25_420 },
    unified: { base: 6_000, ethereum: 3_500, arc: 2_000 },
    invoices,
    activity,
  };
}

function ev(
  kind: ActivityEvent["kind"],
  title: string,
  invoiceRef: string,
  amount: number | null,
  hoursAgo: number,
): ActivityEvent {
  return {
    id: uid("ev"),
    ts: isoHours(hoursAgo),
    kind,
    title,
    invoiceRef,
    amount,
    wallet: DEMO_WALLET_SHORT,
    status: "confirmed",
    txHash: mockTxHash(),
  };
}

export const CASH_UNLOCKED_HISTORY = [
  { month: "Feb", volume: 12_400 },
  { month: "Mar", volume: 18_900 },
  { month: "Apr", volume: 15_200 },
  { month: "May", volume: 26_800 },
  { month: "Jun", volume: 31_500 },
  { month: "Jul", volume: 38_200 },
];

export const PORTFOLIO_VALUE_HISTORY = [
  { month: "Feb", value: 8_200 },
  { month: "Mar", value: 10_400 },
  { month: "Apr", value: 11_900 },
  { month: "May", value: 14_600 },
  { month: "Jun", value: 16_800 },
  { month: "Jul", value: 18_200 },
];
