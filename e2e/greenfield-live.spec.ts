import { expect, test } from "@playwright/test";

const slug = "greenfield";
const hsmsId = "10d8969a-be86-47e8-9fe7-602545249bdf";
const hsmsOrigin = "https://api.hanoled.com";
const hcoreOrigin = "https://hanoled-core-api.netlify.app";

test.describe("live Greenfield", () => {
  test.skip(process.env.GREENFIELD_LIVE_QA !== "1", "Live Greenfield tests require explicit opt-in");

  test("the known HSMS school has a matching active HCORE identity", async ({ request }) => {
    const [hsmsResponse, hcoreResponse] = await Promise.all([
      request.get(`${hsmsOrigin}/organizations/${slug}`, { timeout: 10_000, maxRedirects: 0 }),
      request.get(`${hcoreOrigin}/v1/public/organizations`, { timeout: 10_000, maxRedirects: 0 }),
    ]);
    expect(hsmsResponse.ok(), "Live HSMS school lookup").toBe(true);
    expect(hcoreResponse.ok(), "Live HCORE school directory").toBe(true);

    const school: { id: string; slug: string } = await hsmsResponse.json();
    expect(school).toMatchObject({ id: hsmsId, slug });
    const organizations: { id: string; slug: string }[] = await hcoreResponse.json();
    expect(Array.isArray(organizations)).toBe(true);
    const canonical = organizations.find((entry) => entry.slug === slug);
    expect(canonical, "Greenfield needs an active HCORE organization before live sign-in").toBeDefined();
    expect(canonical?.id, "The live HSMS route guard expects the same organization ID").toBe(hsmsId);
  });
});
