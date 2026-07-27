import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  expectedReturnFor,
  fundedAmount,
  mockDocHash,
  mockTxHash,
  protocolFee,
  termDays,
} from "./format";
import { DEMO_WALLET_SHORT, USER_LENDER, createSeedState, uid } from "./seed";
import type {
  ActivityEvent,
  ActivityKind,
  Bid,
  BidSource,
  Invoice,
  MorrowState,
  Position,
  Role,
} from "./types";

const STORAGE_KEY = "morrow.demo.state.v3";

export interface CreateInvoiceInput {
  buyerName: string;
  buyerEmail: string;
  reference: string;
  description: string;
  industry: string;
  faceValue: number;
  issueDate: string;
  dueDate: string;
  poRef: string;
  advanceRequested: number;
  maxCostApr: number;
  auctionDurationHours: number;
  retentionPct: number;
}

export interface PlaceBidInput {
  invoiceId: string;
  amount: number;
  apr: number;
  maxDurationDays: number;
  source: BidSource;
}

interface MorrowContextValue {
  state: MorrowState;
  hydrated: boolean;
  setRole: (role: Role) => void;
  connectWallet: () => void;
  disconnectWallet: () => void;
  createInvoice: (input: CreateInvoiceInput) => { invoice: Invoice; txHash: string };
  acceptInvoice: (invoiceId: string) => string;
  rejectInvoice: (invoiceId: string) => void;
  openAuction: (invoiceId: string) => string;
  placeBid: (input: PlaceBidInput) => string;
  seedCompetingBid: (invoiceId: string) => void;
  finalizeAuction: (invoiceId: string) => { txHash: string; released: number };
  payInvoice: (invoiceId: string, amount: number) => { txHash: string; settled: boolean };
  markOverdue: (invoiceId: string) => void;
  advanceAuctionTimer: (invoiceId?: string) => void;
  fundWallet: (amount: number) => void;
  resetDemo: () => void;
  seedNewInvoice: () => Invoice;
  markNotificationsRead: () => void;
}

const MorrowContext = createContext<MorrowContextValue | null>(null);

function logEvent(
  state: MorrowState,
  kind: ActivityKind,
  title: string,
  invoiceRef: string,
  amount: number | null,
  txHash: string,
): ActivityEvent[] {
  const event: ActivityEvent = {
    id: uid("ev"),
    ts: new Date().toISOString(),
    kind,
    title,
    invoiceRef,
    amount,
    wallet: DEMO_WALLET_SHORT,
    status: "confirmed",
    txHash,
  };
  return [event, ...state.activity];
}

function replaceInvoice(state: MorrowState, invoice: Invoice): Invoice[] {
  return state.invoices.map((i) => (i.id === invoice.id ? invoice : i));
}

export function MorrowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MorrowState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MorrowState;
        if (parsed && parsed.version === 3) setState(parsed);
      }
    } catch {
      /* ignore corrupt state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const setRole = useCallback((role: Role) => setState((s) => ({ ...s, role })), []);

  const connectWallet = useCallback(() => setState((s) => ({ ...s, connected: true })), []);
  const disconnectWallet = useCallback(() => setState((s) => ({ ...s, connected: false })), []);
  const markNotificationsRead = useCallback(() => undefined, []);

  const createInvoice = useCallback((input: CreateInvoiceInput) => {
    const txHash = mockTxHash();
    const invoice: Invoice = {
      id: uid("inv"),
      ref: input.reference,
      sellerName: "Aster Studio",
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      description: input.description,
      industry: input.industry,
      faceValue: input.faceValue,
      advanceRequested: input.advanceRequested,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: "awaiting_buyer",
      riskCategory: "low-moderate",
      buyerRating: "AA",
      maxCostApr: input.maxCostApr,
      retentionPct: input.retentionPct,
      auctionDurationHours: input.auctionDurationHours,
      auctionEndsAt: null,
      bids: [],
      positions: [],
      clearingApr: null,
      advanceReleased: 0,
      amountPaid: 0,
      poRef: input.poRef,
      docHash: mockDocHash(),
      poHash: mockDocHash(),
      deliveryHash: mockDocHash(),
      acceptedAt: null,
      settledAt: null,
      createdAt: new Date().toISOString(),
      ownedByUserBusiness: true,
    };
    setState((s) => ({
      ...s,
      invoices: [invoice, ...s.invoices],
      activity: logEvent(
        s,
        "invoice",
        "Invoice issued to buyer",
        invoice.ref,
        invoice.faceValue,
        txHash,
      ),
    }));
    return { invoice, txHash };
  }, []);

  const acceptInvoice = useCallback((invoiceId: string) => {
    const txHash = mockTxHash();
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const updated: Invoice = {
        ...invoice,
        status: "buyer_accepted",
        acceptedAt: new Date().toISOString(),
      };
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        activity: logEvent(
          s,
          "invoice",
          "Buyer accepted receivable",
          updated.ref,
          updated.faceValue,
          txHash,
        ),
      };
    });
    return txHash;
  }, []);

  const rejectInvoice = useCallback((invoiceId: string) => {
    const txHash = mockTxHash();
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const updated: Invoice = { ...invoice, status: "rejected" };
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        activity: logEvent(s, "invoice", "Buyer rejected receivable", updated.ref, null, txHash),
      };
    });
  }, []);

  const openAuction = useCallback((invoiceId: string) => {
    const txHash = mockTxHash();
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const updated: Invoice = {
        ...invoice,
        status: "auction_live",
        auctionEndsAt: new Date(
          Date.now() + invoice.auctionDurationHours * 3_600_000,
        ).toISOString(),
      };
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        activity: logEvent(
          s,
          "auction",
          "Funding auction opened",
          updated.ref,
          updated.advanceRequested,
          txHash,
        ),
      };
    });
    return txHash;
  }, []);

  const placeBid = useCallback((input: PlaceBidInput) => {
    const txHash = mockTxHash();
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === input.invoiceId);
      if (!invoice) return s;
      const newBid: Bid = {
        id: uid("bid"),
        invoiceId: invoice.id,
        lenderName: USER_LENDER,
        amount: input.amount,
        apr: input.apr,
        maxDurationDays: input.maxDurationDays,
        source: input.source,
        createdAt: new Date().toISOString(),
        isUser: true,
      };
      const updated: Invoice = {
        ...invoice,
        status: invoice.status === "buyer_accepted" ? "auction_live" : invoice.status,
        auctionEndsAt:
          invoice.auctionEndsAt ??
          new Date(Date.now() + invoice.auctionDurationHours * 3_600_000).toISOString(),
        bids: [...invoice.bids, newBid],
      };
      const unified =
        input.source === "arc"
          ? s.unified
          : { ...s.unified, base: Math.max(0, s.unified.base - input.amount) };
      return {
        ...s,
        unified,
        balances: {
          ...s.balances,
          lender: Math.max(0, Math.round((s.balances.lender - input.amount) * 100) / 100),
        },
        invoices: replaceInvoice(s, updated),
        activity: logEvent(
          s,
          "funding",
          "Bid placed from your Arc wallet",
          updated.ref,
          input.amount,
          txHash,
        ),
      };
    });
    return txHash;
  }, []);

  const seedCompetingBid = useCallback((invoiceId: string) => {
    const txHash = mockTxHash();
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const remaining = Math.max(0, invoice.advanceRequested - fundedAmount(invoice));
      if (remaining <= 0) return s;
      const newBid: Bid = {
        id: uid("bid"),
        invoiceId: invoice.id,
        lenderName: "Cobalt Credit Fund",
        amount: Math.round(remaining * 100) / 100,
        apr: 8.6,
        maxDurationDays: 90,
        source: "arc",
        createdAt: new Date().toISOString(),
        isUser: false,
      };
      const updated: Invoice = { ...invoice, bids: [...invoice.bids, newBid] };
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        activity: logEvent(
          s,
          "funding",
          "Bid placed by Cobalt Credit Fund",
          updated.ref,
          newBid.amount,
          txHash,
        ),
      };
    });
  }, []);

  const finalizeAuction = useCallback((invoiceId: string) => {
    const txHash = mockTxHash();
    let released = 0;
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const days = termDays(invoice);
      const sorted = [...invoice.bids].sort((a, b) => a.apr - b.apr);
      const positions: Position[] = [];
      let allocated = 0;
      let weighted = 0;
      for (const b of sorted) {
        const room = invoice.advanceRequested - allocated;
        if (room <= 0.01) break;
        const principal = Math.round(Math.min(room, b.amount) * 100) / 100;
        allocated += principal;
        weighted += principal * b.apr;
        positions.push({
          id: uid("pos"),
          invoiceId: invoice.id,
          lenderName: b.lenderName,
          isUser: b.isUser,
          principal,
          apr: b.apr,
          expectedReturn: expectedReturnFor(principal, b.apr, days),
          status: "active",
          received: 0,
        });
      }
      released = Math.round(allocated * 100) / 100;
      const clearing = allocated > 0 ? Math.round((weighted / allocated) * 100) / 100 : null;
      const updated: Invoice = {
        ...invoice,
        status: "funded",
        positions,
        clearingApr: clearing,
        advanceReleased: released,
        auctionEndsAt: null,
      };
      const activity = [
        {
          id: uid("ev"),
          ts: new Date().toISOString(),
          kind: "funding" as const,
          title: "Advance released to business",
          invoiceRef: updated.ref,
          amount: released,
          wallet: DEMO_WALLET_SHORT,
          status: "confirmed" as const,
          txHash,
        },
        {
          id: uid("ev"),
          ts: new Date().toISOString(),
          kind: "auction" as const,
          title: `Auction finalized at ${clearing?.toFixed(2) ?? "—"}% APR`,
          invoiceRef: updated.ref,
          amount: null,
          wallet: DEMO_WALLET_SHORT,
          status: "confirmed" as const,
          txHash: mockTxHash(),
        },
        ...s.activity,
      ];
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        balances: {
          ...s.balances,
          business: Math.round((s.balances.business + released) * 100) / 100,
        },
        activity,
      };
    });
    return { txHash, released };
  }, []);

  const payInvoice = useCallback((invoiceId: string, amount: number) => {
    const txHash = mockTxHash();
    let settled = false;
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const paid = Math.round((invoice.amountPaid + amount) * 100) / 100;
      const isFull = paid >= invoice.faceValue - 0.01;
      settled = isFull;
      const fee = protocolFee(invoice);
      let lenderCredit = 0;
      let remainder = 0;
      let positions = invoice.positions;

      if (isFull) {
        positions = invoice.positions.map((p) => ({
          ...p,
          status: "settled" as const,
          received: Math.round((p.principal + p.expectedReturn) * 100) / 100,
        }));
        lenderCredit = positions.filter((p) => p.isUser).reduce((sum, p) => sum + p.received, 0);
        const lenderTotal = positions.reduce((sum, p) => sum + p.received, 0);
        remainder = Math.max(0, Math.round((invoice.faceValue - fee - lenderTotal) * 100) / 100);
      } else {
        const share = amount / invoice.faceValue;
        positions = invoice.positions.map((p) => ({
          ...p,
          status: "partially_repaid" as const,
          received: Math.round((p.received + (p.principal + p.expectedReturn) * share) * 100) / 100,
        }));
        lenderCredit = positions
          .filter((p) => p.isUser)
          .reduce((sum, p) => sum + (p.principal + p.expectedReturn) * share, 0);
        lenderCredit = Math.round(lenderCredit * 100) / 100;
      }

      const updated: Invoice = {
        ...invoice,
        amountPaid: paid,
        positions,
        status: isFull ? "settled" : "partially_repaid",
        settledAt: isFull ? new Date().toISOString() : null,
      };

      const events: ActivityEvent[] = [
        {
          id: uid("ev"),
          ts: new Date().toISOString(),
          kind: "payment",
          title: isFull ? "Buyer payment received in full" : "Partial buyer payment received",
          invoiceRef: updated.ref,
          amount,
          wallet: DEMO_WALLET_SHORT,
          status: "confirmed",
          txHash,
        },
      ];
      if (isFull) {
        events.unshift({
          id: uid("ev"),
          ts: new Date().toISOString(),
          kind: "settlement",
          title: "Settlement waterfall executed",
          invoiceRef: updated.ref,
          amount: invoice.faceValue,
          wallet: DEMO_WALLET_SHORT,
          status: "confirmed",
          txHash: mockTxHash(),
        });
      }

      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        balances: {
          business: Math.round((s.balances.business + remainder) * 100) / 100,
          lender: Math.round((s.balances.lender + lenderCredit) * 100) / 100,
          buyer: Math.round((s.balances.buyer - amount) * 100) / 100,
        },
        activity: [...events, ...s.activity],
      };
    });
    return { txHash, settled };
  }, []);

  const markOverdue = useCallback((invoiceId: string) => {
    setState((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return s;
      const updated: Invoice = {
        ...invoice,
        status: "overdue",
        dueDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        positions: invoice.positions.map((p) => ({ ...p, status: "overdue" as const })),
      };
      return {
        ...s,
        invoices: replaceInvoice(s, updated),
        activity: logEvent(s, "payment", "Invoice marked overdue", updated.ref, null, mockTxHash()),
      };
    });
  }, []);

  const advanceAuctionTimer = useCallback((invoiceId?: string) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) =>
        (invoiceId ? i.id === invoiceId : true) && i.auctionEndsAt
          ? { ...i, auctionEndsAt: new Date(Date.now() + 45_000).toISOString() }
          : i,
      ),
    }));
  }, []);

  const fundWallet = useCallback((amount: number) => {
    setState((s) => ({
      ...s,
      balances: { ...s.balances, lender: Math.round((s.balances.lender + amount) * 100) / 100 },
      unified: { ...s.unified, arc: s.unified.arc + amount },
      activity: logEvent(s, "funding", "Wallet funded with test USDC", "—", amount, mockTxHash()),
    }));
  }, []);

  const seedNewInvoice = useCallback(() => {
    const n = 2100 + Math.floor(Math.random() * 800);
    const face = 6_000 + Math.floor(Math.random() * 20) * 1_000;
    const invoice: Invoice = {
      id: uid("inv"),
      ref: `INV-${n}`,
      sellerName: "Aster Studio",
      buyerName: ["Northstar Labs", "Atlas Commerce", "Meridian Systems", "Orbit Freight"][
        Math.floor(Math.random() * 4)
      ],
      buyerEmail: "payables@example.com",
      description: "Seeded demo receivable",
      industry: "Software",
      faceValue: face,
      advanceRequested: Math.round(face * 0.92),
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 40 * 86_400_000).toISOString(),
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
      poRef: `PO-${10_000 + Math.floor(Math.random() * 80_000)}`,
      docHash: mockDocHash(),
      poHash: mockDocHash(),
      deliveryHash: mockDocHash(),
      acceptedAt: null,
      settledAt: null,
      createdAt: new Date().toISOString(),
      ownedByUserBusiness: true,
    };
    setState((s) => ({
      ...s,
      invoices: [invoice, ...s.invoices],
      activity: logEvent(
        s,
        "invoice",
        "Demo invoice seeded",
        invoice.ref,
        invoice.faceValue,
        mockTxHash(),
      ),
    }));
    return invoice;
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = createSeedState();
    setState({ ...fresh, connected: true });
  }, []);

  const value = useMemo<MorrowContextValue>(
    () => ({
      state,
      hydrated,
      setRole,
      connectWallet,
      disconnectWallet,
      createInvoice,
      acceptInvoice,
      rejectInvoice,
      openAuction,
      placeBid,
      seedCompetingBid,
      finalizeAuction,
      payInvoice,
      markOverdue,
      advanceAuctionTimer,
      fundWallet,
      resetDemo,
      seedNewInvoice,
      markNotificationsRead,
    }),
    [
      state,
      hydrated,
      setRole,
      connectWallet,
      disconnectWallet,
      createInvoice,
      acceptInvoice,
      rejectInvoice,
      openAuction,
      placeBid,
      seedCompetingBid,
      finalizeAuction,
      payInvoice,
      markOverdue,
      advanceAuctionTimer,
      fundWallet,
      resetDemo,
      seedNewInvoice,
      markNotificationsRead,
    ],
  );

  return <MorrowContext.Provider value={value}>{children}</MorrowContext.Provider>;
}

export function useMorrow(): MorrowContextValue {
  const ctx = useContext(MorrowContext);
  if (!ctx) throw new Error("useMorrow must be used inside MorrowProvider");
  return ctx;
}

export function useInvoice(id: string): Invoice | undefined {
  const { state } = useMorrow();
  return state.invoices.find((i) => i.id === id || i.ref.toLowerCase() === id.toLowerCase());
}
