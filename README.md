<p align="center">
  <img src="./public/morrow-banner.svg" alt="Morrow - stablecoin-native receivables credit on Arc" width="100%" />
</p>

<h1 align="center">Morrow</h1>

<p align="center"><strong>Buyer-accepted invoices become programmable USDC credit on Arc.</strong></p>

<p align="center">
  <a href="https://morrow.nikhilraikwar.me"><img src="https://img.shields.io/badge/Live-Morrow-2563EB?style=flat-square" alt="Live demo" /></a>
  <a href="https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D"><img src="https://img.shields.io/badge/Arc%20Testnet-5042002-111827?style=flat-square" alt="Arc Testnet" /></a>
  <a href="https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D"><img src="https://img.shields.io/badge/Contract-Verified-16A34A?style=flat-square" alt="Verified contract" /></a>
  <img src="https://img.shields.io/badge/Settlement-USDC-2775CA?style=flat-square" alt="USDC settlement" />
  <img src="https://img.shields.io/badge/Wallets-Circle%20User--Controlled-7C3AED?style=flat-square" alt="Circle user-controlled wallets" />
  <img src="https://img.shields.io/badge/License-MIT-111827?style=flat-square" alt="MIT license" />
</p>

> Morrow is an unaudited Arc Testnet prototype. It is not an investment product, credit offer, broker, lender, or production underwriting system.

## What Morrow Does

Morrow turns a confirmed B2B invoice into a transparent USDC funding market.

A business creates a receivable for money a buyer already owes. The buyer accepts the obligation onchain. Lenders compete to advance USDC at the lowest APR. When the buyer pays later, the smart contract distributes one deterministic settlement waterfall: protocol fee, lender claims, then the remaining business proceeds.

This makes receivables finance look like internet-native infrastructure instead of email threads, opaque factoring quotes, and manual reconciliation.

## Why This Belongs On Arc

Arc is stablecoin-native: USDC is the gas token and the primary money layer. Morrow uses that directly:

- Receivable face values, advances, bids, repayments, and fees are all denominated in USDC.
- Circle user-controlled wallets give businesses, buyers, and lenders Google-based onboarding with explicit transaction approvals.
- Arc contract events are the source of truth for public market listings and dashboard state.
- Canonical Arc ERC-20 USDC at `0x3600000000000000000000000000000000000000` is used for application-level transfers, approvals, escrow, and repayment.

## Product Flow

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#dbeafe","primaryTextColor":"#0f172a","primaryBorderColor":"#2563eb","secondaryColor":"#dcfce7","tertiaryColor":"#fef3c7","lineColor":"#64748b","fontFamily":"Inter, Arial"}}}%%
flowchart LR
  business["Business<br/>creates receivable"]:::actor --> contract["MorrowMarket<br/>terms + document digest"]:::contract
  contract --> buyer["Buyer<br/>accepts obligation"]:::actor
  buyer --> auction["Funding auction<br/>lowest APR clears first"]:::auction
  lenders["Lenders<br/>approve + bid USDC"]:::actor --> auction
  auction --> advance["Advance released<br/>to business"]:::money
  repayment["Buyer repays<br/>USDC"]:::money --> waterfall["Settlement waterfall"]:::contract
  waterfall --> fee["Protocol fee"]:::money
  waterfall --> claims["Lender principal + return"]:::money
  waterfall --> remainder["Business remainder"]:::money

  classDef actor fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef contract fill:#111827,stroke:#2563eb,color:#ffffff;
  classDef auction fill:#fef3c7,stroke:#d97706,color:#111827;
  classDef money fill:#dcfce7,stroke:#16a34a,color:#052e16;
```

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#e0e7ff","primaryTextColor":"#111827","primaryBorderColor":"#4f46e5","secondaryColor":"#dcfce7","tertiaryColor":"#fee2e2","lineColor":"#64748b","fontFamily":"Inter, Arial"}}}%%
stateDiagram-v2
  [*] --> AwaitingBuyer: createReceivable
  AwaitingBuyer --> BuyerAccepted: acceptReceivable
  AwaitingBuyer --> Rejected: reject or cancel
  BuyerAccepted --> AuctionLive: openAuction
  AuctionLive --> Funded: finalizeAuction
  AuctionLive --> Cancelled: cancelUnfilledAuction
  Funded --> PartiallyRepaid: partial repay
  PartiallyRepaid --> Settled: final repay
  Funded --> Settled: full repay
```

## Live Proof

| Item | Current status |
| --- | --- |
| Live app | [morrow.nikhilraikwar.me](https://morrow.nikhilraikwar.me) |
| Network | Arc Testnet, chain ID `5042002` |
| Contract | [`0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D`](https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D) |
| Deployment tx | [`0xac94f5841769b13a59c1ad974b95bf3e5536cc3b73906bbd0688ff0ce282ac2e`](https://testnet.arcscan.app/tx/0xac94f5841769b13a59c1ad974b95bf3e5536cc3b73906bbd0688ff0ce282ac2e) |
| Settlement asset | Arc canonical ERC-20 USDC, 6 decimals |
| Wallet flow | Circle user-controlled wallets with social login and confirmation challenges |
| Market data | Read from Arc RPC and decoded MorrowMarket events |

## Demo Path

1. Open the landing page and show the illustrative invoice-to-settlement walkthrough.
2. Open the public market to show walletless, read-only Arc contract data.
3. Sign in with Google through Circle and enter the business workspace.
4. Create a 10 USDC receivable with the buyer's Arc wallet address.
5. In a second browser profile, sign in as the buyer and accept the invoice.
6. Return as the business and open the funding auction.
7. In lender profiles, approve USDC and place bids.
8. Finalize the auction, then repay from the buyer wallet and show the settlement waterfall.
9. Open Arcscan links to prove the transactions are real Arc Testnet actions.

## Security Model

Morrow separates the trust boundary clearly:

- The browser requests named actions, not arbitrary calldata.
- The server maps each action to an allowlisted contract address and ABI function.
- Circle API keys, entity secrets, refresh tokens, and deployer keys are never exposed through `VITE_` variables.
- Circle user tokens and encryption keys are kept in browser memory and refreshed from the server session before approvals.
- Arc receipt/event state is authoritative; Circle webhooks only accelerate UI refresh.

Read [SECURITY.md](./SECURITY.md) for the complete threat model and testnet limitations.

## Local Development

```sh
npm install
npm run dev
```

```powershell
cd contracts
.\tools\foundry\forge.exe test -vv
```

Required public Arc variables:

```dotenv
VITE_MORROW_MODE=arc
VITE_ARC_RPC_URL=https://rpc.testnet.arc.io
VITE_ARC_CHAIN_ID=5042002
VITE_MORROW_MARKET_ADDRESS=0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D
```

Server-only Circle and deployer credentials must stay out of the public client bundle.

## License

MIT, maintained by Nikhil Raikwar.
