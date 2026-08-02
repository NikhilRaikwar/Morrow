# Morrow Security

## Current security posture

MorrowMarket is deployed on **Arc Testnet only**. It is a hackathon MVP, not a production lending product. Do not use mainnet funds, customer invoice data, or production credentials.

### Deployed contract

- Network: Arc Testnet (`5042002`)
- Contract: [`0xAA16db1eE0E26327B5A46B4931F095d936764EA8`](https://testnet.arcscan.app/address/0xAA16db1eE0E26327B5A46B4931F095d936764EA8)
- Settlement asset: Arc canonical ERC-20 USDC (`0x3600000000000000000000000000000000000000`), 6 decimals
- Servicing fee: 100 bps

## Security controls

- ERC-20 USDC-only contract flows; native `msg.value` is rejected to avoid Arc's 18-decimal native / 6-decimal ERC-20 confusion.
- Bids are escrowed before auction finalization; winning allocations are deterministic by lowest APR, then bid order.
- Maximum 32 bids bounds clearing and repayment iteration gas.
- Pull-based refunds prevent a failed recipient from blocking auction recovery.
- `nonReentrant` protects all USDC-moving paths.
- Pause blocks new risk-taking actions but does not prevent lender bid refunds.
- Two-step ownership transfer prevents accidental admin loss.
- Contract has no arbitrary token sweep or admin withdrawal path.
- Circle webhook uses raw-body ECDSA-SHA256 verification via Circle's per-delivery public key.
- Circle API keys and deployer keys stay server/local only; no secret uses a `VITE_` prefix.

## Required checks before any new deployment

1. Run `contracts/tools/foundry/forge.exe test -vvv` from `contracts/`.
2. Confirm Arc Testnet chain ID, canonical USDC address, fee recipient, and deployed bytecode.
3. Use a fresh testnet-only deployer key. Never put `DEPLOYER_PRIVATE_KEY` in Vercel.
4. Confirm webhook signature verification and retry/idempotency behavior.
5. Run an independent contract review before any mainnet or real-value deployment.

## Known MVP limits

- Current application screens remain in explicit demo/mock mode until the Circle Wallet challenge flow and Arc adapter replace the local store actions.
- Test suite has golden-path and authorization coverage; fuzz/invariant tests and an independent review remain required.
- In-memory webhook deduplication resets across serverless instances; persistent event storage is needed for production.
- Invoice documents and KYC/KYB are intentionally out of scope; no private commercial data belongs onchain.

## Reporting vulnerabilities

Do not disclose vulnerabilities publicly. Contact the maintainer privately with reproduction steps, affected version/commit, and potential impact. Do not include secrets, API keys, or private keys.
