import { createPublicClient, defineChain, http, type Address } from "viem";

/** Arc Testnet identifiers verified against the official Arc documentation. */
export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.io";
export const ARCSCAN_TESTNET_URL = "https://testnet.arcscan.app";

/**
 * Arc has one USDC balance with two interfaces. Morrow uses this ERC-20
 * interface exclusively for application transfers and allowances.
 */
export const ARC_USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const satisfies Address;
export const ARC_USDC_DECIMALS = 6;
export const ARC_NATIVE_USDC_DECIMALS = 18;
export const ARC_WALLET_DISPLAY_DECIMALS = 6;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: ARC_WALLET_DISPLAY_DECIMALS,
  },
  rpcUrls: {
    default: { http: [ARC_TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARCSCAN_TESTNET_URL },
  },
  testnet: true,
});

export function createArcPublicClient(rpcUrl = ARC_TESTNET_RPC_URL) {
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) });
}

export function arcscanTransactionUrl(hash: `0x${string}`) {
  return `${ARCSCAN_TESTNET_URL}/tx/${hash}`;
}

export function arcscanAddressUrl(address: Address) {
  return `${ARCSCAN_TESTNET_URL}/address/${address}`;
}
