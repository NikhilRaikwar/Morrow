import { Link, createFileRoute } from "@tanstack/react-router";

import { MarketingFooter, MarketingNav } from "@/components/morrow/marketing";
import { Disclaimer, Pill, SectionHeading } from "@/components/morrow/primitives";
import { WaterfallBars } from "@/components/morrow/waterfall";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Morrow works — receivables financing on Arc" },
      {
        name: "description",
        content:
          "From buyer acceptance to competitive funding auctions and automatic settlement: the mechanics of the Morrow receivables credit market.",
      },
      { property: "og:title", content: "How Morrow works" },
      {
        property: "og:description",
        content: "Buyer-accepted invoices, competitive lender auctions, programmable settlement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "keywords",
        content:
          "how invoice financing works, receivables auction, settlement waterfall, USDC advance, Arc chain",
      },
      { property: "og:url", content: "/how-it-works" },
      { property: "og:image", content: "/morrow-og.jpg" },
      { name: "twitter:image", content: "/morrow-og.jpg" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorksPage,
});

const STAGES = [
  {
    step: "01",
    title: "The invoice is registered",
    body: "A business issues an invoice and registers it on Arc. Documents are hashed so lenders can verify authenticity without seeing commercial details.",
    actor: "Business",
  },
  {
    step: "02",
    title: "The buyer accepts the obligation",
    body: "The buyer confirms the invoice onchain. Nothing changes for them — same amount, same due date — but the receivable becomes a confirmed payment obligation.",
    actor: "Buyer",
  },
  {
    step: "03",
    title: "Lenders compete in a reverse auction",
    body: "Lenders bid rate and size. Lowest rates fill first until the requested advance is covered, and bids above the seller's ceiling are rejected automatically.",
    actor: "Lender",
  },
  {
    step: "04",
    title: "The advance is released instantly",
    body: "When the auction clears, lender USDC is collected and the advance lands in the seller's wallet in a single Arc transaction.",
    actor: "Business",
  },
  {
    step: "05",
    title: "The buyer pays once, on the due date",
    body: "The buyer sends one USDC payment. The settlement waterfall distributes it — protocol fee, lender principal and return, then the retention back to the business.",
    actor: "Everyone",
  },
];

const DEMO_LEGS = [
  { label: "Protocol servicing fee", amount: 600, tone: "fee" as const },
  {
    label: "Lender principal and return",
    sublabel: "102,000.00 principal · 1,760.00 return",
    amount: 103_760,
    tone: "lender" as const,
  },
  { label: "Business remainder", amount: 15_640, tone: "business" as const },
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <main className="mx-auto w-full max-w-[1100px] px-5 py-16 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="A receivable becomes working capital in five steps."
          description="Morrow turns a buyer-accepted invoice into a priced, funded, self-settling credit instrument."
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
            A 120,000 USDC invoice funded at 85% advance, 9.2% blended APR over 60 days. The buyer's
            single payment splits deterministically.
          </p>
          <WaterfallBars className="mt-7" total={120_000} legs={DEMO_LEGS} />
          <Disclaimer className="mt-6">
            Illustrative example. Actual pricing is set by lender competition.
          </Disclaimer>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "For businesses",
              body: "Access cash tied up in 30–90 day terms without a bank facility or personal guarantee.",
              cta: { label: "Create an invoice", to: "/create-invoice" as const },
            },
            {
              title: "For lenders",
              body: "Short-duration, buyer-confirmed yield with transparent, enforceable repayment.",
              cta: { label: "Browse market", to: "/market" as const },
            },
            {
              title: "For buyers",
              body: "Keep your payment terms while helping suppliers get paid immediately.",
              cta: { label: "Buyer view", to: "/dashboard/buyer" as const },
            },
          ].map((card) => (
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
