import {
  Error155106,
  Error155110,
  initiateUserControlledWalletsClient,
} from "@circle-fin/user-controlled-wallets";
import { formatUnits, getAddress, isAddress, keccak256, parseAbi, stringToHex } from "viem";
import { z } from "zod";

import { ARC_USDC_ADDRESS, ARC_USDC_DECIMALS, createArcPublicClient } from "@/config/arc";
import { getMorrowPublicConfig } from "@/config/env";

import { getCircleServerConfig } from "./config.server";

const uuid = () => crypto.randomUUID();

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

export async function createSocialDeviceToken(deviceId: string) {
  const result = await client().createDeviceTokenForSocialLogin({
    deviceId,
    idempotencyKey: uuid(),
  });
  const deviceToken = result.data?.deviceToken;
  const deviceEncryptionKey = result.data?.deviceEncryptionKey;
  if (!deviceToken || !deviceEncryptionKey) {
    throw new Error("Circle did not return social-login device credentials.");
  }
  return { deviceToken, deviceEncryptionKey };
}

export async function initializeSocialWallet(userToken: string) {
  try {
    const existing = await findCircleWallet(userToken);
    if (existing) return { wallet: existing };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: unknown }).code)
        : undefined;
    // A new social user is not initialized yet, so wallet reads return 155110.
    // All other lookup failures must stop here so a transient API error can
    // never create an accidental duplicate wallet.
    if (!(error instanceof Error155110) && code !== Error155110.code) throw error;
  }

  const config = getCircleServerConfig();
  if (!config.configured) throw new Error("Circle Wallets are not configured on this deployment.");
  const response = await fetch("https://api.circle.com/v1/w3s/user/initialize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "x-user-token": userToken,
      "x-request-id": uuid(),
    },
    body: JSON.stringify({
      idempotencyKey: uuid(),
      accountType: "EOA",
      blockchains: ["ARC-TESTNET"],
    }),
  });
  const payload = (await response.json()) as {
    data?: { challengeId?: string };
    code?: number;
    message?: string;
  };
  if (response.ok && payload.data?.challengeId) {
    return { challengeId: payload.data.challengeId };
  }
  if (payload.code !== Error155106.code) {
    const error = new Error(
      payload.message ?? "Circle social wallet initialization failed.",
    ) as Error & {
      code?: number;
    };
    error.code = payload.code;
    throw error;
  }

  // Circle returns 155106 when the social user is already initialized. Reuse
  // that user's existing Arc wallet instead of creating another wallet.
  return { wallet: await getCircleWallet(userToken) };
}

export async function getCircleWallet(userToken: string) {
  const wallet = await findCircleWallet(userToken);
  if (!wallet) throw new Error("No Arc Testnet wallet exists for this Circle user.");
  return wallet;
}

async function findCircleWallet(userToken: string) {
  const sdk = client();
  const wallets = await sdk.listWallets({
    userToken,
    blockchain: "ARC-TESTNET",
    pageSize: 50,
  });
  const wallet = (wallets.data?.wallets ?? [])
    .filter((candidate) => candidate.id && candidate.address && isAddress(candidate.address))
    .sort((left, right) => left.createDate.localeCompare(right.createDate))[0];
  if (!wallet) return null;

  const [balances, onchainBalance] = await Promise.all([
    sdk.getWalletTokenBalance({
      userToken,
      walletId: wallet.id,
      includeAll: true,
      tokenAddresses: [ARC_USDC_ADDRESS],
    }),
    createArcPublicClient()
      .readContract({
        address: ARC_USDC_ADDRESS,
        abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
        functionName: "balanceOf",
        args: [getAddress(wallet.address)],
      })
      .catch(() => null),
  ]);
  return {
    walletId: wallet.id,
    address: getAddress(wallet.address),
    blockchain: wallet.blockchain ?? "ARC-TESTNET",
    balances: balances.data?.tokenBalances ?? [],
    usdcBalance: onchainBalance === null ? null : formatUnits(onchainBalance, ARC_USDC_DECIMALS),
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
  intentId: string,
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
    idempotencyKey: intentId,
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

export async function getCircleChallenge(userToken: string, challengeId: string) {
  const result = await client().getUserChallenge({ userToken, challengeId });
  return result.data?.challenge ?? null;
}
