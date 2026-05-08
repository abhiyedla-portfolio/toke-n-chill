import { checkCredentials, createSessionToken, makeSessionCookie } from '@/lib/server/auth';

export async function POST(request: Request) {
  let username: string;
  let password: string;

  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    username = typeof body.username === 'string' ? body.username.trim() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!username || !password) {
    return Response.json({ error: 'Missing credentials' }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    // Intentional delay to slow brute-force
    await new Promise((r) => setTimeout(r, 500));
    return Response.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const cookie = makeSessionCookie(token);

  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': cookie } },
  );
}
