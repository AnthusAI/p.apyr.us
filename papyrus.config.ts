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
  mastheadSource: "edition",
  sectionLinkStrategy: "route",
  themePack: "papyrus",
  themeTokens: DEFAULT_THEME_PACK_TOKENS,
  renderer: { kind: "pretext" },
  hosting: { kind: "amplify-ssr" },
  readerBasePath: "/information",
  opsChrome: "app",
  corpusKey: "p-apyr-us",
  steeringConfigPath: "corpora/papyrus-steering.yml",
  newsroomSectionsConfigPath: "corpora/papyrus-newsroom-sections.yml",
  analysisProfilesPath: "corpora/papyrus-analysis-profiles.yml",
  publicationName: "Papyrus",
};

export default defineSite({
  brands: [pApyrUsBrand],
  defaultBrand: "p-apyr-us",
  backend: {
    brandId: "p-apyr-us",
    auth: {
      cognitoDomainPrefix: "papyrus-p-apyr-us",
      applyCognitoDomainPrefix: true,
      redirectUrls: [
        "http://localhost:3001/",
        "http://localhost:3001/newsroom",
        "https://p.apyr.us/",
        "https://p.apyr.us/newsroom",
        "https://p-staging.apyr.us/",
        "https://p-staging.apyr.us/newsroom",
      ],
    },
    stagingBuild: { enabled: true },
    features: {
      consoleResponder: false,
      inboundEmail: true,
      slack: false,
      storageBackups: true,
    },
  },
});
