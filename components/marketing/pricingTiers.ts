export type PricingTier = {
  title: string;
  body: string;
  price: string;
  note?: string;
};

export const pricingTiers: PricingTier[] = [
  {
    title: "Fork it",
    body: "MIT licensed. Deploy it yourself. Anthus does nothing and charges nothing.",
    price: "No cost",
  },
  {
    title: "Self-setup, managed",
    body: "You run the CloudFormation template in your account; we operate it and keep the deployment updated. We update our own deployments first.",
    price: "$20 a month",
  },
  {
    title: "Assisted setup, managed",
    body: "We run the setup session with you, then operate it. We keep the deployment updated, updating our own deployments first.",
    price: "$20 a month",
    note: "and $100 once",
  },
  {
    title: "Professional services",
    body: "We build and operate automated newsrooms for you, adapting a deployment to your exact needs, with or without the managed service.",
    price: "Quoted",
  },
];

export const pricingQuestions = [
  {
    question: "What happens if I stop paying?",
    answer: "Your deployment is in your account and stays there. We stop operating it. Nothing is deleted by us.",
  },
  {
    question: "What does managed actually mean?",
    answer: "We apply updates, we watch it, and we go first: our own deployments take every release before yours.",
  },
  {
    question: "Can I start self-setup and move to assisted?",
    answer: "Yes, and the reverse.",
  },
];
