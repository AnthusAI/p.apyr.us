import { defineSite } from "@anthusai/papyrus/define-site";
import type { SiteBrand } from "@anthusai/papyrus/lib/site-brand";
import { DEFAULT_THEME_PACK_TOKENS } from "@anthusai/papyrus/lib/site-stack";

const pApyrUsBrand: SiteBrand = {
  id: "p-apyr-us",
  appTitle: "Papyrus",
  appDescription: "Papyrus product site and newspaper: information about information systems.",
  mastheadTitle: "PAPYRUS",
  mastheadSubtitle: "Inside Papyrus",
  backToHomeLabel: "Back to Papyrus",
  articleTitleSuffix: "Papyrus",
  placeholderByline: "Papyrus",
  defaultPresentation: "newsprint",
  textFont: 'Georgia, "Times New Roman", serif',
  mastheadWordSplit: false,
  mastheadDateFormat: "raw",
  mastheadSource: "brand",
  sectionLinkStrategy: "route",
  kanbusTheme: "broadsheet-green",
  themePack: "papyrus",
  themeTokens: DEFAULT_THEME_PACK_TOKENS,
  renderer: { kind: "pretext" },
  hosting: { kind: "amplify-ssr" },
  opsChrome: "app",
  corpusKey: "p-apyr-us",
  steeringConfigPath: "corpora/papyrus-steering.yml",
  newsroomSectionsConfigPath: "corpora/papyrus-newsroom-sections.yml",
  analysisProfilesPath: "corpora/papyrus-analysis-profiles.yml",
  publicationName: "Papyrus",
};

const revalidateSecretParameterIsConfigured = (process.env.PAPYRUS_REVALIDATE_SECRET_PARAMETER ?? "").trim().startsWith("/");

export default defineSite({
  brands: [pApyrUsBrand],
  defaultBrand: "p-apyr-us",
  backend: {
    revalidateBaseUrl: revalidateSecretParameterIsConfigured ? "https://p.apyr.us" : undefined,
    brandId: "p-apyr-us",
    auth: {
      cognitoDomainPrefix: "papyrus-p-apyr-us",
      applyCognitoDomainPrefix: true,
      redirectUrls: [
        "https://main.ds6yswxui41yi.amplifyapp.com/newsroom",
        "https://main.ds6yswxui41yi.amplifyapp.com/",
        "http://localhost:3001/",
        "http://localhost:3001/newsroom",
        "https://p.apyr.us/",
        "https://p.apyr.us/newsroom",
        "https://p-staging.apyr.us/",
        "https://p-staging.apyr.us/newsroom",
        "https://staging.ds6yswxui41yi.amplifyapp.com/",
        "https://staging.ds6yswxui41yi.amplifyapp.com/newsroom",
      ],
    },
    stagingBuild: { enabled: true },
    features: {
      consoleResponder: false,
      inboundEmail: false,
      slack: false,
      storageBackups: true,
    },
  },
});
