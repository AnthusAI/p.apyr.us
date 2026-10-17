export type PricingRung = "open-source" | "hosted" | "dedicated" | "engagement";

export type PricingAvailability = "available" | "beta" | "early-access" | "planned";

export type PricingCallToAction = {
  label: string;
  href: string;
};

export type PricingTier = {
  product: "Papyrus";
  rung: PricingRung;
  title: string;
  body: string;
  price: string;
  unit?: string;
  onboarding?: string;
  availability: PricingAvailability;
  note?: string;
  cta: PricingCallToAction;
};

export const engagementUrl = "https://anth.us/engage/";

export const pricingTiers: PricingTier[] = [
  {
    product: "Papyrus",
    rung: "open-source",
    title: "Open source",
    body: "MIT licensed. You deploy it and run it. Anthus does nothing and charges nothing.",
    price: "Free",
    availability: "available",
    cta: { label: "Get the source", href: "https://github.com/AnthusAI/Papyrus" },
  },
  {
    product: "Papyrus",
    rung: "hosted",
    title: "Hosted",
    body: "A publication in Anthus's multi-tenant service, under one Anthus account. We operate everything. Flat monthly fee with a hard usage allowance and no automatic overage.",
    price: "$20/mo",
    unit: "per publication",
    availability: "early-access",
    note: "Bring your own model key. Editions per month are capped.",
    cta: { label: "Start", href: engagementUrl },
  },
  {
    product: "Papyrus",
    rung: "dedicated",
    title: "Dedicated",
    body: "Deployed in your AWS account. We operate it and keep it updated, and we update our own deployments first. You pay AWS and your model providers directly.",
    price: "$300/mo",
    onboarding: "$1,000 once",
    availability: "available",
    cta: { label: "Talk to us", href: engagementUrl },
  },
  {
    product: "Papyrus",
    rung: "engagement",
    title: "Engagement",
    body: "We build an automated newsroom for you with any of the Anthus tools, and operate it if you want. A fixed-scope pilot with a published floor, then monthly.",
    price: "From $2,500/mo",
    unit: "newsroom pilots",
    availability: "available",
    cta: { label: "Talk to us", href: engagementUrl },
  },
];

export type AvailabilityPresentation = {
  chip?: string;
  ctaLabel?: string;
  ctaHref?: string;
  priceQualifier?: string;
};

export const availabilityPresentation: Record<PricingAvailability, AvailabilityPresentation> = {
  available: {},
  beta: { chip: "Beta", ctaLabel: "Start (beta)", priceQualifier: "beta pricing" },
  "early-access": { chip: "Early access", ctaLabel: "Request access", ctaHref: engagementUrl, priceQualifier: "planned" },
  planned: { chip: "Planned", ctaLabel: "Tell us you want it", ctaHref: engagementUrl, priceQualifier: "planned" },
};

export const betaHostedFootnote = "Beta accounts are free. We give 30 days' notice before billing starts.";

export function describeTierPrice(tier: PricingTier): { headline: string; details: string[] } {
  const presentation = availabilityPresentation[tier.availability];
  const isHostedBeta = tier.rung === "hosted" && tier.availability === "beta";
  const headline = isHostedBeta ? `Free during beta, then ${tier.price}` : tier.price;
  const details = [
    tier.unit,
    tier.onboarding ? `plus ${tier.onboarding} onboarding` : undefined,
    isHostedBeta ? undefined : presentation.priceQualifier,
  ].filter((detail): detail is string => Boolean(detail));
  return { headline, details };
}

export function describeTierCallToAction(tier: PricingTier): PricingCallToAction {
  const presentation = availabilityPresentation[tier.availability];
  return {
    label: presentation.ctaLabel ?? tier.cta.label,
    href: presentation.ctaHref ?? tier.cta.href,
  };
}

export function describeTierFootnote(tier: PricingTier): string | undefined {
  return tier.rung === "hosted" && tier.availability === "beta" ? betaHostedFootnote : undefined;
}

export const pricingQuestions = [
  {
    question: "Who pays for what?",
    answer: "Hosted: Anthus pays the infrastructure; model calls are bring your own key or capped by the plan. Dedicated: you pay AWS and your model providers directly; Anthus charges only the operations fee. Engagement: stated in the scope.",
  },
  {
    question: "What happens if I stop paying?",
    answer: "Hosted workspaces can be exported and are kept read-only for 90 days. Dedicated deployments stay in your account untouched; we stop operating them and delete nothing.",
  },
  {
    question: "What does dedicated actually mean?",
    answer: "Your data never leaves your account. Your own model contracts and keys. Your compliance boundary. No noisy neighbors. You keep running if Anthus disappears. The monthly fee buys updates, monitoring, and a team that has run the same deployment first: we update our own deployments before yours.",
  },
  {
    question: "Can I start hosted and move to dedicated?",
    answer: "Yes, and the reverse.",
  },
];
