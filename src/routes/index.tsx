import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Globe2,
  Layers,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/morrow/marketing";
import {
  Amount,
  Disclaimer,
  Pill,
  ProgressBar,
  SectionHeading,
} from "@/components/morrow/primitives";
import { WaterfallBars } from "@/components/morrow/waterfall";
import { LifecycleScene } from "@/components/morrow/lifecycle-scene";
import { HeroAuctionCard } from "@/components/morrow/hero-auction-card";
import { usdc } from "@/lib/morrow/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Morrow — Sell tomorrow's receivable for today's USDC" },
      {
        name: "description",
        content:
          "Morrow is a stablecoin-native receivables credit market on Arc. Buyers confirm invoices, lenders compete to finance them, and settlement is automatic.",
      },
      { property: "og:title", content: "Morrow — Receivables credit market on Arc" },
      {
        property: "og:description",
        content:
          "Turn buyer-accepted B2B invoices into transparent, financeable USDC cash flows with deterministic settlement.",
      },
      {
        name: "keywords",
        content:
          "receivables financing, invoice factoring, USDC, Arc, stablecoin credit market, B2B working capital",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: "/morrow-og.jpg" },
      { name: "twitter:image", content: "/morrow-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Verified obligations",
    body: "Only invoices a buyer has explicitly accepted enter the market, with evidence hashes recorded onchain.",
    icon: ShieldCheck,
  },
  {
    title: "Competitive funding",
    body: "Rate discovery through open auctions rather than a single lender quoting a take-it-or-leave-it discount.",
    icon: Banknote,
  },
  {
    title: "Programmable settlement",
    body: "The waterfall is defined before funding: fee, lender principal and return, then business remainder.",
    icon: Layers,
  },
  {
    title: "Crosschain USDC liquidity",
    body: "Lenders fund from balances held across chains and allocate to Arc without leaving the app.",
    icon: Globe2,
  },
];

const WATERFALL_LEGS = [
  { label: "Protocol servicing fee", amount: 50, tone: "fee" as const },
  { label: "Lender principal", amount: 9_200, tone: "lender" as const },
  { label: "Lender return", amount: 300, tone: "lender" as const },
  { label: "Business remainder", amount: 450, tone: "business" as const },
];

const MARKET_PREVIEW = [
  {
    ref: "INV-2048",
    seller: "Aster Studio",
    buyer: "Northstar Labs",
    face: 10_000,
    advance: 9_200,
    days: 45,
    apr: 8.4,
    funded: 78,
    risk: "Low–moderate risk",
  },
  {
    ref: "INV-2051",
    seller: "Aster Studio",
    buyer: "Atlas Commerce",
    face: 18_500,
    advance: 17_020,
    days: 30,
    apr: 7.9,
    funded: 42,
    risk: "Low risk",
  },
  {
    ref: "INV-2062",
    seller: "Kestrel Logistics",
    buyer: "Orbit Freight",
    face: 25_000,
    advance: 23_000,
    days: 60,
    apr: 10.2,
    funded: 25,
    risk: "Moderate risk",
  },
];

const STACK = [
  {
    name: "Arc",
    body: "The settlement chain. Invoice state, funding claims and the payment waterfall all finalize here in about a second.",
  },
  {
    name: "USDC",
    body: "The unit of account. Advances, bids, repayments and fees are denominated and moved in USDC — no volatile collateral.",
  },
  {
    name: "Circle Wallets",
    body: "Businesses and buyers sign with an email-created wallet. No seed phrase, no browser extension required.",
  },
  {
    name: "App Kit",
    body: "Handles onboarding, session management and signing prompts so finance teams see a normal approval flow.",
  },
  {
    name: "Gateway",
    body: "Gives lenders one unified USDC balance across chains, so idle capital anywhere can be committed to an Arc auction.",
  },
  {
    name: "CCTP",
    body: "Moves the committed USDC natively to Arc at funding time and returns proceeds to the lender's preferred chain.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <Hero />
      <Workflow />
      <WhyMorrow />
      <WaterfallSection />
      <MarketPreview />
      <StackSection />
      <FinalCta />
      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-canvas pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto grid w-full max-w-[1200px] gap-14 px-5 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:py-24">
        <div className="animate-fade-up">
          <Pill tone="info" className="px-3 py-1.5">
            Illustrative product walkthrough
          </Pill>
          <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-foreground sm:text-[56px]">
            Sell tomorrow's receivable for today's USDC.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Buyers confirm invoices, lenders compete to finance them, and Arc settles every payment
            automatically.
          </p>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Morrow transforms accepted B2B invoices into transparent, financeable USDC cash flows.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/connect" search={{ next: "/dashboard/business" }}>
              <Button size="lg" className="gap-2">
                Launch app
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/market">
              <Button size="lg" variant="outline">
                View market
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-[12.5px] font-medium text-muted-foreground">
            USDC-native • Buyer-accepted • Deterministic settlement
          </p>
        </div>

        <HeroAuctionCard />
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Lifecycle"
          title="Three steps from invoice to settled USDC"
          description="One receivable moves through a single deterministic path. Every participant sees the same state."
          align="center"
        />
        <LifecycleScene />
      </div>
    </section>
  );
}

function WhyMorrow() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Why Morrow"
          title="Credit infrastructure, not a lending pool"
          description="Each receivable is financed on its own merits, with the obligation, the pricing and the payout path all explicit."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-raised"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-foreground">
                <feature.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[15.5px] font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaterfallSection() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="min-w-0">
          <SectionHeading
            eyebrow="Settlement waterfall"
            title="Every payment splits the same way, every time"
            description="The distribution is agreed before a single USDC is advanced. When the buyer pays, the vault executes it without discretion."
          />
          <ul className="mt-6 space-y-3">
            {[
              "Full payment clears the fee, then lender claims, then the business remainder.",
              "Partial payment distributes pro-rata and keeps the remaining claim open.",
              "Late payment accrues against the business remainder before lender returns are reduced.",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-[13.5px] text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-raised sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Buyer payment received
              </p>
              <Amount value={10_000} size="xl" />
            </div>
            <Pill tone="neutral">INV-2048</Pill>
          </div>
          <div className="mt-8">
            <WaterfallBars total={10_000} legs={WATERFALL_LEGS} />
          </div>
          <Disclaimer className="mt-6">
            Illustrative distribution for the demo receivable. Test USDC only.
          </Disclaimer>
        </div>
      </div>
    </section>
  );
}

function MarketPreview() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Illustrative market preview"
            title="How buyer-accepted receivables appear"
          />
          <Link to="/market">
            <Button variant="outline" className="gap-2">
              Browse receivables
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {MARKET_PREVIEW.map((item) => (
            <div key={item.ref} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">{item.buyer}</p>
                  <p className="text-[12px] text-muted-foreground">Seller · {item.seller}</p>
                </div>
                <Pill tone="success">Accepted</Pill>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <Amount value={item.face} size="md" suffix={null} />
                <span className="num text-[13px] font-semibold text-primary">{item.apr}% APR</span>
              </div>
              <p className="num mt-1 text-[12px] text-muted-foreground">
                {usdc(item.advance, { decimals: 0 })} USDC advance · {item.days} days
              </p>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[12px] text-muted-foreground">
                  <span>{item.funded}% funded</span>
                  <span>{item.risk}</span>
                </div>
                <ProgressBar value={item.funded} height={6} />
              </div>
            </div>
          ))}
        </div>
        <Disclaimer className="mt-6">
          Illustrative product walkthrough only. Visit the public market for live Arc contract data.
        </Disclaimer>
      </div>
    </section>
  );
}

function StackSection() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Built on Arc and Circle"
          title="What each piece actually does in Morrow"
          description="No logo wall. Here is the specific job each component performs in the receivable lifecycle."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item) => (
            <div key={item.name} className="bg-card p-6">
              <p className="text-[14px] font-semibold text-foreground">{item.name}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section>
      <div className="mx-auto w-full max-w-[1200px] px-5 py-20">
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-raised sm:px-12">
          <h2 className="mx-auto max-w-2xl text-[30px] leading-tight font-semibold text-foreground sm:text-[38px]">
            Turn accepted invoices into working capital.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground">
            Issue a receivable, collect buyer acceptance, take competitive bids, and settle with
            Circle wallet approvals on Arc Testnet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/connect" search={{ next: "/dashboard/business" }}>
              <Button size="lg" className="gap-2">
                Launch app
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/market">
              <Button size="lg" variant="outline">
                Browse receivables
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
