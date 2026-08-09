# Morrow Security

Morrow is an Arc Testnet hackathon MVP. It is unaudited and must not be used with mainnet funds, real customer invoice data, production credentials, or production credit decisions.

## Deployment

- Network: Arc Testnet (`5042002`)
- Contract: [`0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D`](https://testnet.arcscan.app/address/0xB871Cc4Ee16Ae7A1FD1925d36Bbd714A64755e6D)
- Settlement asset: Arc canonical ERC-20 USDC (`0x3600000000000000000000000000000000000000`), 6 decimals
- Native gas token: USDC
- Protocol fee: 100 bps

## Threat Model

Primary assets:

- Test USDC escrowed in MorrowMarket.
- Receivable state, bids, refunds, repayments, and settlement events.
- Circle API key, entity secret, social-login refresh tokens, user tokens, and encryption keys.
- Deployer private key and contract owner permissions.
- Offchain invoice evidence and buyer/seller commercial details.

Primary actors:

- Business wallet: creates receivables, opens auctions, finalizes auctions.
- Buyer wallet: accepts/rejects receivables and repays.
- Lender wallet: approves USDC, bids, and claims refunds.
- Morrow server: creates allowlisted Circle wallet challenges.
- Circle webhook sender: delivers signed status notifications.

## Controls

- MorrowMarket rejects native `msg.value` flows and uses the Arc ERC-20 USDC interface for application-level transfers and allowances.
- USDC-moving functions are protected with `nonReentrant`.
- Lender bids are escrowed before auction finalization.
- Auction clearing is deterministic: APR, timestamp, then bid index.
- Clearing is bounded to 32 bids.
- Refunds are pull-based so one failed recipient cannot block recovery.
- Pause blocks new risk-taking actions while keeping refund paths available.
- Ownership transfer is two-step.
- There is no arbitrary token sweep or admin withdrawal path.
- The browser never supplies arbitrary contract targets or arbitrary calldata.
- Server-side challenge creation maps named actions to fixed MorrowMarket or canonical USDC ABI signatures.
- Circle user tokens and encryption keys are held in browser memory and refreshed from the server session before approval challenges.
- The `morrow_session` cookie is HTTP-only and SameSite=Lax.
- Circle webhook `POST` requests verify raw-body signatures before accepting events.
- Arc RPC reads and decoded MorrowMarket events remain the source of truth.

## Arc-Specific Handling

Arc has one USDC asset exposed through two interfaces:

- Native USDC: 18 decimals for gas accounting and native sends.
- ERC-20 USDC: 6 decimals for application transfers, approvals, and allowances.

Morrow uses the ERC-20 interface for contract accounting and UI amounts. The UI must not double-count native and ERC-20 event streams, and it must not compare raw 18-decimal native values with raw 6-decimal ERC-20 values.

## Circle-Specific Handling

- Circle User-Controlled Wallets are used for end-user signing.
- Social login returns `userToken`, `encryptionKey`, and `refreshToken`.
- The Web SDK is re-authenticated with the latest `userToken` and `encryptionKey` before executing a challenge.
- Refresh tokens are stored only inside the encrypted HTTP-only session cookie.
- Circle API keys and entity secrets stay server-side only.
- No Circle secret uses a `VITE_` prefix.

## Required Checks Before Deployment

1. Run `npm run lint`.
2. Run `npm run build`.
3. Run Foundry tests from `contracts/`.
4. Confirm `VITE_MORROW_MARKET_ADDRESS` matches the verified Arcscan contract.
5. Confirm chain ID `5042002`, RPC `https://rpc.testnet.arc.io`, and canonical USDC address.
6. Confirm the Circle webhook endpoint returns `2xx` for valid signed deliveries.
7. Confirm no private key, Circle API key, entity secret, refresh token, or user token appears in committed files or client bundle.

## Known MVP Limits

- Testnet only.
- No KYC/KYB, legal invoice verification, credit scoring, collections, tax reporting, or compliance workflow.
- Invoice evidence remains offchain; the contract stores a digest and commercial terms.
- Webhook deduplication is still MVP-grade and should use durable storage before production.
- `npm audit` currently reports transitive dependency advisories in development/browser polyfill and wallet SDK dependencies, including `brace-expansion`, `elliptic`, `js-yaml`, `nanoid`, `undici`, and `uuid`. Some suggested fixes require breaking dependency changes, so this remains a production release blocker rather than an automatic force-fix.
- An independent smart contract audit is required before mainnet.

## Vulnerability Reporting

Report issues privately to the maintainer with reproduction steps, affected commit, expected impact, and any relevant transaction hashes. Do not include secrets, private keys, API keys, or live customer data.
