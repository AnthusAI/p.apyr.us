import { withPapyrus } from "@anthusai/papyrus/next";
import { legacyReaderRedirects } from "./legacyRedirects.mjs";

export default withPapyrus({
  async redirects() {
    return legacyReaderRedirects;
  },
});
