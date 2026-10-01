import { getAdmin } from '@/lib/admin-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await getAdmin(request);
    return Response.json(user ? { name: user.displayName } : { error: 'Acesso não autorizado.' }, { status: user ? 200 : 403, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Não foi possível validar o acesso.' }, { status: 503 }); }
}
