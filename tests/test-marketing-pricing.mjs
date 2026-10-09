import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/marketing/pricingTiers.ts", import.meta.url), "utf8");
const expectedInOrder = ["Fork it", "No cost", "Self-setup, managed", "$20 a month", "Assisted setup, managed", "and $100 once", "Professional services", "Quoted"];
let cursor = 0;
for (const text of expectedInOrder) {
  const index = source.indexOf(text, cursor);
  assert.ok(index >= cursor && index !== -1, `missing or out of order: ${text}`);
  cursor = index;
}
assert.equal((source.match(/^\s+title: "/gm) ?? []).length, 4);

const stylesheet = fs.readFileSync(new URL("../components/marketing/marketing.css", import.meta.url), "utf8");
const selectors = stylesheet.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((block) => block.split("{")[0].trim()).filter(Boolean);
for (const selectorList of selectors) {
  if (selectorList.startsWith("@")) continue;
  for (const selector of selectorList.split(",")) {
    assert.ok(selector.includes(".papyrus-marketing") && !/^(body|html)\b/.test(selector.trim()), `unscoped selector: ${selector}`);
  }
}

const page = fs.readFileSync(new URL("../components/marketing/MarketingPage.tsx", import.meta.url), "utf8");
assert.ok(page.includes('href="/information"'));
assert.ok(page.includes("https://github.com/AnthusAI/Papyrus"));
assert.ok(!/fetch\(/.test(fs.readFileSync(new URL("../components/marketing/Waitlist.tsx", import.meta.url), "utf8")));
console.log("marketing: ok");
