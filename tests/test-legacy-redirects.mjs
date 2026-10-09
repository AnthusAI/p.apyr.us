import assert from "node:assert/strict";
import { match } from "path-to-regexp";
import { legacyReaderRedirects } from "../legacyRedirects.mjs";

function evaluate(pathname) {
  for (const rule of legacyReaderRedirects) {
    const result = match(rule.source)(pathname);
    if (result) {
      const destination = rule.destination.replace(/\/:(\w+)\*?/g, (_whole, name) => {
        const value = result.params[name];
        if (value === undefined) return "";
        return `/${Array.isArray(value) ? value.join("/") : value}`;
      });
      return { destination, permanent: rule.permanent };
    }
  }
  return null;
}

assert.deepEqual(evaluate("/2026/october/07"), { destination: "/information/2026/october/07", permanent: true });
assert.equal(evaluate("/2026/october/07/page/2").destination, "/information/2026/october/07/page/2");
assert.equal(evaluate("/2026/october/07/section/ai").destination, "/information/2026/october/07/section/ai");
assert.equal(evaluate("/2026/october/07/some-slug").destination, "/information/2026/october/07/some-slug");
assert.equal(evaluate("/articles/example-slug").destination, "/information/articles/example-slug");
assert.equal(evaluate("/archive").destination, "/information/archive");
assert.equal(evaluate("/settings").destination, "/information/settings");
for (const untouched of ["/", "/newsroom", "/newsroom/articles", "/api/media/x", "/information", "/information/archive"]) {
  assert.equal(evaluate(untouched), null, untouched);
}
console.log("legacy redirects: ok");
