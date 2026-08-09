<p align="center">
  <img src="./public/morrow%20banner%20new.png" alt="Morrow - receivables credit market on Arc" width="100%" />
</p>

<h1 align="center">Morrow</h1>

<p align="center"><strong>Receivables credit, rebuilt for stablecoin settlement.</strong></p>

<p align="center">
  <a href="https://morrow.nikhilraikwar.me"><img src="https://img.shields.io/badge/Live-Morrow-2563EB?style=flat-square" alt="Live demo" /></a>
  <a href="https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D"><img src="https://img.shields.io/badge/Arc%20Testnet-5042002-111827?style=flat-square" alt="Arc Testnet" /></a>
  <a href="https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D"><img src="https://img.shields.io/badge/Contract-Verified-16A34A?style=flat-square" alt="Verified contract" /></a>
  <img src="https://img.shields.io/badge/Settlement-USDC-2775CA?style=flat-square" alt="USDC settlement" />
  <img src="https://img.shields.io/badge/Wallets-Circle-7C3AED?style=flat-square" alt="Circle wallets" />
  <img src="https://img.shields.io/badge/License-MIT-111827?style=flat-square" alt="MIT license" />
</p>

Morrow lets a business turn a buyer-accepted invoice into immediate USDC. The business creates a receivable, the buyer confirms the payment obligation, lenders compete to fund it, and repayment settles through an onchain waterfall.

This is an Arc Testnet MVP. It is not a production lending product, investment product, broker, lender, credit underwriter, or mainnet protocol.

## Why Morrow

Receivables financing is one of the oldest forms of working capital, but the workflow is still slow: private quotes, manual verification, delayed bank settlement, and reconciliation after payment.

Stablecoin-native infrastructure changes the shape of the product:

- invoices can become programmable payment obligations;
- funding can clear through transparent lender competition;
- escrow, repayment, fees, refunds, and claims can be enforced by contract state;
- businesses, buyers, and lenders can all settle in one money layer.

## Market Context

- The global factoring services market is projected at **$4.72T in 2026** and **$7.77T by 2034**. [Fortune Business Insights](https://www.fortunebusinessinsights.com/factoring-services-market-111547)
- Cross-border B2B stablecoin transactions are projected to grow from **$13.4B in 2026** to **$5T by 2035**. [Juniper Research](https://www.globenewswire.com/news-release/2026/04/27/3281292/0/en/Stablecoin-Cross-border-B2B-Transactions-to-Reach-5-Trillion-by-35-Causing-Disruption-to-Correspondent-Banking-Channels.html)
- Circle reports **$72.3B USDC in circulation** as of July 27, 2026. [Circle](https://www.circle.com/usdc)

Morrow sits at the intersection of those three shifts: invoice finance, stablecoin settlement, and programmable credit markets.

## Product Flow

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, Arial","primaryColor":"#eff6ff","primaryTextColor":"#0f172a","primaryBorderColor":"#2563eb","secondaryColor":"#dcfce7","tertiaryColor":"#fef3c7","lineColor":"#64748b"}}}%%
flowchart LR
  business["Business<br/>creates receivable"]:::actor --> buyer["Buyer<br/>accepts invoice"]:::actor
  buyer --> market["MorrowMarket<br/>on Arc"]:::contract
  lenders["Lenders<br/>bid USDC"]:::actor --> auction["Reverse auction<br/>lowest APR wins"]:::auction
  market --> auction
  auction --> advance["USDC advance<br/>to business"]:::money
  buyerPay["Buyer repayment<br/>USDC"]:::money --> waterfall["Settlement waterfall"]:::contract
  waterfall --> fee["Protocol fee"]:::money
  waterfall --> lenderClaims["Lender principal<br/>+ return"]:::money
  waterfall --> remainder["Business remainder"]:::money

  classDef actor fill:#eff6ff,stroke:#2563eb,color:#0f172a;
  classDef contract fill:#111827,stroke:#2563eb,color:#ffffff;
  classDef auction fill:#fef3c7,stroke:#d97706,color:#111827;
  classDef money fill:#dcfce7,stroke:#16a34a,color:#052e16;
```

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, Arial","primaryColor":"#e0e7ff","primaryTextColor":"#111827","primaryBorderColor":"#4f46e5","secondaryColor":"#dcfce7","tertiaryColor":"#fee2e2","lineColor":"#64748b"}}}%%
stateDiagram-v2
  [*] --> AwaitingBuyer: create receivable
  AwaitingBuyer --> BuyerAccepted: buyer accepts
  AwaitingBuyer --> Cancelled: buyer rejects or seller cancels
  BuyerAccepted --> AuctionLive: seller opens auction
  AuctionLive --> Funded: auction finalized
  AuctionLive --> Cancelled: unfilled auction cancelled
  Funded --> PartiallyRepaid: partial repayment
  PartiallyRepaid --> Settled: final repayment
  Funded --> Settled: full repayment
```

## Why Arc and Circle

Morrow is built around Arc and USDC rather than adding stablecoins as an afterthought.

| Layer | How Morrow uses it |
| --- | --- |
| Arc Testnet | Contract state, public market reads, transaction proofs, USDC-denominated gas |
| Arc USDC | ERC-20 interface for approvals, escrow, bids, repayments, fees, and claims |
| Circle Wallets | Google social login and user-controlled wallet approvals |
| Circle challenges | Explicit user confirmation for each contract action |
| Arcscan | Public proof for contract, deployment, and transaction history |

Arc docs define Arc Testnet as chain ID `5042002`, RPC `https://rpc.testnet.arc.io`, and explorer `https://testnet.arcscan.app`. Arc USDC has one underlying balance with a native gas interface and an ERC-20 interface at `0x3600000000000000000000000000000000000000`.

## Live Deployment

| Item | Value |
| --- | --- |
| App | [morrow.nikhilraikwar.me](https://morrow.nikhilraikwar.me) |
| Public market | [morrow.nikhilraikwar.me/market](https://morrow.nikhilraikwar.me/market) |
| Demo video | [YouTube](https://youtu.be/k-qYZ2H1loM) |
| Presentation | [Google Slides](https://docs.google.com/presentation/d/14sbp_qFrToF_CVYG9R2qsfAWblh6ID87te1tTXhr4bE/edit?usp=sharing) |
| Network | Arc Testnet |
| Chain ID | `5042002` |
| Contract | [`0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D`](https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D) |
| Deployment tx | [`0xac94f5841769b13a59c1ad974b95bf3e5536cc3b73906bbd0688ff0ce282ac2e`](https://testnet.arcscan.app/tx/0xac94f5841769b13a59c1ad974b95bf3e5536cc3b73906bbd0688ff0ce282ac2e) |
| USDC | [`0x3600000000000000000000000000000000000000`](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) |

## What Works

- Public, walletless market page backed by Arc reads.
- Circle social login for user-controlled wallets.
- Connected workspaces for business, buyer, and lender flows.
- Contract-backed receivable lifecycle.
- USDC approval, bidding, repayment, refund, and settlement actions through allowlisted Circle challenges.
- Arcscan links for onchain proof.

## Security Boundary

Morrow never asks for a seed phrase or private key. The browser requests named actions only. The server maps those actions to fixed contract addresses and ABI functions before creating Circle challenges.

Secrets stay server-side:

- Circle API key
- Circle entity secret
- Circle refresh tokens
- deployer private key

See [SECURITY.md](./SECURITY.md) for the threat model, Arc/Circle handling, and MVP limits.

## Local Development

```sh
npm install
npm run dev
```

Contract tests:

```powershell
cd contracts
.\tools\foundry\forge.exe test -vv
```

Required public Arc configuration:

```dotenv
VITE_MORROW_MODE=arc
VITE_ARC_RPC_URL=https://rpc.testnet.arc.io
VITE_ARC_CHAIN_ID=5042002
VITE_MORROW_MARKET_ADDRESS=0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D
```

Circle credentials must stay server-side and must not use `VITE_` prefixes.

## License

MIT. Built by [Nikhil Raikwar](https://github.com/NikhilRaikwar).
