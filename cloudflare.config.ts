import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "hanoled-web",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-21",
    domains: ["hanoled.com", "www.hanoled.com", "app.hanoled.com"],
    observability: {
      enabled: true,
      traces: { enabled: true },
    },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
