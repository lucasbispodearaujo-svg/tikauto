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
  };
}
