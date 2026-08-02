# Morrow: Real Arc + Circle Integration Plan

> Status: implementation-ready engineering plan  
> Generated: 28 July 2026  
> Scope: replace the Checkpoint 2 browser simulation with a verifiable Arc Testnet MVP  
> Primary track: Build on Arc — DeFi

## 1. Outcome

The final MVP must prove one complete real-money lifecycle using test USDC:

1. A business connects a real Circle user-controlled wallet.
2. The business registers an invoice commitment on Arc Testnet.
3. The designated buyer accepts it from a separate wallet.
4. Two lenders escrow test USDC in a competitive partial-fill auction.
5. The business finalizes the auction and receives the advance.
6. The buyer pays the invoice into the contract.
7. The contract distributes the servicing fee, lender principal and yield, and seller remainder.
8. Every step is visible through real transaction hashes, contract events, refreshed balances, and Arcscan links.

The current mock mode stays available behind an explicit `Demo mode` switch until the real flow passes end-to-end tests. It must never be presented as a live transaction.

## 2. Decisions locked for the hackathon

| Area                    | Decision                                                                  | Why                                                                                     |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Chain                   | Arc Testnet only                                                          | Smallest path to a real judged MVP                                                      |
| Settlement asset        | Arc USDC ERC-20 interface, 6-decimal accounting                           | Contracts need ERC-20 approvals and transfers; native gas uses 18 decimals              |
| Wallet                  | Circle User-Controlled Wallet, EOA account type, PIN-first onboarding     | User custody, Arc Testnet support, and contract execution challenge support             |
| Contract topology       | One bounded `MorrowMarket` contract plus interfaces/libraries             | Easier to audit and deploy than three upgradeable contracts during a hackathon          |
| Auction custody         | Escrow USDC when each bid is placed                                       | A winning bid cannot disappear at finalization                                          |
| Bid clearing            | Lowest APR first, partial final fill, maximum 32 bids per invoice         | Deterministic price discovery with bounded finalization gas                             |
| Buyer acceptance        | Direct buyer transaction calling `acceptReceivable`                       | Clear onchain proof; no relayer or signature-replay surface in MVP                      |
| Repayment               | Full or partial buyer payments, distributed pro rata over accepted claims | Matches the existing UI and makes the waterfall real                                    |
| Reads                   | Viem public client reads plus event logs; no database in MVP              | Chain is the source of truth and scope remains manageable                               |
| Contract deployment     | Foundry deployment, then import/monitor through Circle Contracts          | Foundry gives strong tests; Circle Contracts provides managed contract/event visibility |
| Cross-chain liquidity   | Gateway/Unified Balance as the primary optional lender onboarding path    | Designed for aggregated multichain USDC and Arc Testnet is supported                    |
| Point-to-point bridging | App Kit Bridge/CCTP V2 only as a separate fund-wallet step                | Bridge Kit does not currently support Circle Wallets directly                           |

## 3. MCP-verified platform facts

- Arc Testnet chain ID is `5042002`, RPC is `https://rpc.testnet.arc.network`, explorer is `https://testnet.arcscan.app`, CCTP domain is `26`, and USDC is the native gas token. Arc documents native USDC with 18 decimals and the ERC-20 interface with 6 decimals. [Arc chain metadata](https://docs.arc.io/integrate/infrastructure/bridges#chain-metadata)
- The Arc USDC ERC-20 interface is `0x3600000000000000000000000000000000000000`. Contract amounts must use 6-decimal units; gas/balance display must not mix these units. [Arc USDC integration](https://docs.arc.io/arc/references/usdc)
- Arc Testnet supports App Kit Send, Bridge, Swap, Unified Balance, Viem/Ethers adapters, and the Circle Wallets adapter. [App Kit supported blockchains](https://docs.arc.io/app-kit/references/supported-blockchains)
- Circle User-Controlled Wallets support email, social, or PIN authentication and require client and server code. The Circle SDK exposes wallet creation, contract-execution fee estimation, contract-execution challenges, transaction status, token balances, and EIP-712 signing. [Circle User-Controlled Wallets](https://developers.circle.com/wallets/user-controlled)
- Gateway supports Arc Testnet and is intended for combining USDC held across multiple supported chains into a unified balance. Circle describes established transfers as sub-500ms. [Circle Gateway](https://developers.circle.com/gateway)
- CCTP V2 supports Arc Testnet, burns native USDC on the source chain, and mints native USDC on Arc. Fast and Standard transfer modes are available. Arc is currently testnet-only in these Circle products. [CCTP overview](https://developers.circle.com/cctp)
- Bridge Kit currently does not support Circle Wallets. Morrow must not advertise a one-click Circle-Wallet-to-Bridge-Kit bid until this changes. [Bridge Kit](https://developers.circle.com/bridge-kit)
- Circle Smart Contract Platform can deploy/import custom contracts and create event monitors. The plan uses it after a tested Foundry deployment, not as a replacement for contract tests. [Circle Contracts](https://developers.circle.com/contracts)

## 4. What already exists

| Existing surface                   | Reuse strategy                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/morrow/types.ts`          | Keep UI view models, add chain IDs/status types and strict USDC bigint conversion |
| `src/lib/morrow/store.tsx`         | Keep as `MockMorrowAdapter`; remove it as the default source of truth             |
| Business, buyer, lender dashboards | Retain UI; replace direct store calls with adapter mutations and chain queries    |
| Create-invoice flow                | Submit a real `createReceivable` contract challenge                               |
| Buyer acceptance UI                | Submit `acceptReceivable` from the designated buyer wallet                        |
| Bid dialog/order book              | Run USDC approval then escrowed `placeBid`; render bids from events/views         |
| Auction finalization UI            | Call `finalizeAuction`; show released advance and refunds from receipt events     |
| Buyer payment dialog               | Approve USDC then call `repay`; render actual waterfall events                    |
| Transaction modal and `TxLink`     | Drive steps from real challenge/transaction states and real hashes                |
| Activity page                      | Populate from contract events instead of generated hashes                         |
| Role switcher                      | Keep only for mock mode; real mode derives permissions from connected address     |

## 5. Target architecture

```text
                                  CIRCLE
                         +-----------------------+
 Browser                 | User-Controlled Wallet|
 +-------------------+   | challenge + PIN UI    |
 | TanStack Start UI |<->+-----------------------+
 |                   |              ^
 | React Query       |              | server-only API key
 | Morrow adapter    |              v
 +---------+---------+   +-----------------------+
           |             | TanStack server routes|
           | viem reads  | auth/token/challenges |
           |             +-----------------------+
           v
 +----------------------------------------------------------------+
 |                         ARC TESTNET                            |
 |                                                                |
 | Circle wallet -> USDC approve -> MorrowMarket contract         |
 |                                |                               |
 |                                +-> receivable state            |
 |                                +-> escrowed bids                |
 |                                +-> accepted lender claims       |
 |                                +-> repayment waterfall          |
 |                                +-> events                       |
 +-------------------------------+--------------------------------+
                                 |
                                 v
                  Arc RPC + Arcscan + Circle event monitor

 Optional lender funding before a bid:

 Base/Ethereum USDC -> Gateway Unified Balance -> Arc wallet -> approve -> bid
 known source chain -> App Kit Bridge/CCTP V2 -> Arc wallet -> approve -> bid
```

### Trust boundaries

- Circle API keys, app secrets, and any entity secret remain server-only.
- User tokens are short-lived and stored in secure, HTTP-only, same-site cookies where the SDK flow permits; never store them in `localStorage`.
- The browser receives only the minimum challenge metadata needed to invoke Circle's challenge UI.
- The contract trusts no frontend-computed APR, allocation, status, or repayment amount.
- Invoice documents remain offchain. Arc stores a digest, not private commercial files.
- The connected wallet address must match the business, buyer, or lender role required by the contract call.

## 6. Onchain design

### 6.1 State machine

```text
Draft
  |
  | createReceivable()
  v
AwaitingBuyer -- rejectReceivable() --> Rejected
  |
  | acceptReceivable() by buyer
  v
BuyerAccepted -- openAuction() by seller --> AuctionLive
                                                |
                               placeBid() x 1..32| escrow USDC
                                                v
                                         ReadyToFinalize
                                                |
                             finalizeAuction()  |
                                                v
                                             Funded
                                                |
                                  repay() 0..N  |
                              +-----------------+
                              | outstanding > 0 | outstanding == 0
                              v                 v
                       PartiallyRepaid        Settled
```

Terminal escape paths:

- Seller may cancel only before buyer acceptance.
- Seller may cancel an auction after its deadline only if the requested advance is not filled; all escrowed bids are refundable.
- A rejected or cancelled receivable can never reopen.
- A funded receivable can never be cancelled.

### 6.2 Core contract

Create `contracts/src/MorrowMarket.sol` using Solidity `0.8.30` and OpenZeppelin:

- `SafeERC20`
- `ReentrancyGuard`
- `Pausable`
- `Ownable2Step` for the testnet protocol admin

Constructor parameters:

- Arc USDC interface address
- fee recipient
- servicing fee in basis points

Core structs:

- `Receivable`: seller, buyer, documentDigest, faceValue, advanceRequested, dueDate, maxAprBps, auctionDeadline, status, fundedPrincipal, repaidAmount
- `Bid`: lender, amount, aprBps, timestamp, acceptedAmount, refunded
- `Claim`: principal, annualizedYield, repaidPrincipal, repaidYield

Core methods:

- `createReceivable(...) returns (uint256 id)`
- `cancelReceivable(id)`
- `acceptReceivable(id)`
- `rejectReceivable(id)`
- `openAuction(id, deadline)`
- `placeBid(id, amount, aprBps)`
- `cancelUnfilledAuction(id)`
- `claimBidRefund(id, bidIndex)`
- `finalizeAuction(id)`
- `repay(id, amount)`
- `getReceivable(id)`
- `getBids(id, offset, limit)`
- `getClaim(id, lender)`
- `previewSettlement(id, amount)`

Core events:

- `ReceivableCreated`
- `ReceivableAccepted`
- `ReceivableRejected`
- `AuctionOpened`
- `BidPlaced`
- `BidAllocated`
- `BidRefunded`
- `AuctionFinalized`
- `RepaymentReceived`
- `ClaimPaid`
- `ReceivableSettled`

### 6.3 Accounting rules

- Every asset amount is `uint256` in 6-decimal USDC base units.
- APR is integer basis points.
- Yield per accepted bid is `principal * aprBps * termSeconds / (10_000 * 365 days)`.
- Finalization sorts at most 32 bids by `(aprBps, timestamp, bidIndex)`.
- A final bid may be partially accepted. Its unused escrow becomes refundable.
- The seller receives exactly `advanceRequested` on finalization.
- Repayment allocation order is servicing fee, then pro-rata lender principal/yield due, then seller remainder.
- Integer dust is assigned deterministically to the seller remainder after lender entitlements are satisfied.
- Contract-wide invariant: USDC balance is always at least total live bid escrow plus undistributed repayment liabilities.

## 7. Circle Wallet integration

### 7.1 Server endpoints

Add TanStack server routes/functions for:

- `POST /api/circle/session/start`: create/find the Morrow user and return an encrypted user session payload.
- `POST /api/circle/session/refresh`: refresh a Circle user token.
- `POST /api/circle/wallet/create`: create an `ARC-TESTNET` EOA wallet challenge.
- `GET /api/circle/wallet`: return wallet address and monitored USDC balance.
- `POST /api/circle/contract/estimate`: estimate a contract execution fee.
- `POST /api/circle/contract/challenge`: validate role/input, create a contract-execution challenge, and return `challengeId`.
- `GET /api/circle/transaction/:id`: return transaction state and final hash.
- `POST /api/circle/webhook`: verify Circle notification signatures, enforce idempotency, and record only non-secret operational metadata.

Every mutation receives an idempotency key generated once per user intent. Repeated clicks must return the same pending operation instead of creating multiple transactions.

### 7.2 Client flow

```text
User clicks action
   -> validate form and connected role
   -> request fee estimate
   -> request Circle challenge
   -> Circle SDK execute(challengeId)
   -> poll transaction or consume verified webhook
   -> wait for Arc receipt
   -> invalidate React Query keys
   -> show real hash + decoded event result
```

The transaction dialog states must become:

`preparing -> awaiting_user -> submitted -> confirming -> confirmed | failed | cancelled`

Never show success when a challenge completes but its onchain transaction later fails.

## 8. Frontend migration

Introduce one interface so mock and real modes use the same screens:

```ts
interface MorrowAdapter {
  getSession(): Promise<WalletSession>;
  listReceivables(filter?: ReceivableFilter): Promise<ReceivableView[]>;
  getReceivable(id: bigint): Promise<ReceivableDetail>;
  createReceivable(input: CreateReceivableInput): Promise<Operation>;
  acceptReceivable(id: bigint): Promise<Operation>;
  rejectReceivable(id: bigint): Promise<Operation>;
  openAuction(id: bigint, deadline: number): Promise<Operation>;
  placeBid(input: PlaceBidInput): Promise<Operation[]>;
  finalizeAuction(id: bigint): Promise<Operation>;
  repay(id: bigint, amount: bigint): Promise<Operation[]>;
}
```

Implementation split:

- `MockMorrowAdapter`: wraps the existing local store for demos.
- `ArcMorrowAdapter`: reads through Viem and writes through Circle contract challenges.
- `MorrowProvider`: exposes queries/mutations, selected mode, wallet, and chain health.

Do not mix mock invoices and live invoices in one list. Add a visible environment badge and separate local-storage namespaces.

## 9. Gateway, App Kit, and CCTP

### Final-MVP priority

1. Ship the complete Arc-only lifecycle first.
2. Add Gateway/Unified Balance as one lender-funding path.
3. Add App Kit Bridge/CCTP V2 only if the core lifecycle is already green.

Gateway flow:

```text
Check unified balance
  -> choose source allocations
  -> spend USDC to lender's Arc wallet
  -> wait for Arc balance
  -> approve MorrowMarket
  -> place bid
```

CCTP flow:

```text
Bridge Kit with compatible Viem/Ethers browser wallet
  -> burn source-chain USDC
  -> wait for Circle attestation
  -> mint on Arc wallet
  -> approve MorrowMarket
  -> place bid
```

These are multi-step operations. If bridge/funding succeeds but bid placement fails, the USDC remains in the lender's Arc wallet and the UI offers `Retry bid`; no funds are lost.

## 10. Planned repository structure

```text
contracts/
  foundry.toml
  src/MorrowMarket.sol
  script/DeployArcTestnet.s.sol
  test/MorrowMarket.t.sol
  test/MorrowMarket.invariant.t.sol

src/
  config/arc.ts
  contracts/morrowMarket.ts
  lib/morrow/adapter.ts
  lib/morrow/mock-adapter.ts
  lib/morrow/arc-adapter.ts
  lib/morrow/query-keys.ts
  lib/circle/client.server.ts
  lib/circle/session.server.ts
  lib/circle/challenges.server.ts
  lib/circle/webhooks.server.ts
  routes/api.circle.*
  components/morrow/wallet-gate.tsx
  components/morrow/environment-badge.tsx

scripts/
  verify-arc-deployment.mts
```

The exact TanStack API route filenames may be adjusted to its file-routing conventions during implementation. Module boundaries above are the contract.

## 11. Implementation phases

### Phase 0: Configuration and safety rails

- Add Arc chain configuration, contract address schema, typed environment validation, USDC unit helpers, and real/mock feature flag.
- Add `.env.example` with names only, never secrets.
- Add a startup assertion that refuses real mode on the wrong chain or missing contract bytecode.
- Acceptance: app starts in mock mode without secrets and fails clearly when real mode is misconfigured.

### Phase 1: Contract and tests

- Build `MorrowMarket.sol` with the state machine, escrowed bidding, clearing, refunds, partial repayment, and waterfall.
- Write unit, fuzz, invariant, and malicious-token/reentrancy tests.
- Deploy locally, run the complete multi-wallet lifecycle, then deploy to Arc Testnet.
- Acceptance: all contract tests pass and the verification script confirms code, USDC address, fee recipient, and one full Arc Testnet lifecycle.

### Phase 2: Circle wallet onboarding

- Create Circle developer-console configuration and an Arc Testnet EOA wallet using PIN onboarding first.
- Implement server session/token endpoints and client challenge execution.
- Replace the fake wallet/balance on `/connect` and `/settings`.
- Acceptance: a new browser session creates or reconnects a Circle wallet and displays its real Arc address/balance without exposing API keys.

### Phase 3: Real contract adapter

- Add `ArcMorrowAdapter` and React Query hooks.
- Wire create, accept/reject, open auction, approve/bid, finalize, approve/repay.
- Decode receipts and contract events into the existing activity and transaction UI.
- Acceptance: three distinct wallets complete the full golden path after page reloads with no local mock state.

### Phase 4: Circle Contracts monitoring

- Import the deployed contract into Circle Smart Contract Platform.
- Create monitors for high-value lifecycle events.
- Add verified webhook ingestion with signature verification and idempotency.
- Acceptance: an onchain event appears in both Arcscan and the monitored event feed without duplicate processing.

### Phase 5: Gateway/App Kit capital onboarding

- Integrate App Kit Unified Balance/Gateway for a lender with test USDC on Base Sepolia or Ethereum Sepolia.
- Move funds to the lender's Arc wallet, then continue through approve/bid.
- Acceptance: demo starts with no Arc USDC, sources test USDC from a supported chain, and finishes a real bid.

### Phase 6: Hardening and final demo

- Add loading/error/retry/replacement transaction states, role/address checks, empty states, and real-mode disclaimers.
- Run contract, server, UI, E2E, and deployed smoke tests.
- Record contract addresses and the exact demo transaction sequence.
- Acceptance: the three-minute demo can be replayed from clean wallets using documented testnet prerequisites.

## 12. Test coverage plan

```text
CODE PATHS                                      USER FLOWS
[GAP -> UNIT/FUZZ] Contract state machine       [GAP -> E2E] Circle wallet creation/reconnect
  + create/cancel/reject                          + email/PIN challenge cancelled
  + accept only by designated buyer               + expired token refresh
  + invalid transitions revert

[GAP -> UNIT/FUZZ] Auction                      [GAP -> E2E] Business -> buyer -> lenders
  + approval/escrow                               + register invoice
  + rate ceiling and deadline                     + buyer accept
  + deterministic bid ordering                    + two partial bids
  + partial final fill/refund                      + finalize and receive advance
  + max 32 bids                                   + reload and restore chain state

[GAP -> INVARIANT] Accounting                   [GAP -> E2E] Buyer repayment
  + escrow/liability solvency                      + approve USDC
  + no double refund                               + partial repayment
  + lender entitlement never exceeded              + final repayment
  + fee + lenders + seller == payment              + verify balances/events/Arcscan links

[GAP -> INTEGRATION] Circle server               [GAP -> E2E] Recovery paths
  + API key never returned                         + reject wallet challenge
  + user-token expiry                              + transaction reverts
  + idempotent challenge creation                  + successful bridge then failed bid
  + verified/replayed webhook                      + wrong connected role

CURRENT COVERAGE: mock UI manually exercised; no automated real-integration coverage.
TARGET: 100% contract branch coverage for core transitions plus one deployed golden-path E2E.
```

Required test files:

- `contracts/test/MorrowMarket.t.sol`: every transition, permission, validation, allocation, refund, and repayment branch.
- `contracts/test/MorrowMarket.invariant.t.sol`: solvency, no overpayment, no duplicate refunds, terminal-state immutability.
- `src/lib/morrow/__tests__/units.test.ts`: 6/18 decimal boundaries, bigint parsing, formatting, basis-point calculations.
- `src/lib/circle/__tests__/webhooks.test.ts`: valid/invalid signatures, replay, duplicate delivery, malformed payload.
- `src/lib/morrow/__tests__/arc-adapter.test.ts`: ABI argument encoding, receipt decoding, failed transaction propagation.
- `e2e/real-arc.spec.ts`: opt-in deployed golden path using funded test wallets.
- `e2e/mock-regression.spec.ts`: current replayable mock demo remains intact.

## 13. Failure modes

| Failure                                | Prevention/handling                                       | Test             | User experience                       |
| -------------------------------------- | --------------------------------------------------------- | ---------------- | ------------------------------------- |
| Circle user token expires              | server refresh and one bounded retry                      | integration      | reconnect prompt if refresh fails     |
| User closes PIN challenge              | operation becomes `cancelled`                             | E2E              | retry button, no false success        |
| Approval succeeds, contract call fails | detect allowance and retry only the contract call         | E2E              | funds remain in wallet                |
| Bid escrowed but auction does not fill | deadline cancellation and permissionless refund claim     | unit/E2E         | claim-refund action                   |
| Two users finalize simultaneously      | state transition makes second call revert                 | fuzz             | refresh to funded state               |
| RPC returns stale data                 | wait for receipt then refetch by block number             | adapter          | “confirming” state, not stale success |
| Webhook is duplicated                  | signature verification plus event/transaction idempotency | integration      | no duplicate activity                 |
| Gateway transfer succeeds, bid fails   | split operations; resume at approval/bid                  | E2E              | Arc balance and retry shown           |
| Native 18 decimals mixed with ERC-20 6 | separate typed conversion helpers                         | unit             | fail before signing                   |
| Buyer underpays                        | partial repayment accounting                              | fuzz             | outstanding amount remains visible    |
| More than 32 bids                      | contract reverts with named error                         | unit             | auction shown full                    |
| Malicious reentrancy attempt           | `SafeERC20`, CEI, `nonReentrant`                          | adversarial unit | transaction safely fails              |

No silent failure is acceptable on create, accept, bid, finalize, refund, or repay.

## 14. Security gates

- Run Slither and Foundry invariant tests before Arc deployment.
- Use custom errors and explicit role checks.
- Keep contract non-upgradeable for the hackathon.
- Use a testnet pause switch only for new actions; never block lender refunds.
- Never hash a raw document alone. Hash a canonical manifest containing document digest, seller, buyer, currency, face value, due date, and a random salt.
- Do not put legal names, email addresses, invoice descriptions, or documents onchain.
- Validate Circle webhook signatures against Circle's published notification key and reject old/replayed messages.
- Keep all secrets server-only and add secret scanning in CI.
- Verify deployed bytecode and constructor configuration before displaying “Live on Arc.”

## 15. Environment and deployment record

Required environment names:

```text
VITE_MORROW_MODE=mock|arc
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_ARC_CHAIN_ID=5042002
VITE_MORROW_MARKET_ADDRESS=
CIRCLE_API_KEY=
CIRCLE_APP_ID=
CIRCLE_ENTITY_SECRET=              # only if required by selected server product
CIRCLE_WEBHOOK_SUBSCRIPTION_ID=
CIRCLE_WEBHOOK_PUBLIC_KEY=
PROTOCOL_FEE_RECIPIENT=
DEPLOYER_PRIVATE_KEY=               # local deployment only, never Vercel
```

Create `DEPLOYMENTS.md` only after a real deployment. Record network, chain ID, contract address, deploy transaction, deployer, git commit, ABI hash, constructor values, deployment date, and verification result.

## 16. CI gates

On every pull request:

1. `npm ci`
2. formatting and ESLint
3. TypeScript/build
4. frontend unit tests
5. `forge fmt --check`
6. `forge test`
7. Slither on contract changes
8. secret scan

The deployed E2E suite is opt-in/manual because it spends testnet balances and depends on Circle/Arc services.

## 17. Parallelization

| Lane | Modules                                      | Depends on                       |
| ---- | -------------------------------------------- | -------------------------------- |
| A    | `contracts/`                                 | none                             |
| B    | `src/lib/circle/`, API routes                | Circle console credentials       |
| C    | adapter interface, React Query, mock adapter | interface design only            |
| D    | Gateway/App Kit                              | A + B + core E2E green           |
| E    | dashboard route migration                    | A ABI + B challenges + C adapter |

Execution order:

1. Start A, B, and C in parallel.
2. Merge ABI and wallet challenge work.
3. Run E sequentially route-by-route.
4. Complete the Arc-only golden path.
5. Start D only after the golden path passes.

Conflict flag: C and E both touch `src/lib/morrow/` and provider consumers; do not implement them concurrently without separate ownership.

## 18. NOT in scope for the final hackathon MVP

- Production lending or mainnet funds: legal/compliance scope is not solved by testnet code.
- Automated underwriting or AI credit scores: it would distract from proving the settlement primitive.
- Tokenized/NFT receivable claims or a secondary market: possible securities implications and no demo requirement.
- Upgradeable contracts, DAO governance, or protocol token: unnecessary attack surface.
- StableFX/multicurrency settlement: post-MVP, eligibility and liquidity access must be confirmed.
- Production document storage/KYB/KYC: integrate specialized providers after the onchain lifecycle works.
- A custom backend database/indexer: RPC/event reads and Circle monitoring are enough for the judged MVP.
- Fully atomic cross-chain bid placement: unsupported with the chosen Circle Wallet flow today.

## 19. Implementation Tasks

- [ ] **T1 (P1)** — Add Arc configuration, strict environment validation, and USDC unit helpers.
- [ ] **T2 (P1)** — Implement and fully test `MorrowMarket.sol`.
- [ ] **T3 (P1)** — Deploy and verify the contract on Arc Testnet.
- [ ] **T4 (P1)** — Implement Circle User-Controlled Wallet onboarding and secure server sessions.
- [ ] **T5 (P1)** — Add Circle contract-execution challenge and transaction-status endpoints.
- [ ] **T6 (P1)** — Introduce `MorrowAdapter`, preserving the existing mock adapter.
- [ ] **T7 (P1)** — Implement `ArcMorrowAdapter` reads, writes, receipts, and event decoding.
- [ ] **T8 (P1)** — Migrate create, acceptance, auction, bid, finalization, refund, and repayment UI.
- [ ] **T9 (P1)** — Complete the deployed three-wallet Arc Testnet E2E test.
- [ ] **T10 (P2)** — Import/monitor the contract with Circle Smart Contract Platform.
- [ ] **T11 (P2)** — Add Gateway/Unified Balance lender onboarding.
- [ ] **T12 (P2)** — Add CI, security scans, deployment record, and final demo runbook.
- [ ] **T13 (P3)** — Add App Kit Bridge/CCTP V2 point-to-point funding only if P1/P2 gates are green.

## 20. Definition of done

The project is “really connected” only when all are true:

- No core golden-path action generates a fake transaction hash.
- Three separate real wallets can act as business, buyer, and lenders.
- USDC actually leaves lender wallets, reaches escrow, advances to the seller, and returns through buyer repayment.
- Contract events reproduce the UI lifecycle after clearing browser storage and reloading.
- Every transaction link resolves on Arcscan.
- Wrong-role, rejected challenge, failed transaction, insufficient USDC, expired auction, and refund paths are visible and recoverable.
- Contract unit/fuzz/invariant tests and frontend/server tests pass in CI.
- The UI plainly labels mock versus Arc mode.
- The demo can start with lender USDC outside Arc and use Gateway to fund an Arc bid.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                        | Runs | Status  | Findings                                                                 |
| ------------- | --------------------- | -------------------------- | ---: | ------- | ------------------------------------------------------------------------ |
| CEO Review    | `/plan-ceo-review`    | Scope and strategy         |    0 | Not run | Core product direction inherited from the approved PRD                   |
| Codex Review  | `/codex review`       | Independent second opinion |    0 | Not run | Not requested                                                            |
| Eng Review    | `/plan-eng-review`    | Architecture and tests     |    1 | Clear   | 6 integration risks addressed; 0 critical silent gaps remain in the plan |
| Design Review | `/plan-design-review` | UI/UX gaps                 |    0 | Not run | Existing UI is reused; real transaction states are specified             |
| DX Review     | `/plan-devex-review`  | Developer experience       |    0 | Not run | CI, environment, deployment record, and module boundaries are specified  |

**VERDICT:** ENG CLEARED — ready to implement Phase 0 and Phase 1.

NO UNRESOLVED DECISIONS
