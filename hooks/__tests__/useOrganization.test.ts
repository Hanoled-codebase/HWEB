import { beforeEach, describe, expect, it, vi } from "vitest";

// The store reads org identity from HCORE but branding (logo/contact) from
// HSMS. Mock the api module so the test stays offline and deterministic.
vi.mock("@/lib/api", () => ({
  request: vi.fn(),
  apiFetch: vi.fn(),
  isForbiddenError: () => false,
  HCORE_BASE: "http://hcore",
  HSMS_BASE: "http://hsms",
  HCBT_BASE: "http://hcbt",
  EDGE_MODE: false,
}));

import { request } from "@/lib/api";
import { useOrganization } from "@/hooks/useOrganization";

const req = request as unknown as ReturnType<typeof vi.fn>;

const LOGO = "https://res.cloudinary.com/demo/logo.png";

const greenfieldContext = {
  organizations: [
    { id: "org-1", name: "Greenfield Academy", slug: "greenfield-academy" },
  ],
};

const greenfieldBranding = {
  id: "org-1",
  name: "Greenfield Academy",
  slug: "greenfield-academy",
  logo: LOGO,
  email: "hello@greenfield.edu.ng",
  phone: "+2348000000000",
  address: "1 School Road",
};

/** Answer calls by (base, endpoint) instead of call order. */
function routeRequest(handlers: Record<string, unknown>) {
  req.mockImplementation((base: string, endpoint: string) => {
    const key = `${base} ${endpoint}`;
    if (key in handlers) return Promise.resolve(handlers[key]);
    return Promise.reject(new Error(`unexpected request: ${key}`));
  });
}

describe("useOrganization branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOrganization.getState().clear();
  });

  it("merges the HSMS logo into the org list (school switcher)", async () => {
    routeRequest({
      "http://hcore /v1/me/contexts": greenfieldContext,
      "http://hsms /organizations/greenfield-academy": greenfieldBranding,
    });

    await useOrganization.getState().fetchOrgs();

    const [org] = useOrganization.getState().organizations;
    // HCORE's context list has no logo; the HSMS read supplies it.
    expect(org.logo).toBe(LOGO);
    expect(org.email).toBe("hello@greenfield.edu.ng");
  });

  it("puts the logo on the active school (sidebar, reports, transcript)", async () => {
    routeRequest({
      "http://hcore /v1/me/contexts": greenfieldContext,
      "http://hcore /v1/directory/organizations/greenfield-academy/member-profile": {
        id: "m-1",
        user: null,
        organization: null,
        role: "owner",
        assignedClasses: [],
        assignedStudents: [],
      },
      "http://hsms /organizations/greenfield-academy": greenfieldBranding,
    });

    await useOrganization.getState().setCurrentOrg("greenfield-academy");

    expect(useOrganization.getState().currentOrg?.logo).toBe(LOGO);
    expect(useOrganization.getState().currentOrg?.address).toBe("1 School Road");
  });

  it("reflects a saved logo immediately without a reload", () => {
    const before = {
      ...greenfieldBranding,
      logo: undefined as string | undefined,
      counts: { students: 0, teachers: 0, parents: 0 },
    };
    useOrganization.setState({ currentOrg: before, organizations: [before] });

    useOrganization.getState().updateCurrentOrg({ logo: LOGO });

    expect(useOrganization.getState().currentOrg?.logo).toBe(LOGO);
    expect(useOrganization.getState().organizations[0].logo).toBe(LOGO);
  });
});
