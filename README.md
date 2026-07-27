# Morrow

**Sell tomorrow's receivable for today's USDC.**

Morrow is a stablecoin-native receivables credit market designed for Arc. A business turns a buyer-accepted invoice into immediate USDC, lenders compete to fund it, and the buyer's eventual payment is distributed through a programmable settlement waterfall.

## Checkpoint 2 status

This repository currently contains a complete, replayable frontend prototype. It demonstrates the product state machine and all three participant experiences with mock data persisted in the browser. It does **not** yet send real transactions, deploy contracts, verify legal invoices, or underwrite real-world credit.

Current working flows:

- Connect a demo wallet and choose Business, Lender, or Buyer.
- Create an invoice and submit it for buyer review.
- Accept or reject the invoice as the buyer.
- Open a funding auction as the business.
- Submit competing lender bids with partial fills and APR price discovery.
- Finalize the auction and advance simulated USDC to the business.
- Pay the invoice as the buyer and inspect the principal/yield/fee waterfall.
- Review role dashboards, lender portfolio, market, activity log, and resettable demo state.

## Product lifecycle

```text
awaiting_buyer -> buyer_accepted -> auction_live -> funded -> partially_repaid -> settled
```

## Demo walkthrough

1. Launch the app and connect the **Demo Wallet**.
2. Select **Business**, open an accepted invoice, and start its auction.
3. Switch to **Lender**, place a bid, and use **Simulate competing bid** to fill the remainder.
4. Switch to **Business** and finalize the auction.
5. Switch to **Buyer**, pay the funded invoice, and inspect the settlement waterfall.
6. Open **Activity** to see the shared event history, or **Settings** to reset the demo.

## Planned Arc and Circle implementation

The next milestone replaces the browser store with Arc Testnet contracts and indexed events:

- **Arc Testnet + USDC:** funding, buyer repayment, and USDC-denominated gas with deterministic sub-second finality.
- **Circle Wallets:** embedded user-controlled wallets for business, buyer, and lender onboarding.
- **Circle Contracts / custom Solidity:** receivable registry, auction escrow, claims, and atomic settlement waterfall.
- **App Kit Send:** buyer payments and lender/seller transfers.
- **App Kit Bridge or CCTP V2:** move native USDC from a single source chain into Arc funding flows.
- **App Kit Unified Balance / Gateway:** aggregate lender liquidity across supported chains and spend it on Arc.
- **Arcscan proof links:** expose every real acceptance, bid, funding, and repayment transaction in the UI.

Arc Testnet supports App Kit Send, Bridge, Swap, Unified Balance, and the Circle Wallets adapter. Gateway is the intended path for pooled multichain liquidity; CCTP is the path for a known point-to-point transfer. Bridge Kit currently does not support Circle Wallets, so that combination will not be presented as implemented until Circle adds support or a compatible wallet adapter is used.

## Technology

- TanStack Start, React, and TypeScript
- Tailwind CSS and shadcn/ui
- Recharts and Lucide icons
- Browser-local demo store for Checkpoint 2

## Development

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Quality checks:

```sh
npm run build
npm run lint
npm run format:check
```

## Hackathon track

**Build on Arc — DeFi Track.** Morrow is a pure DeFi/fintech infrastructure project. Do not select Agentic Economy unless autonomous agent decision-making and agent-controlled USDC transactions are actually added before the final submission.

## Disclaimer

This Checkpoint 2 prototype uses mock business, risk, wallet, and transaction data. It is not a live credit market, an investment product, legal verification, or financial advice.

## License

MIT © 2026 Nikhil Raikwar. See [LICENSE](./LICENSE).
