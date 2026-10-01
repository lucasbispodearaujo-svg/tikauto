import { z } from 'zod';
const text = (max = 150) => z.string().trim().max(max).default('');
const date = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + 'T12:00:00Z'); return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, 'Confira a data informada.')]).default('');
export const clientProfileSchema = z.object({
  personKind: z.enum(['pf', 'pj']).default('pf'), registrationDate: date,
  tradeName: text(), birthDate: date, sex: text(30), civilStatus: text(40), nationality: text(60), region: text(100), website: text(250), salesperson: text(), finalConsumer: z.boolean().default(true),
  rg: text(30), rgIssuer: text(30), stateRegistration: text(30), municipalRegistration: text(30), taxStatus: z.enum(['', 'contributor', 'exempt', 'non-contributor']).default(''),
  cep: text(12), street: text(200), number: text(30), complement: text(100), neighborhood: text(100), city: text(100), uf: text(2), country: text(60), referencePoint: text(200),
  contactName: text(), secondaryPhone: text(40), referenceName: text(), referencePhone: text(40), notes: text(3000), fiscalNotes: text(1500),
  creditLimit: z.union([z.literal(''),z.string().max(20).refine(value => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 1000000000,'Confira o limite de crédito.')]).default(''), paymentMethod: z.enum(['','Pix','Dinheiro','Transferência','Cartão','Boleto']).default(''), paymentTerms: text(150),
});
export type ClientProfile = z.infer<typeof clientProfileSchema>;
export function readClientProfile(json?: string): ClientProfile {
  try { return clientProfileSchema.parse(JSON.parse(json ?? '{}')); }
  catch { return clientProfileSchema.parse({}); }
}
