import { decodeEventLog, type Address } from "viem";

import { ARC_USDC_DECIMALS, createArcPublicClient } from "@/config/arc";
import type { MorrowPublicConfig } from "@/config/env";
import { morrowMarketAbi } from "@/contracts/morrowMarket";

import type { ActivityEvent, Bid, Invoice, InvoiceStatus, Position } from "./types";

const UNITS = 10 ** ARC_USDC_DECIMALS;
const asNumber = (value: bigint) => Number(value) / UNITS;
const addressLabel = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const iso = (seconds: bigint) => new Date(Number(seconds) * 1_000).toISOString();

function mapStatus(status: number, dueDate: bigint, totalLenderPaid: bigint): InvoiceStatus {
  if (status === 1) return "awaiting_buyer";
  if (status === 2) return "buyer_accepted";
  if (status === 3 || status === 7) return "rejected";
  if (status === 4) return "auction_live";
  if (status === 5) return totalLenderPaid > 0n ? "partially_repaid" : "funded";
  if (status === 6) return "settled";
  return dueDate * 1_000n < BigInt(Date.now()) ? "overdue" : "funded";
}

/** Reads only Arc contract state and emitted events. No browser demo data is used. */
export async function readArcMarket(config: MorrowPublicConfig, viewer?: string) {
  if (!config.marketAddress) throw new Error("MorrowMarket address is not configured.");
  const client = createArcPublicClient(config.arcRpcUrl);
  const latest = await client.getBlockNumber();
  const fromBlock = latest > 9_999n ? latest - 9_999n : 0n;
  const logs = await client.getLogs({
    address: config.marketAddress,
    fromBlock,
    toBlock: latest,
  });
  const events = logs.flatMap((log) => {
    try {
      return [
        { ...decodeEventLog({ abi: morrowMarketAbi, data: log.data, topics: log.topics }), log },
      ];
    } catch {
      return [];
    }
  });
  const created = events.filter((event) => event.eventName === "ReceivableCreated");
  const blockTimes = new Map<bigint, string>();
  await Promise.all(
    [
      ...new Set(
        created.map((event) => event.log.blockNumber).filter((n): n is bigint => n != null),
      ),
    ].map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      blockTimes.set(blockNumber, new Date(Number(block.timestamp) * 1_000).toISOString());
    }),
  );

  const invoices = await Promise.all(
    created.map(async (event) => {
      const id = event.args.receivableId as bigint;
      const result = await client.readContract({
        address: config.marketAddress!,
        abi: morrowMarketAbi,
        functionName: "getReceivable",
        args: [id],
      });
      const {
        seller,
        buyer,
        documentDigest: digest,
        dueDate,
        auctionDeadline,
        maxAprBps,
        status,
        faceValue,
        advanceRequested,
        totalEscrowed,
        fundedPrincipal,
        totalLenderDue,
        totalLenderPaid,
        totalRepaid,
      } = result;
      const bidCount = await client.readContract({
        address: config.marketAddress!,
        abi: morrowMarketAbi,
        functionName: "getBidCount",
        args: [id],
      });
      const rawBids = bidCount
        ? await client.readContract({
            address: config.marketAddress!,
            abi: morrowMarketAbi,
            functionName: "getBids",
            args: [id, 0n, bidCount],
          })
        : [];
      const bids: Bid[] = rawBids.map((bid, index) => ({
        id: `${id}-${index}`,
        invoiceId: id.toString(),
        lenderName: addressLabel(bid.lender),
        amount: asNumber(bid.amount),
        apr: Number(bid.aprBps) / 100,
        maxDurationDays: Math.max(
          1,
          Math.ceil((Number(dueDate) * 1_000 - Date.now()) / 86_400_000),
        ),
        source: "arc",
        createdAt: iso(bid.placedAt),
        isUser: viewer?.toLowerCase() === bid.lender.toLowerCase(),
      }));
      const lenderClaims = await Promise.all(
        [...new Set(rawBids.map((bid) => bid.lender.toLowerCase()))].map(async (lender) => {
          const claim = await client.readContract({
            address: config.marketAddress!,
            abi: morrowMarketAbi,
            functionName: "getClaim",
            args: [id, lender as Address],
          });
          return { lender, claim };
        }),
      );
      const positions: Position[] = lenderClaims
        .filter(({ claim }) => claim.principal > 0n)
        .map(({ lender, claim }) => {
          const correspondingBid = rawBids.find((bid) => bid.lender.toLowerCase() === lender);
          return {
            id: `${id}-${lender}`,
            invoiceId: id.toString(),
            lenderName: addressLabel(lender),
            isUser: viewer?.toLowerCase() === lender,
            principal: asNumber(claim.principal),
            apr: correspondingBid ? Number(correspondingBid.aprBps) / 100 : 0,
            expectedReturn: asNumber(claim.yield),
            received: asNumber(claim.paid),
            status: status === 6 ? "settled" : totalLenderPaid > 0n ? "partially_repaid" : "active",
          };
        });
      const createdAt = event.log.blockNumber
        ? (blockTimes.get(event.log.blockNumber) ?? new Date().toISOString())
        : new Date().toISOString();
      const invoice: Invoice = {
        id: id.toString(),
        ref: `ARC-${id}`,
        sellerName: addressLabel(seller),
        buyerName: addressLabel(buyer),
        sellerAddress: seller,
        buyerAddress: buyer,
        buyerEmail: "",
        description: `Onchain receivable · digest ${digest.slice(0, 12)}…`,
        industry: "",
        faceValue: asNumber(faceValue),
        advanceRequested: asNumber(advanceRequested),
        issueDate: createdAt,
        dueDate: iso(dueDate),
        status: mapStatus(Number(status), dueDate, totalLenderPaid),
        riskCategory: null,
        buyerRating: null,
        maxCostApr: Number(maxAprBps) / 100,
        retentionPct: faceValue
          ? Math.max(0, (1 - Number(advanceRequested) / Number(faceValue)) * 100)
          : 0,
        auctionDurationHours:
          auctionDeadline > 0n
            ? Math.max(
                0,
                Math.round(
                  (Number(auctionDeadline) * 1_000 - new Date(createdAt).getTime()) / 3_600_000,
                ),
              )
            : 0,
        auctionEndsAt: auctionDeadline > 0n ? iso(auctionDeadline) : null,
        bids,
        positions,
        clearingApr: fundedPrincipal
          ? bids.reduce((total, bid) => total + bid.amount * bid.apr, 0) /
            Math.max(
              1,
              bids.reduce((total, bid) => total + bid.amount, 0),
            )
          : null,
        advanceReleased: asNumber(fundedPrincipal),
        amountPaid: asNumber(totalRepaid),
        poRef: "",
        docHash: digest,
        poHash: digest,
        deliveryHash: digest,
        acceptedAt: null,
        settledAt: status === 6 ? new Date().toISOString() : null,
        createdAt,
        ownedByUserBusiness: viewer?.toLowerCase() === seller.toLowerCase(),
      };
      void totalEscrowed;
      void totalLenderDue;
      return invoice;
    }),
  );
  const activity: ActivityEvent[] = events
    .map((event) => {
      const args = event.args as Record<string, unknown>;
      const id = (args.receivableId as bigint | undefined)?.toString() ?? "—";
      const mapping: Record<string, [ActivityEvent["kind"], string, bigint | null]> = {
        ReceivableCreated: ["invoice", "Receivable created on Arc", args.faceValue as bigint],
        ReceivableAccepted: ["invoice", "Buyer accepted receivable", null],
        ReceivableRejected: ["invoice", "Buyer rejected receivable", null],
        AuctionOpened: ["auction", "Funding auction opened", null],
        BidPlaced: ["funding", "USDC bid escrowed", args.amount as bigint],
        AuctionFinalized: [
          "auction",
          "Auction finalized; advance released",
          args.advancePaid as bigint,
        ],
        RepaymentReceived: ["payment", "Buyer repayment received", args.amount as bigint],
        ClaimPaid: ["settlement", "Lender claim paid", args.amount as bigint],
        SellerRemainderPaid: ["settlement", "Seller remainder paid", args.amount as bigint],
        ReceivableSettled: ["settlement", "Receivable settled", null],
        BidRefunded: ["funding", "Unused bid refunded", args.amount as bigint],
        ReceivableCancelled: ["invoice", "Receivable cancelled", null],
        BidAllocated: ["auction", "Bid allocated", args.principal as bigint],
      };
      const [kind, title, amount] = mapping[event.eventName] ?? ["invoice", event.eventName, null];
      return {
        id: `${event.log.transactionHash}-${event.log.logIndex}`,
        ts: event.log.blockNumber
          ? (blockTimes.get(event.log.blockNumber) ?? new Date().toISOString())
          : new Date().toISOString(),
        kind,
        title,
        invoiceRef: `ARC-${id}`,
        amount: amount == null ? null : asNumber(amount),
        wallet: "Arc Testnet",
        status: "confirmed",
        txHash: event.log.transactionHash,
      };
    })
    .sort((a, b) => b.ts.localeCompare(a.ts));
  return { invoices: invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), activity };
}
