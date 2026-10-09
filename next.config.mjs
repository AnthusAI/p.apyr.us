import { withPapyrus } from "@anthusai/papyrus/next";
import { legacyReaderRedirects } from "./legacyRedirects.mjs";

export default withPapyrus({
  outputFileTracingIncludes: {
    "/**": ["./corpora/**/*"],
  },
  async redirects() {
    return legacyReaderRedirects;
  },
});
