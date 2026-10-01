import { getAdmin } from '@/lib/admin-auth';
import { companyFields, normalizeCnpj, validCnpj } from '@/lib/cnpj';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
  try {
    if (!await getAdmin(request)) return reply({ error: 'Entre como administrador para consultar.' }, 401);
    const document = normalizeCnpj(new URL(request.url).searchParams.get('document') ?? '');
    if (!validCnpj(document)) return reply({ error: 'Confira o CNPJ informado.' }, 400);
    const response = await fetch(`https://minhareceita.org/${document}`, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
    if (response.status === 404) return reply({ error: 'Empresa não encontrada. Você pode preencher os dados manualmente.' }, 404);
    if (!response.ok) return reply({ error: 'Consulta indisponível. Tente novamente ou preencha manualmente.' }, 503);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
    const company = data as Record<string, unknown>;
    if (typeof company.cnpj !== 'string' || normalizeCnpj(company.cnpj) !== document) throw new Error('Mismatched CNPJ');
    const fields = companyFields(company);
    if (!fields.name) throw new Error('Missing company name');
    return reply(fields);
  } catch {
    return reply({ error: 'Não foi possível consultar agora. Você pode preencher manualmente.' }, 503);
  }
}
