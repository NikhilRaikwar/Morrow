# Morrow Demo Video Script

Target length: 3 minutes.

## 0:00-0:15 - Hook

"Morrow is a stablecoin-native receivables credit market on Arc. A business can turn a buyer-accepted invoice into immediate USDC, lenders compete on APR, and the buyer's later repayment settles everyone automatically."

Show:

- Landing page.
- Hero auction walkthrough.
- Lifecycle animation: buyer accepts, lenders bid, payment settles.

## 0:15-0:35 - Problem

"B2B invoices are slow money. A supplier may have a real buyer obligation but still wait 30 to 90 days for cash. Traditional factoring is opaque, lender-specific, and settlement is manual."

Show:

- Scroll to settlement waterfall.
- Explain that the demo values are illustrative, while live market data comes from Arc.

## 0:35-0:55 - Solution

"Morrow separates the lifecycle into three onchain commitments: the business registers the receivable, the buyer accepts it, and lenders compete to fund it. The contract escrows bids and later distributes USDC through one deterministic waterfall."

Show:

- Public market.
- Explain empty state if no open receivables are currently live.

## 0:55-1:25 - Business Creates Receivable

Show:

- Launch app.
- Google sign-in with Circle.
- Business workspace.
- Create receivable.

Say:

"The business enters the buyer wallet address, invoice face value, requested advance, due date, and maximum APR. Morrow stores a document digest and terms on Arc. No private invoice PDF is put onchain."

Recommended demo values:

- Buyer address: second Chrome profile Circle wallet.
- Face value: `10 USDC`.
- Advance: `8.50 USDC`.
- Due date: about 30 to 60 days out.
- APR ceiling: `12%`.

## 1:25-1:50 - Buyer Accepts

Show:

- Second Chrome profile.
- Buyer dashboard.
- Pending invoice.
- Circle confirmation dialog.

Say:

"The buyer does not pay early. They simply confirm that this is a valid payable. After acceptance, lenders can trust that the receivable represents a buyer-confirmed obligation."

## 1:50-2:20 - Funding Auction

Show:

- Business opens auction.
- Circle confirmation.
- Lender profile places bid if available.

Say:

"The business opens a funding auction. Lenders approve USDC and bid amount plus APR. The contract fills the lowest eligible APR first, with deterministic tie-breaking."

If lender flow is not funded during recording:

"This live testnet build has the full Circle challenge path wired. If the demo wallet has insufficient test USDC, I show the open auction and the Arcscan transaction proof instead of faking bids."

## 2:20-2:45 - Settlement

Show:

- Invoice detail.
- Arcscan links.
- Activity page.

Say:

"When the buyer repays in USDC, Morrow distributes the payment automatically: protocol fee, lender principal and return, then business remainder. The dashboard refreshes from Arc contract events, not a mock database."

## 2:45-3:00 - Why It Matters

"Arc makes this possible because USDC is the native money layer. Circle wallets make approvals usable for normal businesses. Morrow turns receivables into programmable, transparent, stablecoin-native credit."

Final shot:

- README or landing final CTA.
- Arcscan verified contract.

## Recording Checklist

- Use three browser profiles if possible: business, buyer, lender.
- Keep Arcscan tabs ready for contract and transaction proof.
- Do not show `.env`, Circle console secrets, private keys, or API keys.
- If a wallet lacks test USDC, say it plainly and show the onchain step that completed.
- Submit the deployed app link: `https://morrow.nikhilraikwar.me`.
