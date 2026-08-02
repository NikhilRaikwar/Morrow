import { formatUnits, parseUnits } from "viem";

import { ARC_NATIVE_USDC_DECIMALS, ARC_USDC_DECIMALS } from "@/config/arc";

export type UsdcAmount = bigint & { readonly __brand: "UsdcAmount" };
export type NativeUsdcAmount = bigint & { readonly __brand: "NativeUsdcAmount" };

/** Parses human USDC into the canonical 6-decimal ERC-20 amount used by Morrow. */
export function parseUsdc(value: string): UsdcAmount {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error("Enter a non-negative USDC amount with at most 6 decimal places.");
  }
  return parseUnits(normalized, ARC_USDC_DECIMALS) as UsdcAmount;
}

export function formatUsdc(amount: bigint, maximumFractionDigits = 2) {
  const [whole, fraction = ""] = formatUnits(amount, ARC_USDC_DECIMALS).split(".");
  const trimmed = fraction.slice(0, maximumFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Explicit conversion only; native USDC is solely for gas/value accounting on Arc. */
export function usdcToNative(value: UsdcAmount): NativeUsdcAmount {
  return (value * 10n ** BigInt(ARC_NATIVE_USDC_DECIMALS - ARC_USDC_DECIMALS)) as NativeUsdcAmount;
}

export function nativeToUsdc(value: NativeUsdcAmount): UsdcAmount {
  const scale = 10n ** BigInt(ARC_NATIVE_USDC_DECIMALS - ARC_USDC_DECIMALS);
  if (value % scale !== 0n) {
    throw new Error("Native USDC value cannot be represented exactly in 6-decimal ERC-20 USDC.");
  }
  return (value / scale) as UsdcAmount;
}
