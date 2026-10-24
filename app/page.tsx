import type { Metadata } from "next";
import { headers } from "next/headers";
import PapyrusReaderHome from "@anthusai/papyrus/app/page";
import { MarketingPage } from "../components/marketing/MarketingPage";

export const dynamic = "force-dynamic";

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

const READER_HOST_PREFIX = "read.";


type RootProps = Parameters<typeof PapyrusReaderHome>[0];

export default async function Root(props: RootProps) {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  if (requestHost.startsWith(READER_HOST_PREFIX)) return PapyrusReaderHome(props);
  return <MarketingPage />;
}
