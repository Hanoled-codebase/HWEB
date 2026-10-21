// Edge build replacement for Hweb's "@/services/api", whose sign-in screen
// call (school discovery) normally hits HCORE. On the appliance there is no
// HCORE — the device serves one school, which the roster knows. Returning it
// as the single public organization gives the student tab the same
// school-picker experience as online (auto-selected pinned school).
type PublicOrganization = { id: string; name: string; slug: string };

const api: { getPublicOrganizations: () => Promise<PublicOrganization[]> } & Record<string, unknown> = {
  async getPublicOrganizations(): Promise<PublicOrganization[]> {
    try {
      const res = await fetch("/api/edge/roster/status");
      if (!res.ok) throw new Error(`roster status ${res.status}`);
      const body = (await res.json()) as { organization?: { name: string; slug: string } | null };
      return body?.organization ? [{ id: body.organization.slug, name: body.organization.name, slug: body.organization.slug }] : [];
    } catch {
      return [];
    }
  },
};

export { api };
export default api;
