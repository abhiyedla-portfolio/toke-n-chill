import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/server/auth';
import OpsClient from './OpsClient';

export const metadata = { title: 'Store Operations — Admin', robots: 'noindex' };

export default async function OpsPage() {
  // Server-side auth guard — redirect to login if no valid session
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? '';
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect('/admin/login');
  }

  return <OpsClient />;
}
