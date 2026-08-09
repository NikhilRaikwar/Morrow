import { Link, createFileRoute } from "@tanstack/react-router";

import { MarketingFooter, MarketingNav } from "@/components/morrow/marketing";
import { Disclaimer, Pill, SectionHeading } from "@/components/morrow/primitives";
import { WaterfallBars } from "@/components/morrow/waterfall";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://morrow.nikhilraikwar.me";
const PAGE_URL = `${SITE_URL}/how-it-works`;
const SOCIAL_IMAGE = `${SITE_URL}/morrow-og.jpg`;

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Morrow works - receivables financing on Arc" },
      {
        name: "description",
        content:
          "From buyer acceptance to competitive funding and programmable settlement: the Morrow receivables lifecycle.",
      },
      { property: "og:title", content: "How Morrow works" },
      {
        property: "og:description",
        content: "Buyer-accepted invoices, competitive lender auctions, programmable settlement.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:alt", content: "Morrow invoice lifecycle on Arc" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "How Morrow works" },
      {
        name: "twitter:description",
        content: "Buyer acceptance, lender auctions, and USDC settlement on Arc.",
      },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: HowItWorksPage,
});

const STAGES = [
  {
    step: "01",
    title: "Business creates the receivable",
    body: "The business records the buyer, face value, due date, requested advance, and maximum funding cost, then sends the invoice for review.",
    actor: "Business",
  },
  {
    step: "02",
    title: "Buyer accepts the obligation",
    body: "The buyer reviews and accepts the amount, due date, and designated settlement route before the invoice can enter funding.",
    actor: "Buyer",
  },
  {
    step: "03",
    title: "Lenders compete for the allocation",
    body: "Lenders bid an amount and APR. Lower rates fill first until the requested advance is covered; bids above the business's ceiling are rejected.",
    actor: "Lender",
  },
  {
    step: "04",
    title: "The business receives its advance",
    body: "After the requested amount is filled, the business finalizes the auction and receives the USDC advance.",
    actor: "Business",
  },
  {
    step: "05",
    title: "One buyer payment settles every claim",
    body: "The settlement waterfall allocates the protocol fee, lender principal and return, then sends the remaining value to the business.",
    actor: "Everyone",
  },
];

const DEMO_LEGS = [
  { label: "Protocol servicing fee", amount: 92, tone: "fee" as const },
  {
    label: "Lender principal and return",
    sublabel: "9,200.00 principal · 79.99 return",
    amount: 9_279.99,
    tone: "lender" as const,
  },
  { label: "Business remainder", amount: 628.01, tone: "business" as const },
];

const ROLE_CARDS = [
  {
    title: "For businesses",
    body: "Create a receivable, obtain buyer acceptance, compare funding offers, and receive working capital early.",
    cta: { label: "Create an invoice", to: "/create-invoice" as const },
  },
  {
    title: "For lenders",
    body: "Inspect buyer-accepted receivables, compete on amount and APR, and track every funded position.",
    cta: { label: "Browse market", to: "/market" as const },
  },
  {
    title: "For buyers",
    body: "Review the obligation, keep the agreed payment date, pay once, and receive a clear settlement receipt.",
    cta: { label: "Buyer view", to: "/dashboard/buyer" as const },
  },
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <main className="mx-auto w-full max-w-[1100px] px-5 py-16 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="From accepted invoice to settled USDC."
          description="Morrow coordinates buyer acceptance, competitive lender funding, and one transparent repayment flow."
        />

        <ol className="mt-14 space-y-4">
          {STAGES.map((stage, index) => (
            <li
              key={stage.step}
              className="animate-fade-up grid gap-4 rounded-xl border border-border bg-card p-6 shadow-card sm:grid-cols-[auto_1fr]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="num text-[28px] font-semibold text-primary/30">{stage.step}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-foreground">{stage.title}</h2>
                  <Pill tone="neutral">{stage.actor}</Pill>
                </div>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
                  {stage.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-20 rounded-2xl border border-border bg-card p-7 shadow-card">
          <h2 className="text-[20px] font-semibold text-foreground">The settlement waterfall</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
            A 10,000 USDC demo invoice with a 9,200 USDC advance. The buyer's single payment is
            allocated across every claim by the same settlement rules.
          </p>
          <WaterfallBars className="mt-7" total={10_000} legs={DEMO_LEGS} />
          <Disclaimer className="mt-6">
            Illustrative values. Live actions require a Google-authenticated Circle wallet and
            execute against MorrowMarket on Arc Testnet.
          </Disclaimer>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {ROLE_CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <h3 className="text-[15px] font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {card.body}
              </p>
              <Link to={card.cta.to} className="mt-5 inline-block">
                <Button variant="outline" size="sm">
                  {card.cta.label}
                </Button>
              </Link>
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
