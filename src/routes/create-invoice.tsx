import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/morrow/app-shell";
import { Amount, Disclaimer, KeyValue, Pill } from "@/components/morrow/primitives";
import { TransactionDialog, useTxRunner } from "@/components/morrow/tx-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMorrow } from "@/lib/morrow/store";
import { expectedReturnFor, formatDate, usdc } from "@/lib/morrow/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/morrow/types";

export const Route = createFileRoute("/create-invoice")({
  head: () => ({
    meta: [
      { title: "Create an invoice — Morrow" },
      {
        name: "description",
        content:
          "Issue a receivable, request buyer acceptance and set the financing terms for your funding auction.",
      },
      { property: "og:title", content: "Create an invoice on Morrow" },
      {
        property: "og:description",
        content: "Three steps from invoice to live funding auction.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CreateInvoicePage,
});

const STEPS = ["Invoice details", "Financing terms", "Review & sign"];

const TX_STEPS = [
  { label: "Hashing invoice documents", detail: "PO, delivery note, invoice PDF" },
  { label: "Registering receivable on Arc", detail: "Writing invoice record" },
  { label: "Notifying buyer for acceptance", detail: "Email + onchain request" },
];

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function CreateInvoicePage() {
  const { createInvoice } = useMorrow();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Invoice | null>(null);
  const [txHash, setTxHash] = useState("");
  const [open, setOpen] = useState(false);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("Design & creative services");
  const [faceValue, setFaceValue] = useState("120000");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO(60));
  const [poRef, setPoRef] = useState("");
  const [advancePct, setAdvancePct] = useState(85);
  const [maxCostApr, setMaxCostApr] = useState(12);
  const [auctionHours, setAuctionHours] = useState("24");

  const face = Number(faceValue) || 0;
  const advance = Math.round(((face * advancePct) / 100) * 1_000_000) / 1_000_000;
  const days = useMemo(() => {
    const diff = (new Date(dueDate).getTime() - new Date(issueDate).getTime()) / 86_400_000;
    return Math.max(1, Math.round(diff));
  }, [dueDate, issueDate]);
  const maxCost = expectedReturnFor(advance, maxCostApr, days);

  const tx = useTxRunner(TX_STEPS);

  const step1Valid =
    /^0x[a-fA-F0-9]{40}$/.test(buyerAddress) &&
    description.trim().length > 2 &&
    face > 0 &&
    days > 0;

  const submit = () => {
    setOpen(true);
    void tx.run(async () => {
      const result = await createInvoice({
        buyerAddress,
        reference: reference.trim(),
        description: description.trim(),
        faceValue: face,
        dueDate,
        advanceRequested: advance,
        maxCostApr,
        auctionDurationHours: Number(auctionHours),
      });
      setTxHash(result.txHash ?? "");
      toast.success("Receivable submitted", {
        description: "Circle approval completed; Arc state will refresh shortly.",
      });
      navigate({ to: "/market" });
    });
  };

  const copyLink = () => {
    if (!created) return;
    const link = `${window.location.origin}/invoice/${created.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link);
    }
    toast.success("Acceptance link copied", { description: link });
  };

  return (
    <AppShell>
      <PageHeader
        title="Create an invoice"
        description="Register a receivable, request buyer acceptance, then open it for funding."
      />

      <ol className="mb-8 flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => {
          const done = created ? true : index < step;
          const active = !created && index === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary-soft text-primary"
                    : done
                      ? "border-success/25 bg-success-soft text-success"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                <span className="num">{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                {label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="hidden h-px w-6 bg-border sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {created ? (
        <div className="animate-fade-up mx-auto max-w-[620px] rounded-xl border border-border bg-card p-7 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-[20px] font-semibold text-foreground">
            {created.ref} is registered on Arc
          </h2>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            We've sent an acceptance request to {created.buyerName}. Once accepted, you can open the
            funding auction.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <KeyValue label="Face value" value={usdc(created.faceValue)} mono />
            <KeyValue label="Advance requested" value={usdc(created.advanceRequested)} mono />
            <KeyValue label="Due date" value={formatDate(created.dueDate)} />
            <KeyValue label="Max financing cost" value={`${created.maxCostApr}% APR`} mono />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="gap-2" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copy acceptance link
            </Button>
            <Button className="gap-2" onClick={() => navigate({ to: "/dashboard/buyer" })}>
              Accept as buyer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Disclaimer className="mt-6 justify-center">
            Demo tip: switch to the Buyer role to accept this invoice instantly.
          </Disclaimer>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            {step === 0 ? (
              <div className="animate-fade-up space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Buyer legal name" htmlFor="buyer">
                    <Input
                      id="buyer"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Northwind Retail Group"
                    />
                  </Field>
                  <Field label="Buyer AP email" htmlFor="buyerEmail">
                    <Input
                      id="buyerEmail"
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="ap@northwind.com"
                    />
                  </Field>
                  <Field label="Buyer Arc wallet address" htmlFor="buyerAddress">
                    <Input
                      id="buyerAddress"
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      placeholder="0x…"
                    />
                  </Field>
                  <Field label="Invoice reference" htmlFor="reference" hint="Optional">
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Auto-generated if blank"
                    />
                  </Field>
                  <Field label="Purchase order" htmlFor="po" hint="Optional">
                    <Input
                      id="po"
                      value={poRef}
                      onChange={(e) => setPoRef(e.target.value)}
                      placeholder="PO-88213"
                    />
                  </Field>
                </div>

                <Field label="Description of goods or services" htmlFor="desc">
                  <Textarea
                    id="desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Q3 brand system and packaging design"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Industry" htmlFor="industry">
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger id="industry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Design & creative services",
                          "Logistics & freight",
                          "Manufacturing",
                          "Software & IT services",
                          "Wholesale & distribution",
                        ].map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Face value (USDC)" htmlFor="face">
                    <Input
                      id="face"
                      inputMode="decimal"
                      className="num"
                      value={faceValue}
                      onChange={(e) => setFaceValue(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </Field>
                  <Field label="Issue date" htmlFor="issue">
                    <Input
                      id="issue"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Due date" htmlFor="due">
                    <Input
                      id="due"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-fade-up space-y-7">
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label>Advance requested</Label>
                    <span className="num text-[13px] font-semibold text-foreground">
                      {advancePct}% · {usdc(advance)}
                    </span>
                  </div>
                  <Slider
                    className="mt-4"
                    value={[advancePct]}
                    min={50}
                    max={95}
                    step={1}
                    onValueChange={([v]) => setAdvancePct(v)}
                  />
                  <p className="mt-2 text-[12.5px] text-muted-foreground">
                    Retention of {100 - advancePct}% ({usdc(face - advance)}) is released to you at
                    settlement, after lenders are repaid.
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <Label>Maximum financing cost</Label>
                    <span className="num text-[13px] font-semibold text-foreground">
                      {maxCostApr.toFixed(1)}% APR
                    </span>
                  </div>
                  <Slider
                    className="mt-4"
                    value={[maxCostApr]}
                    min={4}
                    max={24}
                    step={0.5}
                    onValueChange={([v]) => setMaxCostApr(v)}
                  />
                  <p className="mt-2 text-[12.5px] text-muted-foreground">
                    Bids above your ceiling are rejected automatically. Worst-case cost over {days}{" "}
                    days: <span className="num font-medium text-foreground">{usdc(maxCost)}</span>.
                  </p>
                </div>

                <Field label="Auction duration" htmlFor="duration">
                  <Select value={auctionHours} onValueChange={setAuctionHours}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-fade-up space-y-5">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[13.5px] font-medium text-foreground">
                      {description || "Invoice"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <KeyValue label="Buyer" value={buyerName} />
                    <KeyValue label="Industry" value={industry} />
                    <KeyValue label="Face value" value={usdc(face)} mono />
                    <KeyValue label="Advance requested" value={usdc(advance)} mono />
                    <KeyValue label="Issue date" value={formatDate(issueDate)} />
                    <KeyValue label="Due date" value={formatDate(dueDate)} />
                    <KeyValue label="Term" value={`${days} days`} mono />
                    <KeyValue label="Cost ceiling" value={`${maxCostApr}% APR`} mono />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Signing hashes your invoice documents and registers the receivable on Arc. The
                    buyer must accept before lenders can bid — no invoice is financed without a
                    confirmed payment obligation.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() =>
                  step === 0 ? navigate({ to: "/dashboard/business" }) : setStep(step - 1)
                }
              >
                <ArrowLeft className="h-4 w-4" />
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < 2 ? (
                <Button
                  className="gap-2"
                  disabled={step === 0 && !step1Valid}
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="gap-2" onClick={submit}>
                  Sign & register invoice
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-[84px]">
            <h2 className="text-[15px] font-semibold text-foreground">Funding preview</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Estimated outcome if the auction clears at your ceiling.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
                  Cash you receive now
                </p>
                <Amount value={advance} size="lg" className="mt-1" />
              </div>
              <div className="space-y-2.5 border-t border-border pt-4">
                <Row label="Face value" value={usdc(face)} />
                <Row label={`Retention (${100 - advancePct}%)`} value={usdc(face - advance)} />
                <Row label={`Term`} value={`${days} days`} />
                <Row label="Worst-case cost" value={usdc(maxCost)} strong />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Pill tone="info">Buyer acceptance required</Pill>
                <Pill tone="neutral">USDC settlement</Pill>
              </div>
            </div>
            <Disclaimer className="mt-5">
              Illustrative only. Final pricing is set by lender bids.
            </Disclaimer>
          </aside>
        </div>
      )}

      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        title="Registering invoice on Arc"
        steps={TX_STEPS}
        current={tx.current}
        phase={tx.phase}
        successTitle="Invoice registered"
        successBody={
          <p className="text-[13.5px] text-muted-foreground">
            {created?.ref} is now awaiting buyer acceptance from {created?.buyerName}.
          </p>
        }
        txHash={txHash}
        closeLabel="View next steps"
      />
    </AppShell>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-[11.5px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "num text-[13px]",
          strong ? "font-semibold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
