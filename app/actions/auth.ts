'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_HCORE_API_URL || 'http://localhost:4000';

export async function loginAction(prevState: any, formData: FormData) {
  const identifierType = formData.get('identifierType') as string;
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;
  const organizationSlugOrId = formData.get('organizationSlugOrId') as string;

  try {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
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

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Login failed' };
    }

    if (data.token) {
      const cookieStore = await cookies();
      cookieStore.set('hcore_session', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600, // 1 hour
        path: '/',
      });
      return { success: true, redirectUrl: '/dashboard' }; // or /cbt/student based on roles
    }

    return { error: 'No token received' };
  } catch (err: any) {
    return { error: 'Network error. Please ensure Hcore API is running.' };
  }
}

export async function registerAction(prevState: any, formData: FormData) {
  const displayName = formData.get('displayName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const organizationName = formData.get('organizationName') as string;
  const organizationSlug = formData.get('organizationSlug') as string;

  try {
    const res = await fetch(`${API_BASE}/v1/auth/register`, {
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
      cookieStore.set('hcore_session', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600,
        path: '/',
      });
      return { success: true, redirectUrl: '/dashboard' };
    }

    return { error: 'No token received' };
  } catch (err: any) {
    return { error: 'Network error. Please ensure Hcore API is running.' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('hcore_session');
  redirect('/signin');
}
