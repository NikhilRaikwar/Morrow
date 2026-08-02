export type Workspace = "business" | "lender" | "buyer";
export type Role = Workspace;

export type InvoiceStatus =
  | "awaiting_buyer"
  | "buyer_accepted"
  | "auction_live"
  | "funded"
  | "partially_repaid"
  | "settled"
  | "overdue"
  | "rejected";

export type RiskCategory = "low" | "low-moderate" | "moderate";

export type BidSource = "arc" | "unified" | "bridge";

export interface Bid {
  id: string;
  invoiceId: string;
  lenderName: string;
  amount: number;
  apr: number;
  maxDurationDays: number;
  source: BidSource;
  createdAt: string;
  isUser: boolean;
}

export interface Position {
  id: string;
  invoiceId: string;
  lenderName: string;
  isUser: boolean;
  principal: number;
  apr: number;
  expectedReturn: number;
  status: "active" | "partially_repaid" | "settled" | "overdue";
  received: number;
}

export interface Invoice {
  id: string;
  ref: string;
  sellerName: string;
  buyerName: string;
  sellerAddress: string;
  buyerAddress: string;
  buyerEmail: string;
  description: string;
  industry: string;
  faceValue: number;
  advanceRequested: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  riskCategory: RiskCategory | null;
  buyerRating: "AAA" | "AA" | "A" | "BBB" | null;
  maxCostApr: number;
  retentionPct: number;
  auctionDurationHours: number;
  auctionEndsAt: string | null;
  bids: Bid[];
  positions: Position[];
  clearingApr: number | null;
  advanceReleased: number;
  amountPaid: number;
  poRef: string;
  docHash: string;
  poHash: string;
  deliveryHash: string;
  acceptedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  ownedByUserBusiness: boolean;
}

export type ActivityKind = "invoice" | "auction" | "funding" | "payment" | "settlement";

export interface ActivityEvent {
  id: string;
  ts: string;
  kind: ActivityKind;
  title: string;
  invoiceRef: string;
  amount: number | null;
  wallet: string;
  status: "confirmed" | "pending";
  txHash: string;
}

export interface MorrowState {
  version: number;
  role: Role;
  connected: boolean;
  walletAddress: string;
  balances: Record<Role, number>;
  unified: { base: number; ethereum: number; arc: number };
  invoices: Invoice[];
  activity: ActivityEvent[];
}

export interface WaterfallLeg {
  label: string;
  sublabel?: string;
  amount: number;
  tone: "fee" | "lender" | "business";
}
