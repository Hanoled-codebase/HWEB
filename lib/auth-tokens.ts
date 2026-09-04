// Client-side bearer token store.
//
// Session cookies set by our Next.js Server Actions are scoped to the Hweb
// origin (e.g. hweb-three.vercel.app). The backends (HCORE/HSMS/HCBT) live on
// *.hanoled.com, a different registrable domain, so those cookies can never
// be sent on browser fetches to them regardless of CORS or cookie attributes.
// Every backend's auth middleware already accepts `Authorization: Bearer`
// as an alternative to cookies, so client-side requests carry the token
// explicitly instead of relying on credentials:"include".

const HCORE_TOKEN_KEY = "hanoled_hcore_token";
const HCBT_TOKEN_KEY = "hanoled_hcbt_token";

export function setAuthTokens(tokens: { hcoreToken?: string | null; hcbtToken?: string | null }) {
  if (typeof window === "undefined") return;
  if (tokens.hcoreToken) localStorage.setItem(HCORE_TOKEN_KEY, tokens.hcoreToken);
  if (tokens.hcbtToken) localStorage.setItem(HCBT_TOKEN_KEY, tokens.hcbtToken);
}

export function getHcoreToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HCORE_TOKEN_KEY);
}

export function getHcbtToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HCBT_TOKEN_KEY);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HCORE_TOKEN_KEY);
  localStorage.removeItem(HCBT_TOKEN_KEY);
}
