import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/marketing/pricingTiers.ts", import.meta.url), "utf8");
const expectedInOrder = [
  'rung: "open-source"', 'title: "Open source"', 'price: "Free"', 'availability: "available"',
  'rung: "hosted"', 'title: "Hosted"', 'price: "$20/mo"', 'unit: "per publication"', 'availability: "early-access"', "Bring your own model key. Editions per month are capped.",
  'rung: "dedicated"', 'title: "Dedicated"', 'price: "$300/mo"', 'onboarding: "$1,000 once"', 'availability: "available"',
  'rung: "engagement"', 'title: "Engagement"', 'price: "From $2,500/mo"', 'unit: "newsroom pilots"', 'availability: "available"',
];
let cursor = 0;
for (const text of expectedInOrder) {
  const index = source.indexOf(text, cursor);
  assert.ok(index >= cursor && index !== -1, `missing or out of order: ${text}`);
  cursor = index;
}
assert.equal((source.match(/^\s+rung: "/gm) ?? []).length, 4);
assert.equal((source.match(/^\s+product: "Papyrus",/gm) ?? []).length, 4);
assert.equal((source.match(/^\s+cta: \{/gm) ?? []).length, 4);
assert.ok(source.includes('export const engagementUrl = "https://anth.us/engage/";'));
assert.ok(source.includes('"early-access": { chip: "Early access", ctaLabel: "Request access", ctaHref: engagementUrl, priceQualifier: "planned" }'));
assert.ok(source.includes('beta: { chip: "Beta", ctaLabel: "Start (beta)", priceQualifier: "beta pricing" }'));
assert.ok(source.includes('planned: { chip: "Planned", ctaLabel: "Tell us you want it", ctaHref: engagementUrl, priceQualifier: "planned" }'));
assert.ok(source.includes("available: {}"), "available tiers show no chip");
assert.ok(source.includes("Free during beta, then ${tier.price}"));
assert.ok(source.includes("Beta accounts are free. We give 30 days' notice before billing starts."));
assert.ok(source.includes("Hosted: Anthus pays the infrastructure; model calls are bring your own key or capped by the plan. Dedicated: you pay AWS and your model providers directly; Anthus charges only the operations fee. Engagement: stated in the scope."));
assert.ok(source.includes("Hosted workspaces can be exported and are kept read-only for 90 days. Dedicated deployments stay in your account untouched; we stop operating them and delete nothing."));
for (const retired of ["Fork it", "Self-setup", "Assisted setup", "Professional services"]) {
  assert.ok(!source.includes(retired), `retired tier still present: ${retired}`);
}

const stylesheet = fs.readFileSync(new URL("../components/marketing/marketing.css", import.meta.url), "utf8");
const selectors = stylesheet.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((block) => block.split("{")[0].trim()).filter(Boolean);
for (const selectorList of selectors) {
  if (selectorList.startsWith("@")) continue;
  for (const selector of selectorList.split(",")) {
    assert.ok(selector.includes(".papyrus-marketing") && !/^(body|html)\b/.test(selector.trim()), `unscoped selector: ${selector}`);
  }
}
assert.ok(stylesheet.includes(".papyrus-marketing .pm-chip"));

const page = fs.readFileSync(new URL("../components/marketing/MarketingPage.tsx", import.meta.url), "utf8");
assert.ok(page.includes('href="/information"'));
assert.ok(page.includes("https://github.com/AnthusAI/Papyrus"));
assert.ok(page.includes("availabilityPresentation[tier.availability].chip"), "chips must be driven from the data file");
assert.ok(page.includes('<span className="pm-chip">{chip}</span>'));
assert.ok(page.includes("describeTierCallToAction(tier)"));
assert.ok(page.includes("describeTierPrice(tier)"));
assert.ok(!/\$\d|Early access|Request access/.test(page), "prices, chips and call-to-action text live only in pricingTiers.ts");
assert.ok(!/fetch\(/.test(fs.readFileSync(new URL("../components/marketing/Waitlist.tsx", import.meta.url), "utf8")));
assert.ok(page.includes("const SHOW_WAITLIST = false;"), "waitlist must stay hidden until a real backend exists");
console.log("marketing: ok");
