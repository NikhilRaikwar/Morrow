import { getAddress, isAddress } from "viem";
import { z } from "zod";

import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URL } from "./arc";

const modeSchema = z.enum(["mock", "arc"]).default("mock");

const publicEnvironmentSchema = z.object({
  VITE_MORROW_MODE: modeSchema,
  VITE_ARC_RPC_URL: z.string().url().default(ARC_TESTNET_RPC_URL),
  VITE_ARC_CHAIN_ID: z.coerce.number().int().default(ARC_TESTNET_CHAIN_ID),
  VITE_MORROW_MARKET_ADDRESS: z.string().optional(),
});

export type MorrowPublicConfig = {
  mode: "mock" | "arc";
  arcRpcUrl: string;
  arcChainId: number;
  marketAddress?: `0x${string}`;
};

/**
 * Parses only browser-safe values. Server-only Circle credentials deliberately
 * never appear here and must not use the VITE_ prefix.
 */
export function getMorrowPublicConfig(
  source: Record<string, unknown> = import.meta.env,
): MorrowPublicConfig {
  const parsed = publicEnvironmentSchema.parse(source);

  if (parsed.VITE_ARC_CHAIN_ID !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(
      `Morrow real mode supports Arc Testnet only (expected chain ${ARC_TESTNET_CHAIN_ID}, received ${parsed.VITE_ARC_CHAIN_ID}).`,
    );
  }

  if (parsed.VITE_MORROW_MODE === "mock") {
    return {
      mode: "mock",
      arcRpcUrl: parsed.VITE_ARC_RPC_URL,
      arcChainId: parsed.VITE_ARC_CHAIN_ID,
    };
  }

  if (!parsed.VITE_MORROW_MARKET_ADDRESS || !isAddress(parsed.VITE_MORROW_MARKET_ADDRESS)) {
    throw new Error(
      "VITE_MORROW_MARKET_ADDRESS must be a valid deployed MorrowMarket address when VITE_MORROW_MODE=arc.",
    );
  }

  return {
    mode: "arc",
    arcRpcUrl: parsed.VITE_ARC_RPC_URL,
    arcChainId: parsed.VITE_ARC_CHAIN_ID,
    marketAddress: getAddress(parsed.VITE_MORROW_MARKET_ADDRESS),
  };
}

/** Runs before a live UI is enabled: an empty/non-contract address is unsafe. */
export async function assertLiveMarketDeployment(config = getMorrowPublicConfig()) {
  if (config.mode !== "arc" || !config.marketAddress) return;

  const { createArcPublicClient } = await import("./arc");
  const code = await createArcPublicClient(config.arcRpcUrl).getCode({
    address: config.marketAddress,
  });

  if (!code || code === "0x") {
    throw new Error(
      `No deployed contract bytecode exists at ${config.marketAddress} on Arc Testnet.`,
    );
  }
}
