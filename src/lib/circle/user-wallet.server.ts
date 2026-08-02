import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";
import { getAddress, isAddress, keccak256, stringToHex } from "viem";
import { z } from "zod";

import { ARC_USDC_ADDRESS } from "@/config/arc";
import { getMorrowPublicConfig } from "@/config/env";

import { getCircleServerConfig } from "./config.server";

const uuid = () => crypto.randomUUID();

export type CircleWalletSession = {
  userId: string;
  userToken: string;
  encryptionKey: string;
  walletId?: string;
  address?: `0x${string}`;
  challengeId?: string;
};

export const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approveUsdc"),
    amount: z.string().regex(/^\d+$/),
  }),
  z.object({ action: z.literal("acceptReceivable"), receivableId: z.string().regex(/^\d+$/) }),
  z.object({ action: z.literal("rejectReceivable"), receivableId: z.string().regex(/^\d+$/) }),
  z.object({
    action: z.literal("createReceivable"),
    buyer: z.string().refine(isAddress, "Buyer must be an address"),
    documentText: z.string().min(1).max(2_000),
    faceValue: z.string().regex(/^\d+$/),
    advanceRequested: z.string().regex(/^\d+$/),
    dueDate: z.string().regex(/^\d+$/),
    maxAprBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    action: z.literal("openAuction"),
    receivableId: z.string().regex(/^\d+$/),
    auctionDeadline: z.string().regex(/^\d+$/),
  }),
  z.object({
    action: z.literal("placeBid"),
    receivableId: z.string().regex(/^\d+$/),
    amount: z.string().regex(/^\d+$/),
    aprBps: z.number().int().min(0).max(10_000),
  }),
  z.object({ action: z.literal("finalizeAuction"), receivableId: z.string().regex(/^\d+$/) }),
  z.object({
    action: z.literal("cancelUnfilledAuction"),
    receivableId: z.string().regex(/^\d+$/),
  }),
  z.object({
    action: z.literal("claimBidRefund"),
    receivableId: z.string().regex(/^\d+$/),
    bidIndex: z.string().regex(/^\d+$/),
  }),
  z.object({
    action: z.literal("repay"),
    receivableId: z.string().regex(/^\d+$/),
    amount: z.string().regex(/^\d+$/),
  }),
]);

export type MorrowCircleAction = z.infer<typeof actionSchema>;

function client() {
  const config = getCircleServerConfig();
  if (!config.configured) throw new Error("Circle Wallets are not configured on this deployment.");
  return initiateUserControlledWalletsClient({ apiKey: config.apiKey });
}

function marketAddress() {
  const config = getMorrowPublicConfig();
  if (config.mode !== "arc" || !config.marketAddress) {
    throw new Error("Live Arc mode and VITE_MORROW_MARKET_ADDRESS are required.");
  }
  return config.marketAddress;
}

export async function beginCircleWallet(userId: string): Promise<CircleWalletSession> {
  const sdk = client();
  try {
    await sdk.createUser({ userId, idempotencyKey: uuid() });
  } catch (error) {
    // Circle returns a conflict for an existing user. Fetching a token below is
    // authoritative and prevents account enumeration in the browser response.
    console.info("Circle user already exists or create was rejected", { requestId: uuid() });
  }

  const token = await sdk.createUserToken({ userId });
  const userToken = token.data?.userToken;
  const encryptionKey = token.data?.encryptionKey;
  if (!userToken || !encryptionKey) throw new Error("Circle did not return a user session.");

  const wallets = await sdk.listWallets({ userToken, blockchain: "ARC-TESTNET" });
  const wallet = (wallets.data?.wallets ?? [])[0] as { id?: string; address?: string } | undefined;
  if (wallet?.id && wallet.address && isAddress(wallet.address)) {
    return {
      userId,
      userToken,
      encryptionKey,
      walletId: wallet.id,
      address: getAddress(wallet.address),
    };
  }

  const setup = await sdk.createUserPinWithWallets({
    userToken,
    blockchains: ["ARC-TESTNET"],
    accountType: "EOA",
    idempotencyKey: uuid(),
  });
  if (!setup.data?.challengeId) throw new Error("Circle did not return a wallet setup challenge.");
  return { userId, userToken, encryptionKey, challengeId: setup.data.challengeId };
}

export async function getCircleWallet(userToken: string) {
  const sdk = client();
  const wallets = await sdk.listWallets({ userToken, blockchain: "ARC-TESTNET" });
  const wallet = (wallets.data?.wallets ?? [])[0] as
    { id?: string; address?: string; blockchain?: string } | undefined;
  if (!wallet?.id || !wallet.address || !isAddress(wallet.address))
    throw new Error("No Arc Testnet wallet exists for this Circle user.");

  const balances = await sdk.getWalletTokenBalance({
    userToken,
    walletId: wallet.id,
    includeAll: true,
  });
  return {
    walletId: wallet.id,
    address: getAddress(wallet.address),
    blockchain: wallet.blockchain ?? "ARC-TESTNET",
    balances: balances.data?.tokenBalances ?? [],
  };
}

function contractCall(action: MorrowCircleAction) {
  const market = marketAddress();
  switch (action.action) {
    case "approveUsdc":
      return {
        contractAddress: ARC_USDC_ADDRESS,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [market, action.amount],
      };
    case "createReceivable":
      return {
        contractAddress: market,
        abiFunctionSignature: "createReceivable(address,bytes32,uint256,uint256,uint64,uint16)",
        abiParameters: [
          getAddress(action.buyer),
          keccak256(stringToHex(action.documentText)),
          action.faceValue,
          action.advanceRequested,
          action.dueDate,
          action.maxAprBps,
        ],
      };
    case "acceptReceivable":
    case "rejectReceivable":
    case "finalizeAuction":
    case "cancelUnfilledAuction":
      return {
        contractAddress: market,
        abiFunctionSignature: `${action.action}(uint256)`,
        abiParameters: [action.receivableId],
      };
    case "openAuction":
      return {
        contractAddress: market,
        abiFunctionSignature: "openAuction(uint256,uint64)",
        abiParameters: [action.receivableId, action.auctionDeadline],
      };
    case "placeBid":
      return {
        contractAddress: market,
        abiFunctionSignature: "placeBid(uint256,uint256,uint16)",
        abiParameters: [action.receivableId, action.amount, action.aprBps],
      };
    case "claimBidRefund":
      return {
        contractAddress: market,
        abiFunctionSignature: "claimBidRefund(uint256,uint256)",
        abiParameters: [action.receivableId, action.bidIndex],
      };
    case "repay":
      return {
        contractAddress: market,
        abiFunctionSignature: "repay(uint256,uint256)",
        abiParameters: [action.receivableId, action.amount],
      };
  }
}

export async function createMorrowChallenge(
  userToken: string,
  walletId: string,
  action: MorrowCircleAction,
) {
  const sdk = client();
  const call = contractCall(action);
  const fee = { type: "level" as const, config: { feeLevel: "MEDIUM" as const } };
  const estimate = await sdk.estimateContractExecutionFee({
    ...call,
    source: { walletId },
    userToken,
  });
  const challenge = await sdk.createUserTransactionContractExecutionChallenge({
    ...call,
    walletId,
    userToken,
    idempotencyKey: uuid(),
    fee,
  });
  if (!challenge.data?.challengeId)
    throw new Error("Circle did not return a contract approval challenge.");
  return { challengeId: challenge.data.challengeId, estimate: estimate.data ?? null };
}

export async function getCircleTransaction(userToken: string, transactionId: string) {
  const result = await client().getTransaction({ userToken, id: transactionId });
  return result.data?.transaction ?? null;
}
