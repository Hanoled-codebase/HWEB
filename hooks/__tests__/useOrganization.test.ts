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

  it("fetches contexts, member profile, and branding in parallel on cold school load", async () => {
    const started: string[] = [];
    let releaseContexts!: () => void;
    const contextsGate = new Promise<void>((resolve) => {
      releaseContexts = resolve;
    });

    req.mockImplementation(async (base: string, endpoint: string) => {
      const key = `${base} ${endpoint}`;
      started.push(key);
      if (key === "http://hcore /v1/me/contexts") {
        await contextsGate;
        return greenfieldContext;
      }
      if (key === "http://hcore /v1/directory/organizations/greenfield-academy/member-profile") {
        return {
          id: "m-1",
          user: null,
          organization: null,
          role: "owner",
          assignedClasses: [],
          assignedStudents: [],
        };
      }
      if (key === "http://hsms /organizations/greenfield-academy") {
        return greenfieldBranding;
      }
      return Promise.reject(new Error(`unexpected request: ${key}`));
    });

    const loadPromise = useOrganization.getState().setCurrentOrg("greenfield-academy");
    // Before /v1/me/contexts even resolves, member-profile and branding have already started.
    await Promise.resolve();
    expect(started).toContain("http://hcore /v1/me/contexts");
    expect(started).toContain("http://hcore /v1/directory/organizations/greenfield-academy/member-profile");
    expect(started).toContain("http://hsms /organizations/greenfield-academy");

    releaseContexts();
    await loadPromise;
    expect(useOrganization.getState().currentOrg?.logo).toBe(LOGO);
  });

  it("merges HCORE subscription plan and HSMS category, type, and ID settings on cold load", async () => {
    routeRequest({
      "http://hcore /v1/me/contexts": {
        organizations: [
          {
            id: "org-1",
            name: "Greenfield Academy",
            slug: "greenfield-academy",
            subscribed: ["HSMS"],
            products: { HSMS: { status: "TRIALING", roles: ["SCHOOL_ADMIN"] } },
            subscription: { plan: "Standard", status: "ACTIVE" },
          },
        ],
      },
      "http://hcore /v1/directory/organizations/greenfield-academy/member-profile": {
        id: "m-1",
        user: null,
        organization: null,
        role: "owner",
        assignedClasses: [],
        assignedStudents: [],
      },
      "http://hsms /organizations/greenfield-academy/member-profile": {
        organization: {
          id: "org-1",
          category: "secondary",
          schoolType: "private",
          country: "Nigeria",
          idPrefix: "GFA",
          nextIdSequence: 12,
          subscriptionTier: "free",
          paymentStatus: "inactive",
        },
      },
      "http://hsms /organizations/greenfield-academy": {
        ...greenfieldBranding,
        category: "secondary",
        schoolType: "private",
        country: "Nigeria",
      },
    });

    await useOrganization.getState().setCurrentOrg("greenfield-academy");

    expect(useOrganization.getState().currentOrg).toMatchObject({
      category: "secondary",
      type: "private",
      schoolType: "private",
      country: "Nigeria",
      idPrefix: "GFA",
      nextIdSequence: 12,
      subscription: { plan: "Standard", status: "ACTIVE" },
    });
  });

  it("keeps type, schoolType, idPrefix, and nextIdSequence synced in updateCurrentOrg", () => {
    useOrganization.setState({
      organizations: [{ id: "org-1", name: "Greenfield Academy", slug: "greenfield-academy", counts: { students: 0, teachers: 0, parents: 0 } }],
      currentOrg: { id: "org-1", name: "Greenfield Academy", slug: "greenfield-academy", counts: { students: 0, teachers: 0, parents: 0 } },
    });

    useOrganization.getState().updateCurrentOrg({
      category: "tertiary",
      schoolType: "federal",
      idPrefix: "GFT",
      nextIdSequence: 88,
    });

    expect(useOrganization.getState().currentOrg).toMatchObject({
      category: "tertiary",
      type: "federal",
      schoolType: "federal",
      idPrefix: "GFT",
      nextIdSequence: 88,
    });
    expect(useOrganization.getState().organizations[0]).toMatchObject({
      type: "federal",
      idPrefix: "GFT",
      nextIdSequence: 88,
    });
  });

  it("prefers local HSMS UUIDs and deduplicates HCORE mirrors across assignments, classes, and students", async () => {
    routeRequest({
      "http://hcore /v1/me/contexts": greenfieldContext,
      "http://hcore /v1/directory/organizations/greenfield-academy/member-profile": {
        id: "hcore-m-1",
        user: { id: "hcore-u-1", name: "Teacher One" },
        organization: null,
        role: "member",
        assignedClasses: [{ id: "hcore-cls-1", name: "JSS 1A", level: "JSS 1" }],
        assignedStudents: [{ id: "hcore-stu-1", firstName: "David", lastName: "Okonkwo" }],
        memberAssignments: [
          {
            id: "hcore-a-1",
            type: "SUBJECT_TEACHER",
            classLevelId: "hcore-cls-1",
            subjectId: "hcore-sub-1",
            classLevel: { id: "hcore-cls-1", name: "JSS 1A" },
            subject: { id: "hcore-sub-1", name: "Mathematics" },
          },
        ],
        teachingAssignments: [
          {
            classLevel: { id: "hcore-cls-1", name: "JSS 1A" },
            subject: { id: "hcore-sub-1", name: "Mathematics" },
          },
        ],
      },
      "http://hsms /organizations/greenfield-academy/member-profile": {
        assignedClasses: [{ id: "hsms-cls-1", name: "JSS 1A", level: "JSS 1" }],
        assignedStudents: [{ id: "hsms-stu-1", hcoreLearnerId: "hcore-stu-1", firstName: "David", lastName: "Okonkwo" }],
        memberAssignments: [
          {
            id: "hsms-a-1",
            type: "SUBJECT_TEACHER",
            classLevelId: "hsms-cls-1",
            subjectId: "hsms-sub-1",
            classLevel: { id: "hsms-cls-1", name: "JSS 1A" },
            subject: { id: "hsms-sub-1", name: "Mathematics" },
          },
        ],
      },
      "http://hsms /organizations/greenfield-academy": greenfieldBranding,
    });

    await useOrganization.getState().setCurrentOrg("greenfield-academy");

    const currentMember = useOrganization.getState().currentMember;
    expect(currentMember?.memberAssignments).toHaveLength(1);
    expect(currentMember?.memberAssignments?.[0].classLevel?.id).toBe("hsms-cls-1");
    expect(currentMember?.memberAssignments?.[0].subject?.id).toBe("hsms-sub-1");
    expect(currentMember?.teachingAssignments).toHaveLength(1);
    expect(currentMember?.teachingAssignments?.[0].classLevel?.id).toBe("hsms-cls-1");
    expect(currentMember?.teachingAssignments?.[0].subject?.id).toBe("hsms-sub-1");
    expect(currentMember?.assignedClasses).toHaveLength(1);
    expect(currentMember?.assignedClasses?.[0].id).toBe("hsms-cls-1");
    expect(currentMember?.assignedStudents).toHaveLength(1);
    expect(currentMember?.assignedStudents?.[0].id).toBe("hsms-stu-1");
  });
});
