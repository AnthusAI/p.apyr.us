export const readerBasePath = "/information";

export const legacyReaderRedirects = [
  {
    source: "/:year(\\d{4})/:month([a-z]+)/:day(\\d{2})/:rest*",
    destination: `${readerBasePath}/:year/:month/:day/:rest*`,
    permanent: true,
  },
  { source: "/articles/:slug*", destination: `${readerBasePath}/articles/:slug*`, permanent: true },
  { source: "/archive", destination: `${readerBasePath}/archive`, permanent: true },
  { source: "/settings", destination: `${readerBasePath}/settings`, permanent: true },
];
