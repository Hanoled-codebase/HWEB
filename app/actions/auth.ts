'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAMES, exposeTokensToBrowser, sessionCookieClearTargets, sessionCookieOptions } from '@/lib/session-cookies';
import { signInFailure } from '@/lib/sign-in-errors';
import { isSafeRedirectUrl } from '@/lib/safe-redirect';
import { isPasswordValid, STAFF_PASSWORD_POLICY_MESSAGE } from '@/lib/password-policy';

const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || 'http://localhost:4000';
const HCBT_BASE = process.env.NEXT_PUBLIC_HCBT_URL || 'http://localhost:4002';

/**
 * After a successful HCORE login, exchange the HCORE identity for a HCBT product session.
 * This sets the hcbt_session cookie so CBT pages are immediately authenticated.
 */
async function exchangeHcbtSession(
  token: string,
  principalId?: string,
  email?: string,
  extra?: { roles?: string[]; orgSlug?: string; studentId?: string; learnerId?: string }
): Promise<string | null> {
  try {
    const res = await fetch(`${HCBT_BASE}/api/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        principalId,
        email,
        roles: extra?.roles,
        orgSlug: extra?.orgSlug,
        studentId: extra?.studentId,
        learnerId: extra?.learnerId,
      }),
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    if (body.token) return body.token;
    // Extract set-cookie from the HCBT response
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/hcbt_session=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

export type SignInContext = {
  identifierType: string;
  identifier: string;
  organizationSlugOrId: string;
  callbackUrl: string | null;
};

// The parts of HCORE's login / password-change response used here.
type HcoreSignInResponse = {
  token?: string;
  principal?: { id?: string; email?: string | null };
  roles?: string[];
  activeOrganization?: { slug?: string } | null;
  studentId?: string | null;
  learnerId?: string | null;
};

export type SignInResult =
  | { success: true; redirectUrl: string; hcoreToken?: string; hcbtToken?: string | null }
  | { passwordChangeRequired: true; changeToken: string; context: SignInContext }
  | { error: string; reference?: string; expired?: boolean };

// Everything after HCORE accepts the credentials: session cookies, the HCBT
// session exchange, allowed platforms and where to land.
async function finishSignIn(
  data: HcoreSignInResponse,
  { identifierType, identifier, organizationSlugOrId, callbackUrl }: SignInContext,
): Promise<SignInResult> {
  if (!data.token) return { error: 'No token received' };

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  // Set HCORE session cookie
  cookieStore.set('hcore_session', data.token, sessionCookieOptions(3600 * 24 * 7));

  // Exchange for HCBT session with full role and student context
  const hcbtToken = await exchangeHcbtSession(
    data.token,
    data.principal?.id,
    data.principal?.email || identifier,
    {
      roles: data.roles,
      orgSlug: organizationSlugOrId || data.activeOrganization?.slug,
      studentId: data.studentId ?? undefined,
      learnerId: data.learnerId ?? undefined,
    }
  );
  if (hcbtToken) {
    cookieStore.set('hcbt_session', hcbtToken, sessionCookieOptions(3600 * 24 * 7));
  }

  // Query HCORE for real-time active user context & subscriptions
  let allowedPlatforms: string[] = []; 
  try {
    const meRes = await fetch(`${HCORE_BASE}/v1/me/contexts`, {
      headers: { 'Authorization': `Bearer ${data.token}` },
      cache: 'no-store',
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      const primaryOrg = meData.organizations?.[0];
      if (primaryOrg && Array.isArray(primaryOrg.subscribed) && primaryOrg.subscribed.length > 0) {
        // `subscribed` is org-level (does the school pay for this product at all).
        // Only surface a product to this user if they also hold an actual
        // role in it — otherwise e.g. a Parent at a school that also buys
        // HCBT would be routed into the CBT product with no role there.
        allowedPlatforms = primaryOrg.subscribed.filter(
          (code: string) => (primaryOrg.products?.[code]?.roles?.length ?? 0) > 0
        );
      }

      // Record at sign-in time where a student / exam candidate should be
      // sent. /welcome then redirects from this cookie without a render-time
      // HCORE round-trip, which keeps the reveal deterministic.
      const isCandidate =
        primaryOrg?.products?.HCBT?.roles?.includes('CANDIDATE') ||
        primaryOrg?.products?.HSMS?.roles?.includes('STUDENT');
      if (isCandidate) {
        const slug = primaryOrg?.slug || '';
        cookieStore.set('hweb_candidate_redirect', slug ? `/cbt/student?orgSlug=${encodeURIComponent(slug)}` : '/cbt/student', {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 3600 * 24 * 7,
          path: '/',
        });
      }
    } else {
      console.error(`[probe] loginAction contexts not ok: ${meRes.status}`);
    }
  } catch (e) {
    console.error('Context fetch error in loginAction:', e);
  }

  // If still empty, check existing cookie
  if (allowedPlatforms.length === 0) {
    const existingCookie = cookieStore.get('hweb_allowed_platforms')?.value;
    if (existingCookie) {
      allowedPlatforms = existingCookie.split(',').filter(Boolean);
    } else {
      allowedPlatforms = ['HSMS', 'HCBT'];
    }
  }

  // Set cookie for strict frontend route enforcement
  cookieStore.set('hweb_allowed_platforms', allowedPlatforms.join(','), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 3600 * 24 * 7,
    path: '/',
  });

  if (!allowedPlatforms.includes('HCBT')) {
    // Clear any old HCBT session if org doesn't have CBT entitlement
    cookieStore.delete('hcbt_session');
  }

  // Track user identity type for routing
  const isStudent = identifierType === 'ADMISSION_NUMBER';
  cookieStore.set('hweb_user_role', isStudent ? 'STUDENT' : 'STAFF', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 3600 * 24 * 7,
    path: '/',
  });

  let redirectUrl = isSafeRedirectUrl(callbackUrl) ? callbackUrl! : '/welcome';

  if (isStudent) {
    // Students ALWAYS land directly in their Student Examination Room!
    const orgParam = organizationSlugOrId ? `?orgSlug=${encodeURIComponent(organizationSlugOrId)}` : '';
    redirectUrl = `/cbt/student${orgParam}`;
  } else if (redirectUrl === '/dashboard' || redirectUrl === '/') {
    redirectUrl = '/welcome';
  }

  return { success: true, redirectUrl, hcoreToken: exposeTokensToBrowser() ? data.token : undefined, hcbtToken: exposeTokensToBrowser() ? hcbtToken : null };
}

export async function loginAction(prevState: any, formData: FormData): Promise<SignInResult> {
  const identifierType = formData.get('identifierType') as string;
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;
  const organizationSlugOrId = formData.get('organizationSlugOrId') as string;

  const callbackUrl = formData.get('callbackUrl') as string | null;

  try {
    const res = await fetch(`${HCORE_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifierType,
        identifier,
        password,
        organizationSlugOrId: identifierType === 'ADMISSION_NUMBER' ? organizationSlugOrId : undefined,
        audience: 'hcore-api',
      }),
    });

    // A server fault may not answer in JSON; signInFailure copes with null.
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Correct password, but one the person didn't choose: HCORE issued no
      // session, only a token for the "choose a new password" step.
      if (data?.code === 'PASSWORD_CHANGE_REQUIRED' && data.changeToken) {
        return {
          passwordChangeRequired: true,
          changeToken: data.changeToken,
          context: { identifierType, identifier, organizationSlugOrId, callbackUrl },
        };
      }
      return signInFailure(res, data, 'Something went wrong signing in. Please try again.');
    }

    return await finishSignIn(data ?? {}, { identifierType, identifier, organizationSlugOrId, callbackUrl });
  } catch (err: any) {
    return { error: 'Network error. Please ensure Hcore API is running.' };
  }
}

// Second step of a sign-in that answered PASSWORD_CHANGE_REQUIRED: set the
// new password with the change token, then sign in exactly as loginAction does.
export async function completePasswordChangeAction(_prevState: SignInResult | null, formData: FormData): Promise<SignInResult> {
  const changeToken = formData.get('changeToken') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const context: SignInContext = {
    identifierType: formData.get('identifierType') as string,
    identifier: formData.get('identifier') as string,
    organizationSlugOrId: formData.get('organizationSlugOrId') as string,
    callbackUrl: formData.get('callbackUrl') as string | null,
  };

  if (newPassword !== confirmPassword) {
    return { error: 'The two passwords do not match.' };
  }

  try {
    const res = await fetch(`${HCORE_BASE}/v1/auth/password/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeToken, newPassword, audience: 'hcore-api' }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ...signInFailure(res, data, 'Something went wrong setting your new password. Please try again.'),
        expired: data?.code === 'INVALID_CHANGE_TOKEN',
      };
    }

    return await finishSignIn(data ?? {}, context);
  } catch {
    return { error: 'Network error. Please ensure Hcore API is running.' };
  }
}

export async function registerAction(prevState: any, formData: FormData) {
  const displayName = formData.get('displayName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const organizationName = formData.get('organizationName') as string;
  const organizationSlug = formData.get('organizationSlug') as string;
  
  const platforms = formData.getAll('platforms') as string[];
  if (!platforms || platforms.length === 0) {
    return { error: 'Please select at least one platform subscription.' };
  }

  if (!isPasswordValid(password, 'staff')) {
    return { error: STAFF_PASSWORD_POLICY_MESSAGE };
  }

  try {
    const res = await fetch(`${HCORE_BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        email,
        password,
        organizationName,
        organizationSlug,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Registration failed' };
    }

    if (data.token) {
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === 'production';
      
      cookieStore.set('hcore_session', data.token, sessionCookieOptions(3600));

      // Cancel any unselected subscriptions automatically provisioned by HCORE
      const allPlatforms = ['HSMS', 'HCBT'];
      const orgId = data.organization?.id;
      
      if (orgId) {
        for (const platform of allPlatforms) {
          if (!platforms.includes(platform)) {
            // Unselected, so cancel it in HCORE
            await fetch(`${HCORE_BASE}/v1/organizations/${orgId}/subscriptions/${platform}/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`,
              },
            }).catch(console.error); // Best-effort cancel
          }
        }
      }

      // Set frontend enforcement cookie
      cookieStore.set('hweb_allowed_platforms', platforms.join(','), {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 3600,
        path: '/',
      });

      let hcbtToken: string | null = null;
      if (platforms.includes('HCBT')) {
        hcbtToken = await exchangeHcbtSession(
          data.token,
          data.principal?.id,
          data.principal?.email,
        );
        if (hcbtToken) {
          cookieStore.set('hcbt_session', hcbtToken, sessionCookieOptions(3600));
        }
      }

      console.log('Registration Platforms Selected:', platforms);

      // Always route to welcome screen post-registration for a playful onboarding experience
      const redirectUrl = '/welcome';
      console.log('Redirecting to:', redirectUrl);
      return { success: true, redirectUrl, hcoreToken: exposeTokensToBrowser() ? data.token : undefined, hcbtToken: exposeTokensToBrowser() ? hcbtToken : null };
    }

    return { error: 'No token received' };
  } catch (err: any) {
    console.error('Registration Error:', err);
    return { error: 'Network error. Please ensure Hcore API is running.' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    for (const target of sessionCookieClearTargets(name)) cookieStore.delete(target);
  }
  cookieStore.delete('hweb_allowed_platforms');
  cookieStore.delete('hweb_user_role');
  cookieStore.delete('hweb_candidate_redirect');
  cookieStore.delete('accessToken');
  redirect('/signin');
}
