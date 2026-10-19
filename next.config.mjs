import { withPapyrus } from "@anthusai/papyrus/next";

export default withPapyrus({
  outputFileTracingIncludes: {
    "/**": ["./corpora/**/*"],
  },
});
