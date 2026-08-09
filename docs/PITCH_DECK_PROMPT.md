# Pitch Deck Prompt

Use this prompt in Replit Slides, Canva, Gamma, or another slide generator.

```text
Create a YC-style 10-slide pitch deck for "Morrow", a stablecoin-native receivables credit market built on Arc and Circle.

Visual direction:
- White theme, clean fintech SaaS look.
- Serif "Morrow." wordmark style, black text, Arc blue accent (#2563EB), soft USDC green highlights.
- Use diagrams, product screenshots, and subtle motion cues.
- No crypto casino visuals, no dark neon, no token price charts.
- Use clear B2B finance language.

Project one-liner:
Morrow turns buyer-accepted B2B invoices into immediate USDC through competitive lender auctions and deterministic settlement on Arc.

Slide 1 - Title
Headline: Morrow
Subtitle: Buyer-accepted invoices become programmable USDC credit on Arc.
Include: live demo link, GitHub link, Arc Testnet badge, Circle Wallets badge.
Visual: Morrow banner style with invoice -> auction -> settlement rail.

Slide 2 - Problem
Headline: B2B invoices are slow money.
Points:
- Suppliers wait 30-90 days even after buyers approve invoices.
- Traditional factoring is opaque, relationship-driven, and expensive.
- Settlement and lender reconciliation are manual.
- Crypto lending rarely maps to real business cash flows.
Visual: timeline from delivered work to delayed payment.

Slide 3 - Solution
Headline: A receivables credit market with USDC settlement.
Points:
- Business creates a receivable.
- Buyer accepts the payment obligation.
- Lenders compete on APR.
- Smart contract escrows bids and settles repayment automatically.
Visual: four-step lifecycle.

Slide 4 - Why Now
Headline: Stablecoins are becoming internet financial infrastructure.
Points:
- USDC is a practical unit for payment, treasury, and settlement.
- Arc makes USDC the gas and settlement layer.
- Circle wallets make approvals usable without seed phrases.
- Onchain receivables can become programmable money flows.
Visual: USDC rails connecting business, buyer, lender, and contract.

Slide 5 - Product Demo
Headline: Live Arc Testnet MVP.
Points:
- Google login through Circle user-controlled wallets.
- Real Arc Testnet MorrowMarket contract.
- Public read-only market from Arc events.
- Business, buyer, and lender workspaces.
- Circle challenge approval for value-moving actions.
Visual: screenshot collage of landing, market, dashboard, Circle approval.

Slide 6 - Onchain Architecture
Headline: Contract state is the source of truth.
Diagram:
Circle Wallet -> Morrow server allowlist -> Circle challenge -> MorrowMarket -> Arc events -> public market/dashboard.
Callouts:
- Browser cannot submit arbitrary calldata.
- Canonical Arc ERC-20 USDC handles escrow and repayment.
- Webhooks accelerate refresh; Arc receipts remain authoritative.

Slide 7 - Business Model
Headline: Take rate on financed receivables.
Points:
- Protocol servicing fee: 100 bps in MVP.
- Future revenue: origination fee, lender analytics, treasury integrations, invoice verification partners.
- Wedge: stablecoin-native exporters, agencies, software vendors, logistics vendors.
Use simple example:
10,000 USDC invoice -> 9,200 USDC advance -> 100 USDC protocol fee at settlement.

Slide 8 - Market
Headline: Receivables are a massive real-world credit primitive.
Points:
- Every business invoice is a potential short-duration credit asset.
- Initial focus: small B2B suppliers with repeat buyers and predictable payment cycles.
- Morrow starts with testnet rails, then adds identity, verification, and compliance before real-value use.
Visual: funnel from invoices -> buyer accepted -> financeable -> settled.

Slide 9 - Roadmap
Headline: From hackathon MVP to launch.
Milestones:
- Now: Arc Testnet contract, Circle wallet approvals, public market, three-role dashboard.
- Next 4 weeks: durable event index, stronger underwriting metadata, lender portfolio analytics.
- Next 8 weeks: invoice verification partners, Gateway funding rail, business onboarding.
- Production gate: audit, compliance review, KYB/KYC, legal docs, risk engine.

Slide 10 - Ask
Headline: Help us launch stablecoin-native working capital on Arc.
Ask:
- Accelerator support.
- Circle/Arc technical guidance.
- Design partners with repeat B2B invoices.
- Testnet lenders to stress funding auctions.
Closing line:
Morrow makes accepted invoices programmable, financeable, and settleable in USDC.

Animation notes:
- Animate the invoice -> auction -> settlement rail across slides.
- On architecture slide, reveal each trust boundary step one by one.
- On business model slide, count up USDC amounts.
- On roadmap slide, use a horizontal timeline.
```
