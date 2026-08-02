import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseUnits } from "viem";

import { ARC_USDC_DECIMALS } from "@/config/arc";
import { getMorrowPublicConfig } from "@/config/env";
import { useCircleWallet } from "@/lib/circle/wallet-context";
import type { MorrowCircleAction } from "@/lib/circle/user-wallet.server";

import { readArcMarket } from "./arc-adapter";
import type { BidSource, Invoice, MorrowState, Role } from "./types";

const EMPTY_STATE: MorrowState = {
  version: 5,
  role: "business",
  connected: false,
  walletAddress: "",
  balances: { business: 0, lender: 0, buyer: 0 },
  unified: { base: 0, ethereum: 0, arc: 0 },
  invoices: [],
  activity: [],
};
type CircleBalance = {
  amount?: string | number;
  tokenAmount?: string | number;
  symbol?: string;
  token?: { symbol?: string; decimals?: number };
};
const config = getMorrowPublicConfig();
const units = (value: number) => parseUnits(String(value), ARC_USDC_DECIMALS).toString();

export interface CreateInvoiceInput {
  buyerAddress: string;
  reference: string;
  description: string;
  faceValue: number;
  dueDate: string;
  advanceRequested: number;
  maxCostApr: number;
  auctionDurationHours: number;
}
export interface PlaceBidInput {
  invoiceId: string;
  amount: number;
  apr: number;
  maxDurationDays: number;
  source: BidSource;
}
type TxResult = { txHash?: string };

interface MorrowContextValue {
  state: MorrowState;
  hydrated: boolean;
  refresh: () => Promise<void>;
  setRole: (role: Role) => void;
  connectWallet: () => void;
  disconnectWallet: () => void;
  createInvoice: (input: CreateInvoiceInput) => Promise<TxResult>;
  acceptInvoice: (id: string) => Promise<TxResult>;
  rejectInvoice: (id: string) => Promise<TxResult>;
  openAuction: (id: string) => Promise<TxResult>;
  placeBid: (input: PlaceBidInput) => Promise<TxResult>;
  finalizeAuction: (id: string) => Promise<TxResult>;
  payInvoice: (id: string, amount: number) => Promise<TxResult>;
  cancelUnfilledAuction: (id: string) => Promise<TxResult>;
  claimBidRefund: (id: string, bidIndex: number) => Promise<TxResult>;
  markNotificationsRead: () => void;
}
const MorrowContext = createContext<MorrowContextValue | null>(null);

export function MorrowProvider({ children }: { children: ReactNode }) {
  const wallet = useCircleWallet();
  const [state, setState] = useState<MorrowState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const refresh = useCallback(async () => {
    const data = await readArcMarket(config, wallet.session?.address);
    const usdc = wallet.session?.balances.find(
      (item: CircleBalance) =>
        String(item.token?.symbol ?? item.symbol ?? "").toUpperCase() === "USDC",
    );
    const balance =
      Number(usdc?.amount ?? usdc?.tokenAmount ?? 0) /
      (usdc?.token?.decimals === 6 ? 1 : 1_000_000);
    setState((current) => ({
      ...current,
      connected: Boolean(wallet.session),
      walletAddress: wallet.session?.address ?? "",
      balances: { business: balance, lender: balance, buyer: balance },
      unified: { base: 0, ethereum: 0, arc: balance },
      invoices: data.invoices,
      activity: data.activity,
    }));
  }, [wallet.session]);
  useEffect(() => {
    setHydrated(true);
    void refresh().catch(console.error);
  }, [refresh]);
  useEffect(() => {
    const id = window.setInterval(() => void refresh().catch(console.error), 12_000);
    return () => window.clearInterval(id);
  }, [refresh]);
  const run = useCallback(
    async (action: MorrowCircleAction) => {
      const result = await wallet.execute(action);
      await new Promise((resolve) => window.setTimeout(resolve, 1_500));
      await refresh();
      return result;
    },
    [refresh, wallet],
  );
  const setRole = useCallback((role: Role) => setState((current) => ({ ...current, role })), []);
  const find = useCallback(
    (id: string) => state.invoices.find((invoice) => invoice.id === id),
    [state.invoices],
  );
  const createInvoice = useCallback(
    async (input: CreateInvoiceInput) =>
      run({
        action: "createReceivable",
        buyer: input.buyerAddress,
        documentText: JSON.stringify({
          reference: input.reference,
          description: input.description,
        }),
        faceValue: units(input.faceValue),
        advanceRequested: units(input.advanceRequested),
        dueDate: String(Math.floor(new Date(input.dueDate).getTime() / 1_000)),
        maxAprBps: Math.round(input.maxCostApr * 100),
      }),
    [run],
  );
  const acceptInvoice = useCallback(
    (id: string) => run({ action: "acceptReceivable", receivableId: id }),
    [run],
  );
  const rejectInvoice = useCallback(
    (id: string) => run({ action: "rejectReceivable", receivableId: id }),
    [run],
  );
  const openAuction = useCallback(
    (id: string) => {
      const invoice = find(id);
      if (!invoice) return Promise.reject(new Error("Receivable not found on Arc."));
      const deadline =
        Math.floor(Date.now() / 1_000) + Math.max(1, invoice.auctionDurationHours || 24) * 3_600;
      return run({ action: "openAuction", receivableId: id, auctionDeadline: String(deadline) });
    },
    [find, run],
  );
  const placeBid = useCallback(
    async (input: PlaceBidInput) => {
      if (input.source !== "arc") throw new Error("Only confirmed Arc USDC can fund a live bid.");
      await run({ action: "approveUsdc", amount: units(input.amount) });
      return run({
        action: "placeBid",
        receivableId: input.invoiceId,
        amount: units(input.amount),
        aprBps: Math.round(input.apr * 100),
      });
    },
    [run],
  );
  const finalizeAuction = useCallback(
    (id: string) => run({ action: "finalizeAuction", receivableId: id }),
    [run],
  );
  const payInvoice = useCallback(
    async (id: string, amount: number) => {
      await run({ action: "approveUsdc", amount: units(amount) });
      return run({ action: "repay", receivableId: id, amount: units(amount) });
    },
    [run],
  );
  const cancelUnfilledAuction = useCallback(
    (id: string) => run({ action: "cancelUnfilledAuction", receivableId: id }),
    [run],
  );
  const claimBidRefund = useCallback(
    (id: string, bidIndex: number) =>
      run({ action: "claimBidRefund", receivableId: id, bidIndex: String(bidIndex) }),
    [run],
  );
  const value = useMemo<MorrowContextValue>(
    () => ({
      state,
      hydrated,
      refresh,
      setRole,
      connectWallet: () => undefined,
      disconnectWallet: wallet.disconnect,
      createInvoice,
      acceptInvoice,
      rejectInvoice,
      openAuction,
      placeBid,
      finalizeAuction,
      payInvoice,
      cancelUnfilledAuction,
      claimBidRefund,
      markNotificationsRead: () => undefined,
    }),
    [
      acceptInvoice,
      cancelUnfilledAuction,
      claimBidRefund,
      createInvoice,
      finalizeAuction,
      hydrated,
      openAuction,
      payInvoice,
      placeBid,
      refresh,
      rejectInvoice,
      setRole,
      state,
      wallet.disconnect,
    ],
  );
  return <MorrowContext.Provider value={value}>{children}</MorrowContext.Provider>;
}
export function useMorrow() {
  const context = useContext(MorrowContext);
  if (!context) throw new Error("useMorrow must be used inside MorrowProvider");
  return context;
}
export function useInvoice(id: string): Invoice | undefined {
  return useMorrow().state.invoices.find(
    (invoice) => invoice.id === id || invoice.ref.toLowerCase() === id.toLowerCase(),
  );
}
