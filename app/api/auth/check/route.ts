import { getVerifiedUser, adminEmail } from '@/lib/admin-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await getVerifiedUser(request);
    return Response.json(user ? { role: user.email?.toLowerCase() === adminEmail ? 'admin' : 'client' } : { error: 'Acesso não autorizado.' }, { status: user ? 200 : 403, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Não foi possível validar o acesso.' }, { status: 503 }); }
}
