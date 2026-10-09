import type { Metadata } from "next";
import { MarketingPage } from "../components/marketing/MarketingPage";

export const metadata: Metadata = {
  title: "Papyrus: a newsroom with a long memory",
  description: "Papyrus turns one subject worth following into a living publication. Open source, runs in your AWS account.",
  alternates: { canonical: "https://p.apyr.us/" },
  openGraph: {
    title: "Papyrus: a newsroom with a long memory",
    description: "Open-source, AI-assisted publishing that runs in your AWS account.",
    url: "https://p.apyr.us/",
    siteName: "Papyrus",
    type: "website",
  },
};

export default function MarketingRoot() {
  return <MarketingPage />;
}
