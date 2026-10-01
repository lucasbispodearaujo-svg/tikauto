export const normalizeCnpj = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function validCnpj(value: string) {
  const cnpj = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (base: string) => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, char) => {
      const next = total + (char.charCodeAt(0) - 48) * weight;
      weight = weight === 2 ? 9 : weight - 1;
      return next;
    }, 0);
    return sum % 11 < 2 ? '0' : String(11 - sum % 11);
  };
  return digit(cnpj.slice(0, 12)) === cnpj[12] && digit(cnpj.slice(0, 13)) === cnpj[13];
}
export function companyFields(data: Record<string, unknown>) {
  const s = (key: string) => typeof data[key] === 'string' ? (data[key] as string).trim() : '';
  return {
    name: s('razao_social').slice(0, 150),
    phone: (s('ddd_telefone_1') || s('ddd_telefone_2')).slice(0, 40),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s('email')) ? s('email') : '',
    address: [[s('descricao_tipo_de_logradouro'), s('logradouro')].filter(Boolean).join(' '), s('numero'), s('complemento'), s('bairro'), [s('municipio'), s('uf')].filter(Boolean).join(' / '), s('cep')].filter(Boolean).join(', ').slice(0, 500),
    profile: { tradeName: s('nome_fantasia').slice(0,150), birthDate: /^\d{4}-\d{2}-\d{2}$/.test(s('data_inicio_atividade')) ? s('data_inicio_atividade') : '', cep: s('cep').slice(0,12), street: [s('descricao_tipo_de_logradouro'),s('logradouro')].filter(Boolean).join(' ').slice(0,200), number: s('numero').slice(0,30), complement: s('complemento').slice(0,100), neighborhood: s('bairro').slice(0,100), city: s('municipio').slice(0,100), uf: s('uf').slice(0,2), country: s('uf') === 'EX' ? '' : 'Brasil' },
  };
}
